/**
 * Zustand store for managing all objects (events, pictures, files, texts)
 */

import { create } from 'zustand';

export const useObjectsStore = create((set, get) => ({
  events: [],
  pictures: [],
  files: [],
  texts: [],
  
  isLoading: false,
  error: null,

  // Loading state tracking: { 'picture-uuid': 'loading'|'loaded'|'error' }
  loadingStates: {},
  
  // Cached content: { 'picture-uuid': 'blob:...' or data URL }
  cachedContent: {},

  // Set events
  setEvents: (events) => set({ events }),

  // Set pictures
  setPictures: (pictures) => set({ pictures }),

  // Set files
  setFiles: (files) => set({ files }),

  // Set texts
  setTexts: (texts) => set({ texts }),

  // Add a new event
  addEvent: (event) => set((state) => {
    // Check if event already exists to prevent duplicates
    const exists = state.events.some(e => e.id === event.id);
    if (exists) return state;
    return { events: [...state.events, event] };
  }),

  // Update an event
  updateEvent: (eventId, updatedEvent) => set((state) => ({
    events: state.events.map((event) =>
      event.id === eventId ? { ...event, ...updatedEvent } : event
    ),
  })),

  // Delete an event
  deleteEvent: (eventId) => set((state) => ({
    events: state.events.filter((event) => event.id !== eventId),
  })),

  // Add a new picture
  addPicture: (picture) => set((state) => {
    // Check if picture already exists to prevent duplicates
    const exists = state.pictures.some(p => p.id === picture.id);
    if (exists) return state;
    return { pictures: [...state.pictures, picture] };
  }),

  // Update a picture
  updatePicture: (pictureId, updatedPicture) => set((state) => ({
    pictures: state.pictures.map((picture) =>
      picture.id === pictureId ? { ...picture, ...updatedPicture } : picture
    ),
  })),

  // Delete a picture
  deletePicture: (pictureId) => {
    get().removeCachedContent('picture', pictureId);
    set((state) => ({
      pictures: state.pictures.filter((picture) => picture.id !== pictureId),
    }));
  },

  // Add a new file
  addFile: (file) => set((state) => {
    // Check if file already exists to prevent duplicates
    const exists = state.files.some(f => f.id === file.id);
    if (exists) return state;
    return { files: [...state.files, file] };
  }),

  // Update a file
  updateFile: (fileId, updatedFile) => set((state) => ({
    files: state.files.map((file) =>
      file.id === fileId ? { ...file, ...updatedFile } : file
    ),
  })),

  // Delete a file
  deleteFile: (fileId) => set((state) => ({
    files: state.files.filter((file) => file.id !== fileId),
  })),

  // Add a new text
  addText: (text) => set((state) => {
    // Check if text already exists to prevent duplicates
    const exists = state.texts.some(t => t.id === text.id);
    if (exists) return state;
    return { texts: [...state.texts, text] };
  }),

  // Update a text
  updateText: (textId, updatedText) => set((state) => ({
    texts: state.texts.map((text) =>
      text.id === textId ? { ...text, ...updatedText } : text
    ),
  })),

  // Delete a text
  deleteText: (textId) => set((state) => ({
    texts: state.texts.filter((text) => text.id !== textId),
  })),

  // Get object by type and id
  getObject: (objectType, objectId) => {
    const state = get();
    const collection = state[`${objectType}s`] || [];
    return collection.find((obj) => obj.id === objectId);
  },

  // Handle WebSocket updates
  handleObjectCreated: (objectType, data) => {
    const addMethod = `add${objectType.charAt(0).toUpperCase() + objectType.slice(1)}`;
    get()[addMethod]?.(data);
  },

  handleObjectUpdated: (objectType, data) => {
    const updateMethod = `update${objectType.charAt(0).toUpperCase() + objectType.slice(1)}`;
    get()[updateMethod]?.(data.id, data);
  },

  handleObjectDeleted: (objectType, objectId) => {
    const deleteMethod = `delete${objectType.charAt(0).toUpperCase() + objectType.slice(1)}`;
    get()[deleteMethod]?.(objectId);
  },

  // Loading state management
  setObjectLoadingState: (objectType, objectId, state) => set((store) => ({
    loadingStates: {
      ...store.loadingStates,
      [`${objectType}-${objectId}`]: state,
    },
  })),

  getObjectLoadingState: (objectType, objectId) => {
    const state = get();
    return state.loadingStates[`${objectType}-${objectId}`];
  },

  clearLoadingStates: () => set({ loadingStates: {} }),

  // Cached content management
  setCachedContent: (objectType, objectId, content) => set((store) => ({
    cachedContent: {
      ...store.cachedContent,
      [`${objectType}-${objectId}`]: content,
    },
  })),

  getCachedContent: (objectType, objectId) => {
    const state = get();
    return state.cachedContent[`${objectType}-${objectId}`];
  },

  removeCachedContent: (objectType, objectId) => set((store) => {
    const key = `${objectType}-${objectId}`;
    const newCache = { ...store.cachedContent };
    
    // Revoke blob URL if it exists to free memory
    if (newCache[key] && newCache[key].startsWith('blob:')) {
      URL.revokeObjectURL(newCache[key]);
    }
    
    delete newCache[key];
    
    const newLoadingStates = { ...store.loadingStates };
    delete newLoadingStates[key];
    
    return {
      cachedContent: newCache,
      loadingStates: newLoadingStates,
    };
  }),
}));

