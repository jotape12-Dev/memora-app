import { create } from "zustand";
import { supabase } from "../lib/supabase";
import type { Folder } from "../types/database";

interface FoldersState {
  folders: Folder[];
  loading: boolean;
  fetchFolders: () => Promise<void>;
  createFolder: (
    name: string,
    parentFolderId: string | null,
    color: string,
    icon: string
  ) => Promise<Folder | null>;
  updateFolder: (id: string, updates: Partial<Folder>) => Promise<void>;
  deleteFolder: (id: string) => Promise<{ error?: string }>;
  moveFolder: (id: string, newParentId: string | null) => Promise<{ error?: string }>;
  reset: () => void;
}

export const useFoldersStore = create<FoldersState>((set, get) => ({
  folders: [],
  loading: false,

  fetchFolders: async () => {
    set({ loading: true });
    const { data, error } = await supabase
      .from("folders")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      set({ folders: data as Folder[] });
    }
    set({ loading: false });
  },

  createFolder: async (name, parentFolderId, color, icon) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from("folders")
      .insert({
        user_id: user.id,
        parent_folder_id: parentFolderId,
        name,
        color,
        icon,
      })
      .select()
      .single();

    if (!error && data) {
      const folder = data as Folder;
      set((state) => ({ folders: [folder, ...state.folders] }));
      return folder;
    }
    return null;
  },

  updateFolder: async (id, updates) => {
    const { error } = await supabase.from("folders").update(updates).eq("id", id);
    if (!error) {
      set((state) => ({
        folders: state.folders.map((f) => (f.id === id ? { ...f, ...updates } : f)),
      }));
    }
  },

  deleteFolder: async (id) => {
    const { error } = await supabase.from("folders").delete().eq("id", id);
    if (error) return { error: error.message };
    set((state) => ({
      folders: state.folders.filter((f) => f.id !== id && f.parent_folder_id !== id),
    }));
    return {};
  },

  moveFolder: async (id, newParentId) => {
    // Block moving a folder into itself or into one of its descendants
    if (newParentId === id) return { error: "invalid_target" };

    const folders = get().folders;
    const target = folders.find((f) => f.id === id);
    if (!target) return { error: "not_found" };

    // Depth check: a folder with children cannot become a sub-folder
    const hasChildren = folders.some((f) => f.parent_folder_id === id);
    if (hasChildren && newParentId !== null) {
      return { error: "depth_limit" };
    }

    // Target parent must be at root level (parent_folder_id === null) to satisfy max depth
    if (newParentId !== null) {
      const newParent = folders.find((f) => f.id === newParentId);
      if (!newParent) return { error: "not_found" };
      if (newParent.parent_folder_id !== null) return { error: "depth_limit" };
    }

    const { error } = await supabase
      .from("folders")
      .update({ parent_folder_id: newParentId })
      .eq("id", id);

    if (error) return { error: error.message };

    set((state) => ({
      folders: state.folders.map((f) =>
        f.id === id ? { ...f, parent_folder_id: newParentId } : f
      ),
    }));
    return {};
  },

  reset: () => set({ folders: [], loading: false }),
}));
