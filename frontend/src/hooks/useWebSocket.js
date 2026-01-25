/**
 * Custom hook for WebSocket integration
 */

import { useEffect } from 'react';
import { wsService } from '../services/websocket';
import { useObjectsStore } from '../stores/useObjectsStore';
import { useTownsquareStore } from '../stores/useTownsquareStore';
import { useAccountingStore } from '../stores/useAccountingStore';

export const useWebSocket = () => {
  const objectsStore = useObjectsStore();
  const townsquareStore = useTownsquareStore();
  const accountingStore = useAccountingStore();

  useEffect(() => {
    wsService.connect();

    const unsubscribeCreated = wsService.on('object_created', ({ objectType, data }) => {
      // Handle accounting objects
      if (objectType.startsWith('accounting_')) {
        accountingStore.handleAccountingCreated(objectType, data);
      } else {
        objectsStore.handleObjectCreated(objectType, data);
      }
    });

    const unsubscribeUpdated = wsService.on('object_updated', ({ objectType, data }) => {
      // Handle accounting objects
      if (objectType.startsWith('accounting_')) {
        accountingStore.handleAccountingUpdated(objectType, data);
      } else {
        objectsStore.handleObjectUpdated(objectType, data);
      }
    });

    const unsubscribeDeleted = wsService.on('object_deleted', ({ objectType, objectId }) => {
      // Handle accounting objects
      if (objectType.startsWith('accounting_')) {
        accountingStore.handleAccountingDeleted(objectType, objectId);
      } else {
        objectsStore.handleObjectDeleted(objectType, objectId);
      }
    });

    const unsubscribeTownsquare = wsService.on('townsquare_updated', (data) => {
      townsquareStore.handleTownsquareUpdated(data);
    });

    return () => {
      unsubscribeCreated();
      unsubscribeUpdated();
      unsubscribeDeleted();
      unsubscribeTownsquare();
      wsService.disconnect();
    };
  }, []);

  return {
    isConnected: wsService.getConnectionStatus(),
  };
};

