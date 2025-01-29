import { useState, useCallback } from 'react';

export interface OptimisticUpdate<T> {
  id: string | number;
  type: 'create' | 'update' | 'delete';
  data?: T;
  timestamp: number;
}

export interface OptimisticState<T> {
  items: T[];
  pendingUpdates: OptimisticUpdate<T>[];
  lastSync: number;
}

export const useOptimisticUpdates = <T extends { id: string | number }>(
  initialItems: T[] = [],
  onError?: (error: Error) => void
) => {
  const [state, setState] = useState<OptimisticState<T>>({
    items: initialItems,
    pendingUpdates: [],
    lastSync: Date.now(),
  });

  const addPendingUpdate = useCallback((update: OptimisticUpdate<T>) => {
    setState((prev) => ({
      ...prev,
      pendingUpdates: [...prev.pendingUpdates, update],
    }));
  }, []);

  const removePendingUpdate = useCallback((updateId: string | number) => {
    setState((prev) => ({
      ...prev,
      pendingUpdates: prev.pendingUpdates.filter((u) => u.id !== updateId),
    }));
  }, []);

  const optimisticCreate = useCallback((item: T) => {
    setState((prev) => ({
      ...prev,
      items: [...prev.items, item],
    }));
    addPendingUpdate({
      id: item.id,
      type: 'create',
      data: item,
      timestamp: Date.now(),
    });
  }, [addPendingUpdate]);

  const optimisticUpdate = useCallback((id: string | number, updates: Partial<T>) => {
    setState((prev) => ({
      ...prev,
      items: prev.items.map((item) =>
        item.id === id ? { ...item, ...updates } : item
      ),
    }));
    addPendingUpdate({
      id,
      type: 'update',
      data: updates as T,
      timestamp: Date.now(),
    });
  }, [addPendingUpdate]);

  const optimisticDelete = useCallback((id: string | number) => {
    setState((prev) => ({
      ...prev,
      items: prev.items.filter((item) => item.id !== id),
    }));
    addPendingUpdate({
      id,
      type: 'delete',
      timestamp: Date.now(),
    });
  }, [addPendingUpdate]);

  const revertUpdate = useCallback((update: OptimisticUpdate<T>) => {
    setState((prev) => {
      let newItems = [...prev.items];
      
      switch (update.type) {
        case 'create':
          newItems = newItems.filter((item) => item.id !== update.id);
          break;
        case 'update':
          // Find the item in pending updates before this one to get its previous state
          const previousState = prev.pendingUpdates
            .filter((u) => u.id === update.id && u.timestamp < update.timestamp)
            .sort((a, b) => b.timestamp - a.timestamp)[0]?.data;
          
          if (previousState) {
            newItems = newItems.map((item) =>
              item.id === update.id ? { ...item, ...previousState } : item
            );
          }
          break;
        case 'delete':
          if (update.data) {
            newItems.push(update.data);
          }
          break;
      }

      return {
        ...prev,
        items: newItems,
        pendingUpdates: prev.pendingUpdates.filter((u) => u.id !== update.id),
      };
    });
  }, []);

  const handleError = useCallback((error: Error, update: OptimisticUpdate<T>) => {
    revertUpdate(update);
    if (onError) {
      onError(error);
    }
  }, [revertUpdate, onError]);

  const syncWithServer = useCallback((serverItems: T[]) => {
    setState((prev) => {
      // Apply pending updates to server data
      let syncedItems = [...serverItems];
      
      prev.pendingUpdates.forEach((update) => {
        switch (update.type) {
          case 'create':
            if (update.data) {
              syncedItems.push(update.data);
            }
            break;
          case 'update':
            if (update.data) {
              syncedItems = syncedItems.map((item) =>
                item.id === update.id ? { ...item, ...update.data } : item
              );
            }
            break;
          case 'delete':
            syncedItems = syncedItems.filter((item) => item.id !== update.id);
            break;
        }
      });

      return {
        items: syncedItems,
        pendingUpdates: prev.pendingUpdates,
        lastSync: Date.now(),
      };
    });
  }, []);

  return {
    items: state.items,
    pendingUpdates: state.pendingUpdates,
    lastSync: state.lastSync,
    optimisticCreate,
    optimisticUpdate,
    optimisticDelete,
    handleError,
    syncWithServer,
  };
}; 