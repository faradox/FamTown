import { useEffect, useState } from 'react';
import { genaiAPI } from '../services/genaiAPI';

let cachedStatus = null;
let cachedPromise = null;

export const useGenaiStatus = () => {
  const [enabled, setEnabled] = useState(cachedStatus?.enabled ?? false);
  const [isLoading, setIsLoading] = useState(cachedStatus === null);

  useEffect(() => {
    if (cachedStatus !== null) {
      setEnabled(cachedStatus.enabled);
      setIsLoading(false);
      return;
    }

    if (!cachedPromise) {
      cachedPromise = genaiAPI
        .getStatus()
        .then((response) => {
          cachedStatus = { enabled: !!response?.data?.enabled };
          return cachedStatus;
        })
        .catch(() => {
          cachedStatus = { enabled: false };
          return cachedStatus;
        });
    }

    cachedPromise.then((status) => {
      setEnabled(status.enabled);
      setIsLoading(false);
    });
  }, []);

  return { enabled, isLoading };
};

export default useGenaiStatus;
