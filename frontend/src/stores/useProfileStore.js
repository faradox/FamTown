/**
 * Zustand store for managing profile canvas state
 */

import { create } from 'zustand';

export const useProfileStore = create((set, get) => ({
  items: [],
  isLoading: false,
  error: null,
  selectedItemId: null,
  currentProfileUserId: null, // ID of the profile being viewed

  // Zoom and pan state
  zoom: 1,
  panX: 0,
  panY: 0,

  // Set current profile user ID
  setCurrentProfileUserId: (userId) => set({ currentProfileUserId: userId }),

  // Set all profile items
  setItems: (items) => set({ items }),

  // Add a new item to profile
  addItem: (item) => set((state) => ({
    items: [...state.items, item],
  })),

  // Update an item
  updateItem: (itemId, updatedData) => set((state) => ({
    items: state.items.map((item) =>
      item.id === itemId ? { ...item, ...updatedData } : item
    ),
  })),

  // Remove an item
  removeItem: (itemId) => set((state) => ({
    items: state.items.filter((item) => item.id !== itemId),
  })),

  // Select an item
  selectItem: (itemId) => set({ selectedItemId: itemId }),

  // Deselect item
  deselectItem: () => set({ selectedItemId: null }),

  // Get item by id
  getItem: (itemId) => {
    return get().items.find((item) => item.id === itemId);
  },

  // Get items by object type
  getItemsByObjectType: (objectType) => {
    return get().items.filter((item) => item.objectType === objectType);
  },

  // Update item position
  updateItemPosition: (itemId, x, y) => {
    set((state) => ({
      items: state.items.map((item) =>
        item.id === itemId ? { ...item, x, y } : item
      ),
    }));
  },

  // Update item size
  updateItemSize: (itemId, width, height) => {
    set((state) => ({
      items: state.items.map((item) =>
        item.id === itemId ? { ...item, width, height } : item
      ),
    }));
  },

  // Update item z-index
  updateItemZIndex: (itemId, zIndex) => {
    set((state) => ({
      items: state.items.map((item) =>
        item.id === itemId ? { ...item, zIndex } : item
      ),
    }));
  },

  // Bring item to front
  bringToFront: (itemId) => {
    const maxZIndex = Math.max(...get().items.map((item) => item.zIndex || 0), 0);
    get().updateItemZIndex(itemId, maxZIndex + 1);
  },

  // Handle WebSocket updates
  handleProfileUpdated: (data) => {
    if (data.deleted) {
      get().removeItem(data.deleted);
    } else if (data.id) {
      const existingItem = get().getItem(data.id);
      if (existingItem) {
        get().updateItem(data.id, data);
      } else {
        get().addItem(data);
      }
    }
  },

  // Loading and error states
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),

  // Zoom and pan actions
  setZoom: (zoom) => set({ zoom: Math.max(0.1, Math.min(5, zoom)) }),
  setPan: (panX, panY) => set({ panX, panY }),
  resetView: () => set({ zoom: 1, panX: 0, panY: 0 }),

  // Clear all state (useful when navigating away)
  clearProfile: () => set({
    items: [],
    selectedItemId: null,
    currentProfileUserId: null,
    zoom: 1,
    panX: 0,
    panY: 0,
  }),
}));
