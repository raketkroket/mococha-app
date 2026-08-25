import { create } from "zustand";
import { supabase, isSupabaseConfigured } from "../data/api";
import type { Session, User } from "@supabase/supabase-js";

type AuthState = {
  user: User | null; session: Session | null; loading: boolean;
  init: () => () => void;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string) => Promise<{ error: string | null; needsConfirmation?: boolean }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
};

export const useAuth = create<AuthState>((set) => ({
  user: null, session: null, loading: true,
  init: () => {
    if (!supabase) { set({ loading: false }); return () => {}; }
    supabase.auth.getSession().then(({ data }) => set({ session: data.session, user: data.session?.user ?? null, loading: false }));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => set({ session, user: session?.user ?? null, loading: false }));
    return () => sub.subscription.unsubscribe();
  },
  signIn: async (email, password) => {
    if (!supabase) return { error: isSupabaseConfigured ? "Auth not configured." : "Supabase environment variables are missing. Please contact support." };
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  },
  signUp: async (email, password) => {
    if (!supabase) return { error: isSupabaseConfigured ? "Auth not configured." : "Supabase environment variables are missing. Please contact support." };
    const redirectTo = typeof window !== "undefined" ? `${window.location.origin}/account` : undefined;
    const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: redirectTo } });
    if (error) return { error: error.message };
    const needsConfirmation = !data.session && !data.user?.email_confirmed_at;
    return { error: null, needsConfirmation };
  },
  signOut: async () => { if (supabase) await supabase.auth.signOut(); set({ user: null, session: null }); },
  resetPassword: async (email) => {
    if (!supabase) return { error: isSupabaseConfigured ? "Auth not configured." : "Supabase environment variables are missing. Please contact support." };
    const redirectTo = typeof window !== "undefined" ? `${window.location.origin}/account/inloggen` : undefined;
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    return { error: error?.message ?? null };
  },
}));
