/**
 * Zustand store for managing view-specific configurations (background colors, etc.)
 */

import { create } from 'zustand';
import { viewConfigAPI } from '../services/viewConfigAPI';

const DEFAULT_BACKGROUND = '#111827'; // Tailwind gray-900 hex

// Helpers to convert server list into local state buckets
const listToState = (rows) => {
  const configs = {};
  const ownership = {};
  for (const row of rows) {
    configs[row.viewName] = row.config || {};
    ownership[row.viewName] = !!row.isOwner;
  }
  return { configs, ownership };
};

export const useViewConfigStore = create((set, get) => ({
  viewConfigs: {},
  ownership: {},
  isLoaded: false,

  // Load all view configs from API
  loadAll: async () => {
    const res = await viewConfigAPI.list();
    const { configs, ownership } = listToState(res.data);
    set({ viewConfigs: configs, ownership, isLoaded: true });
  },

  // Get a computed background style for a specific view
  getBackgroundStyle: (viewName) => {
    const cfg = get().viewConfigs[viewName] || {};
    const type = cfg.backgroundType || 'color';
    if (type === 'image' && cfg.backgroundPath) {
      return {
        backgroundColor: '#000000',
        backgroundImage: `url(${viewConfigAPI.getUploadUrl(cfg.backgroundPath)})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      };
    }
    const color = cfg.backgroundColor || DEFAULT_BACKGROUND;
    return { backgroundColor: color };
  },

  // Check whether the current user has an explicit override for a view
  hasUserOverride: (viewName) => !!get().ownership[viewName],

  // Set background color for a specific view and persist to API
  setBackgroundColor: async (viewName, color) => {
    const cfg = { ...(get().viewConfigs[viewName] || {}), backgroundType: 'color', backgroundColor: color };
    await viewConfigAPI.upsert(viewName, cfg);
    set((state) => ({
      viewConfigs: { ...state.viewConfigs, [viewName]: cfg },
      ownership: { ...state.ownership, [viewName]: true },
    }));
  },

  // Upload a background image and persist config
  uploadBackgroundImage: async (viewName, file) => {
    const res = await viewConfigAPI.uploadBackground(viewName, file);
    const cfg = { ...(get().viewConfigs[viewName] || {}), backgroundType: 'image', backgroundPath: res.data.path };
    set((state) => ({
      viewConfigs: { ...state.viewConfigs, [viewName]: cfg },
      ownership: { ...state.ownership, [viewName]: true },
    }));
  },

  // Remove the user's override and fall back to the shared config if available
  resetViewConfig: async (viewName) => {
    const res = await viewConfigAPI.remove(viewName);
    const next = res.data;
    if (next) {
      set((state) => ({
        viewConfigs: { ...state.viewConfigs, [viewName]: next.config || {} },
        ownership: { ...state.ownership, [viewName]: !!next.isOwner },
      }));
      return;
    }

    set((state) => {
      const nextConfigs = { ...state.viewConfigs };
      const nextOwnership = { ...state.ownership };
      delete nextConfigs[viewName];
      delete nextOwnership[viewName];
      return { viewConfigs: nextConfigs, ownership: nextOwnership };
    });
  },
}));
