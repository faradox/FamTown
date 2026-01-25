/**
 * Zustand store for managing accounting data (categories, entries, templates)
 */

import { create } from 'zustand';

export const useAccountingStore = create((set, get) => ({
  // Categories (global, shared)
  categories: [],
  categoriesLoading: false,

  // Entries (current view)
  entries: [],
  entriesLoading: false,
  entriesPagination: {
    total: 0,
    page: 1,
    pageSize: 50,
    totalPages: 1,
  },

  // Dashboard summary
  summary: null,
  summaryLoading: false,

  // Templates (shared)
  templates: [],
  templatesLoading: false,

  // Categories
  setCategories: (categories) => set({ categories }),
  setCategoriesLoading: (loading) => set({ categoriesLoading: loading }),

  addCategory: (category) => set((state) => {
    const exists = state.categories.some(c => c.id === category.id);
    if (exists) return state;
    return { categories: [...state.categories, category] };
  }),

  updateCategory: (categoryId, updatedCategory) => set((state) => ({
    categories: state.categories.map((cat) =>
      cat.id === categoryId ? { ...cat, ...updatedCategory } : cat
    ),
  })),

  deleteCategory: (categoryId) => set((state) => ({
    categories: state.categories.filter((cat) => cat.id !== categoryId),
  })),

  // Get categories by type
  getCategoriesByType: (type) => {
    const state = get();
    return state.categories.filter(c => c.type === type);
  },

  // Get hierarchical categories (parent with children nested)
  // If type is not provided, returns all categories
  getHierarchicalCategories: (type) => {
    const state = get();
    const filtered = type
      ? state.categories.filter(c => c.type === type)
      : state.categories;
    const parents = filtered.filter(c => !c.parentId);
    return parents.map(parent => ({
      ...parent,
      children: filtered.filter(c => c.parentId === parent.id)
        .sort((a, b) => a.sortOrder - b.sortOrder),
    })).sort((a, b) => a.sortOrder - b.sortOrder);
  },

  // Entries
  setEntries: (entries) => set({ entries }),
  setEntriesLoading: (loading) => set({ entriesLoading: loading }),
  setEntriesPagination: (pagination) => set({ entriesPagination: pagination }),

  addEntry: (entry) => set((state) => {
    const exists = state.entries.some(e => e.id === entry.id);
    if (exists) return state;
    // Add to beginning since entries are typically sorted by date desc
    return { entries: [entry, ...state.entries] };
  }),

  updateEntry: (entryId, updatedEntry) => set((state) => ({
    entries: state.entries.map((entry) =>
      entry.id === entryId ? { ...entry, ...updatedEntry } : entry
    ),
  })),

  deleteEntry: (entryId) => set((state) => ({
    entries: state.entries.filter((entry) => entry.id !== entryId),
  })),

  // Summary
  setSummary: (summary) => set({ summary }),
  setSummaryLoading: (loading) => set({ summaryLoading: loading }),

  // Templates
  setTemplates: (templates) => set({ templates }),
  setTemplatesLoading: (loading) => set({ templatesLoading: loading }),

  addTemplate: (template) => set((state) => {
    const exists = state.templates.some(t => t.id === template.id);
    if (exists) return state;
    return { templates: [...state.templates, template] };
  }),

  updateTemplate: (templateId, updatedTemplate) => set((state) => ({
    templates: state.templates.map((tmpl) =>
      tmpl.id === templateId ? { ...tmpl, ...updatedTemplate } : tmpl
    ),
  })),

  deleteTemplate: (templateId) => set((state) => ({
    templates: state.templates.filter((tmpl) => tmpl.id !== templateId),
  })),

  // Handle WebSocket updates for accounting objects
  handleAccountingCreated: (objectType, data) => {
    const typeName = objectType.replace('accounting_', '');
    const methodName = `add${typeName.charAt(0).toUpperCase() + typeName.slice(1)}`;
    get()[methodName]?.(data);
  },

  handleAccountingUpdated: (objectType, data) => {
    const typeName = objectType.replace('accounting_', '');
    const methodName = `update${typeName.charAt(0).toUpperCase() + typeName.slice(1)}`;
    get()[methodName]?.(data.id, data);
  },

  handleAccountingDeleted: (objectType, objectId) => {
    const typeName = objectType.replace('accounting_', '');
    const methodName = `delete${typeName.charAt(0).toUpperCase() + typeName.slice(1)}`;
    get()[methodName]?.(objectId);
  },

  // Helper to find category by id
  getCategoryById: (categoryId) => {
    const state = get();
    return state.categories.find(c => c.id === categoryId);
  },

  // Helper to get template by id
  getTemplateById: (templateId) => {
    const state = get();
    return state.templates.find(t => t.id === templateId);
  },
}));
