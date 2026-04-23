import { create } from "zustand";
import { supabase } from "../lib/supabase";
import { initRevenueCat, logOutRevenueCat } from "../lib/revenuecat";
import { normalizeDisplayName } from "../lib/displayName";
import { useDecksStore } from "./decksStore";
import { useReviewStore } from "./reviewStore";
import type { Profile } from "../types/database";
import type { RealtimeChannel, Session, User } from "@supabase/supabase-js";

let profileChannel: RealtimeChannel | null = null;

interface AuthState {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  setSession: (session: Session | null) => void;
  fetchProfile: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<{ error: string | null }>;
  signUpWithEmail: (email: string, password: string, displayName: string) => Promise<{ error: string | null }>;
  signInWithApple: (identityToken: string, fullName?: string | null) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<{ error: string | null }>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  profile: null,
  loading: true,

  setSession: (session) => {
    set({ session, user: session?.user ?? null, loading: false });

    if (profileChannel) {
      void supabase.removeChannel(profileChannel);
      profileChannel = null;
    }

    if (session?.user) {
      get().fetchProfile();
      initRevenueCat(session.user.id);

      profileChannel = supabase
        .channel(`profile-${session.user.id}`)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "profiles",
            filter: `id=eq.${session.user.id}`,
          },
          (payload) => {
            const updatedProfile = payload.new as Profile;
            set((state) => ({
              profile: state.profile ? { ...state.profile, ...updatedProfile } : updatedProfile,
            }));
          }
        )
        .subscribe();
    } else {
      set({ profile: null });
    }
  },

  fetchProfile: async () => {
    const user = get().user;
    if (!user) return;

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (error) {
      return;
    }

    if (data) {
      set({ profile: data as Profile });
      return;
    }

    const fallbackDisplayName = normalizeDisplayName(
      (user.user_metadata?.display_name as string | undefined) ??
      (user.user_metadata?.full_name as string | undefined) ??
      user.email?.split("@")[0] ??
      null
    );

    const { data: created, error: createError } = await supabase
      .from("profiles")
      .insert({
        id: user.id,
        display_name: fallbackDisplayName,
      })
      .select("*")
      .single();

    if (!createError && created) {
      set({ profile: created as Profile });
    }
  },

  updateProfile: async (updates) => {
    const user = get().user;
    if (!user) return;

    const normalizedUpdates: Partial<Profile> = { ...updates };
    if ("display_name" in normalizedUpdates) {
      normalizedUpdates.display_name = normalizeDisplayName(normalizedUpdates.display_name);
    }

    const { error } = await supabase
      .from("profiles")
      .update(normalizedUpdates)
      .eq("id", user.id);

    if (!error) {
      set((state) => ({
        profile: state.profile ? { ...state.profile, ...normalizedUpdates } : null,
      }));
    }
  },

  signInWithEmail: async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  },

  signUpWithEmail: async (email, password, displayName) => {
    const normalizedDisplayName = normalizeDisplayName(displayName);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: normalizedDisplayName } },
    });
    return { error: error?.message ?? null };
  },

  signInWithApple: async (identityToken, fullName) => {
    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: "apple",
      token: identityToken,
    });

    // Update display_name on first sign-in (Apple only sends it once)
    if (!error && data.user && fullName) {
      await supabase
        .from("profiles")
        .update({ display_name: normalizeDisplayName(fullName) })
        .eq("id", data.user.id);
    }

    return { error: error?.message ?? null };
  },

  signOut: async () => {
    if (profileChannel) {
      await supabase.removeChannel(profileChannel);
      profileChannel = null;
    }

    await logOutRevenueCat();
    await supabase.auth.signOut();
    set({ session: null, user: null, profile: null });
    useDecksStore.getState().reset();
    useReviewStore.getState().reset();
  },

  deleteAccount: async () => {
    const { error } = await supabase.functions.invoke("delete-account");
    if (error) return { error: error.message };

    if (profileChannel) {
      await supabase.removeChannel(profileChannel);
      profileChannel = null;
    }

    await logOutRevenueCat();
    await supabase.auth.signOut();
    set({ session: null, user: null, profile: null });
    useDecksStore.getState().reset();
    useReviewStore.getState().reset();
    return { error: null };
  },
}));
