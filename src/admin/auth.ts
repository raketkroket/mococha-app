import { create } from "zustand";
import { supabase } from "../data/api";
import type { User } from "@supabase/supabase-js";
import type { StaffRole } from "./types";

type AdminAuthState = {
  user: User | null;
  loading: boolean;
  role: StaffRole | null;
  isAdmin: boolean;
  aal2: boolean;
  needsMfaChallenge: boolean;
  init: () => () => void;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
  checkAccess: () => Promise<boolean>;
  verifyMfaChallenge: () => Promise<{ error: string | null }>;
};

export const useAdminAuth = create<AdminAuthState>((set, get) => ({
  user: null,
  loading: true,
  role: null,
  isAdmin: false,
  aal2: false,
  needsMfaChallenge: false,

  init: () => {
    if (!supabase) {
      set({ loading: false });
      return () => {};
    }

    supabase.auth.getSession().then(async ({ data }) => {
      const session = data.session;
      if (session?.user) {
        await get().checkAccess();
      } else {
        set({ user: null, loading: false, role: null, isAdmin: false });
      }
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      (async () => {
        if (session?.user) {
          await get().checkAccess();
        } else {
          set({ user: null, loading: false, role: null, isAdmin: false, aal2: false, needsMfaChallenge: false });
        }
      })();
    });

    return () => sub.subscription.unsubscribe();
  },

  signIn: async (email, password) => {
    if (!supabase) return { error: "Auth not configured." };
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };

    const hasAccess = await get().checkAccess();
    if (!hasAccess) {
      await supabase.auth.signOut();
      return { error: " Dit account heeft geen toegang tot het beheerderspaneel." };
    }

    // Check AAL2 for admin
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    const isAal2 = aal?.currentLevel === "aal2";
    if (!isAal2) {
      set({ needsMfaChallenge: true });
      return { error: null };
    }
    set({ needsMfaChallenge: false });
    return { error: null };
  },

  signOut: async () => {
    if (supabase) await supabase.auth.signOut();
    set({ user: null, role: null, isAdmin: false, loading: false, aal2: false, needsMfaChallenge: false });
  },

  resetPassword: async (email) => {
    if (!supabase) return { error: "Auth not configured." };
    try {
      const redirectTo = typeof window !== "undefined" ? `${window.location.origin}/admin` : undefined;
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL as string}/functions/v1/auth-reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY as string}` },
        body: JSON.stringify({ email, lang: "nl", redirect_to: redirectTo }),
      });
      if (!response.ok) return { error: "Wachtwoordherstel versturen mislukt." };
      return { error: null };
    } catch {
      return { error: "Wachtwoordherstel versturen mislukt." };
    }
  },

  checkAccess: async () => {
    const s = supabase;
    if (!s) {
      set({ loading: false });
      return false;
    }

    const { data: userData } = await s.auth.getUser();
    const user = userData.user;
    if (!user) {
      set({ user: null, loading: false, role: null, isAdmin: false, aal2: false, needsMfaChallenge: false });
      return false;
    }

    const { data: roleData } = await s
      .from("staff_roles")
      .select("role, is_active")
      .eq("user_id", user.id)
      .maybeSingle();

    const { data: profileData } = await s
      .from("profiles")
      .select("is_admin, is_active_staff")
      .eq("id", user.id)
      .maybeSingle();

    const isProfileAdmin = (profileData as { is_admin: boolean } | null)?.is_admin ?? false;
    const isActiveStaff =
      (profileData as { is_active_staff: boolean } | null)?.is_active_staff ?? false;

    const staffRole = roleData as { role: StaffRole; is_active: boolean } | null;
    const hasStaffRole = staffRole?.is_active === true;
    const hasAccess = hasStaffRole || isProfileAdmin;

    const role = hasStaffRole ? staffRole!.role : isProfileAdmin ? "owner" : null;

    if (hasAccess && isActiveStaff === false && !isProfileAdmin) {
      set({
        user: null,
        loading: false,
        role: null,
        isAdmin: false,
        aal2: false,
        needsMfaChallenge: false,
      });
      return false;
    }

    // Check AAL2
    const { data: aal } = await s.auth.mfa.getAuthenticatorAssuranceLevel();
    const isAal2 = aal?.currentLevel === "aal2";
    const needsChallenge = hasAccess && !isAal2 && aal?.nextLevel === "aal2";

    set({
      user,
      loading: false,
      role,
      isAdmin: hasAccess,
      aal2: isAal2,
      needsMfaChallenge: needsChallenge,
    });
    return hasAccess;
  },

  verifyMfaChallenge: async () => {
    if (!supabase) return { error: "Auth not configured." };
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aal?.currentLevel === "aal2") {
      set({ aal2: true, needsMfaChallenge: false });
      return { error: null };
    }
    return { error: "AAL2 verificatie mislukt." };
  },
}));
