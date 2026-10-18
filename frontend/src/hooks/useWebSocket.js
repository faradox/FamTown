/**
 * Custom hook for WebSocket integration
 */

import { useEffect } from 'react';
import { wsService } from '../services/websocket';
import { useObjectsStore } from '../stores/useObjectsStore';
import { useTownsquareStore } from '../stores/useTownsquareStore';
import { useAccountingStore } from '../stores/useAccountingStore';
import { useProfileStore } from '../stores/useProfileStore';
import { useAuth } from '../contexts/AuthContext';

export const useWebSocket = () => {
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isAuthenticated) {
      return undefined;
    }

    // Read stores at event time; subscribing here would re-render the whole app
    const objectsStore = useObjectsStore.getState();
    const townsquareStore = useTownsquareStore.getState();
    const accountingStore = useAccountingStore.getState();

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

    const unsubscribeProfile = wsService.on('profile_updated', ({ userId, data }) => {
      const profileStore = useProfileStore.getState();
      // Only apply to the profile canvas currently on screen
      if (profileStore.currentProfileUserId === userId) {
        profileStore.handleProfileUpdated(data);
      }
    });

    return () => {
      unsubscribeCreated();
      unsubscribeUpdated();
      unsubscribeDeleted();
      unsubscribeTownsquare();
      unsubscribeProfile();
      wsService.disconnect();
    };
  }, [isAuthenticated]);

  return {
    isConnected: wsService.getConnectionStatus(),
  };
};

