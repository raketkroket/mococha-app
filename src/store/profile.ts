import { create } from "zustand";
import { supabase } from "../data/api";
import { useAuth } from "./auth";
import { setStored } from "../lib/adapters/storage";

export interface ProfileData {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  avatar_path: string | null;
  avatar_url: string | null;
  preferred_language: string;
  preferred_theme: string;
  notification_preferences: {
    push: boolean; email: boolean; marketing: boolean;
    concept_updates: boolean; payment_updates: boolean; event_reminders: boolean;
  };
  email_verified: boolean;
  is_admin: boolean;
  marketing_opt_in: boolean;
  prefers_reduced_motion: boolean;
  created_at: string;
}

type EditableProfileData = Pick<ProfileData,
  "full_name" | "phone" | "avatar_path" | "preferred_language" | "preferred_theme" |
  "notification_preferences" | "marketing_opt_in" | "prefers_reduced_motion"
>;

type ProfileState = {
  profile: ProfileData | null;
  loading: boolean;
  error: string | null;
  avatarUploading: boolean;
  avatarUploadProgress: number;

  load: () => Promise<void>;
  update: (patch: Partial<EditableProfileData>) => Promise<{ error: string | null }>;
  uploadAvatar: (file: Blob, ext: string) => Promise<{ error: string | null }>;
  removeAvatar: () => Promise<{ error: string | null }>;
  getAvatarUrl: () => Promise<string | null>;
  clear: () => void;
};

export const useProfile = create<ProfileState>((set, get) => ({
  profile: null,
  loading: false,
  error: null,
  avatarUploading: false,
  avatarUploadProgress: 0,

  load: async () => {
    const user = useAuth.getState().user;
    if (!supabase || !user) { set({ profile: null }); return; }
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (error) { set({ loading: false, error: error.message }); return; }

      if (data) {
        const profile = data as ProfileData;
        // Sync theme preference locally for fast startup
        if (profile.preferred_theme) setStored("mococha-theme", profile.preferred_theme);
        // Load avatar URL if path exists
        if (profile.avatar_path) {
          const { data: urlData } = await supabase.storage
            .from("profile-avatars")
            .createSignedUrl(profile.avatar_path, 3600);
          profile.avatar_url = urlData?.signedUrl ?? null;
        }
        set({ profile, loading: false });
      } else {
        // Create profile if missing
        const newProfile = {
          id: user.id,
          email: user.email ?? "",
          full_name: "",
          phone: "",
        };
        const { data: created } = await supabase
          .from("profiles")
          .insert(newProfile)
          .select("*")
          .maybeSingle();
        set({ profile: (created as ProfileData) ?? null, loading: false });
      }
    } catch (e) {
      set({ loading: false, error: e instanceof Error ? e.message : "Onbekende fout" });
    }
  },

  update: async (patch) => {
    const user = useAuth.getState().user;
    if (!supabase || !user) return { error: "Niet ingelogd" };
    try {
      const { error } = await supabase
        .from("profiles")
        .update(patch)
        .eq("id", user.id);
      if (error) return { error: error.message };
      set((s) => ({ profile: s.profile ? { ...s.profile, ...patch } : null }));
      return { error: null };
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Onbekende fout" };
    }
  },

  uploadAvatar: async (blob, ext) => {
    const user = useAuth.getState().user;
    if (!supabase || !user) return { error: "Niet ingelogd" };
    set({ avatarUploading: true, avatarUploadProgress: 0, error: null });
    try {
      const oldPath = get().profile?.avatar_path;
      const filePath = `${user.id}/avatar.${ext}`;

      set({ avatarUploadProgress: 30 });

      const { error: upErr } = await supabase.storage
        .from("profile-avatars")
        .upload(filePath, blob, { contentType: `image/${ext}`, upsert: true });

      if (upErr) { set({ avatarUploading: false }); return { error: upErr.message }; }

      set({ avatarUploadProgress: 70 });

      // Delete old avatar if different path
      if (oldPath && oldPath !== filePath) {
        await supabase.storage.from("profile-avatars").remove([oldPath]);
      }

      // Update profile
      const { error: pErr } = await supabase
        .from("profiles")
        .update({ avatar_path: filePath })
        .eq("id", user.id);

      if (pErr) { set({ avatarUploading: false }); return { error: pErr.message }; }

      // Get signed URL
      const { data: urlData } = await supabase.storage
        .from("profile-avatars")
        .createSignedUrl(filePath, 3600);

      set({ avatarUploading: false, avatarUploadProgress: 100 });
      set((s) => ({
        profile: s.profile
          ? { ...s.profile, avatar_path: filePath, avatar_url: urlData?.signedUrl ?? null }
          : null,
      }));
      return { error: null };
    } catch (e) {
      set({ avatarUploading: false });
      return { error: e instanceof Error ? e.message : "Upload mislukt" };
    }
  },

  removeAvatar: async () => {
    const user = useAuth.getState().user;
    if (!supabase || !user) return { error: "Niet ingelogd" };
    const path = get().profile?.avatar_path;
    if (path) {
      await supabase.storage.from("profile-avatars").remove([path]);
    }
    const { error } = await supabase
      .from("profiles")
      .update({ avatar_path: null })
      .eq("id", user.id);
    if (error) return { error: error.message };
    set((s) => ({
      profile: s.profile ? { ...s.profile, avatar_path: null, avatar_url: null } : null,
    }));
    return { error: null };
  },

  getAvatarUrl: async () => {
    const profile = get().profile;
    if (!profile?.avatar_path || !supabase) return null;
    const { data } = await supabase.storage
      .from("profile-avatars")
      .createSignedUrl(profile.avatar_path, 3600);
    return data?.signedUrl ?? null;
  },

  clear: () => set({ profile: null, loading: false, error: null }),
}));
