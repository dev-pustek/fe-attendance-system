import { useSyncExternalStore } from 'react';

let currentTime = new Date();
const subscribers = new Set<() => void>();
let globalTimer: NodeJS.Timeout | null = null;

function subscribe(callback: () => void) {
  subscribers.add(callback);
  if (!globalTimer) {
    globalTimer = setInterval(() => {
      currentTime = new Date();
      subscribers.forEach((cb) => cb());
    }, 1000);
  }
  
  return () => {
    subscribers.delete(callback);
    if (subscribers.size === 0 && globalTimer) {
      clearInterval(globalTimer);
      globalTimer = null;
    }
  };
}

function getSnapshot() {
  return currentTime;
}

export function useGlobalTime() {
  return useSyncExternalStore(subscribe, getSnapshot);
}
