import { create } from 'zustand';

/**
 * One store instance shared by every app because they all run inside the
 * same React tree, loaded by the same Vite build. This only works for
 * in-process composition (sub-apps as code, not separate deployments) -
 * see shared-nav/README notes in the shell app for the cross-origin case.
 *
 * convertedLeads used to live here as a stand-in for "a database" before
 * one existed. Now sales-service/service-service have real databases, so
 * that's gone - cross-app data goes through a real fetch, not through
 * this store. What's left here is genuinely frontend-only state: who's
 * logged in, and which app is currently active (for the breadcrumb).
 */
export const useShellStore = create((set) => ({
  currentUser: { id: 'u-1024', name: 'Jordan Lee', role: 'Admin' },
  activeApp: null,

  setActiveApp: (manifest) => set({ activeApp: manifest }),
}));
