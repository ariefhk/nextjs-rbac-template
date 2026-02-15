'use client';

import { useEffect, useRef } from 'react';
import { setOnGlobalSessionExpired } from '@/lib/api-client';

/**
 * Registers a global callback for when the api-client gets 401 and refresh fails.
 * Call from AuthProvider (or similar) with clearAuth + redirect. Cleans up on unmount.
 */
export function useRegisterSessionExpired(
  handleSessionExpired: () => void | Promise<void>
): void {
  const handleSessionExpiredRef = useRef(handleSessionExpired);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    setOnGlobalSessionExpired(() => {
      if (!isMountedRef.current) return;
      void handleSessionExpiredRef.current?.();
    });
    return () => {
      isMountedRef.current = false;
      setOnGlobalSessionExpired(undefined);
    };
  }, []);
}
