const listeners = new Map();

/**
 * Minimal pub/sub so unrelated apps can talk without importing each other.
 * Swap the body of emit/on for window.postMessage (or a WebSocket) and every
 * app that uses this contract keeps working across real process/iframe
 * boundaries, which is the point: apps depend on the *event contract*,
 * never on each other's modules.
 */
export const eventBus = {
  on(eventName, handler) {
    if (!listeners.has(eventName)) listeners.set(eventName, new Set());
    listeners.get(eventName).add(handler);
    return () => listeners.get(eventName)?.delete(handler);
  },
  emit(eventName, payload) {
    listeners.get(eventName)?.forEach((handler) => handler(payload));
  },
};
