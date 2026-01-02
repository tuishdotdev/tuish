import { Tuish } from '@tuish/sdk';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { LicenseDetails } from '@tuish/sdk';
import type { LicenseProviderProps } from '../types.js';
import { LicenseContext } from './LicenseContext.js';
import { TuishSdkContext } from './TuishSdkContext.js';

export function LicenseProvider({
  children,
  productId,
  publicKey,
  apiBaseUrl,
  debug = false,
  autoCheck = true,
}: LicenseProviderProps) {
  const [license, setLicense] = useState<LicenseDetails | null>(null);
  const [isLoading, setIsLoading] = useState(autoCheck);
  const [error, setError] = useState<Error | null>(null);
  const [offlineMode, setOfflineMode] = useState(false);
  const [checkoutInProgress, setCheckoutInProgress] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<number | null>(null);

  // Create SDK instance once
  const sdk = useMemo(
    () =>
      new Tuish({
        productId,
        publicKey,
        apiBaseUrl,
        debug,
      }),
    [productId, publicKey, apiBaseUrl, debug]
  );

  // Store SDK in ref for access in callbacks without triggering re-renders
  const sdkRef = useRef(sdk);
  sdkRef.current = sdk;

  const checkLicense = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await sdkRef.current.checkLicense();
      setOfflineMode(result.offlineVerified);
      if (result.valid && result.license) {
        setLicense(result.license);
      } else {
        setLicense(null);
      }
      setLastRefresh(Date.now());
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      setLicense(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    await checkLicense();
  }, [checkLicense]);

  const clear = useCallback(() => {
    sdkRef.current.clearLicense();
    setLicense(null);
    setLastRefresh(null);
    setOfflineMode(false);
  }, []);

  const hasFeature = useCallback(
    (feature: string): boolean => {
      if (!license) return false;
      return license.features.includes(feature);
    },
    [license]
  );

  // Auto-check license on mount
  useEffect(() => {
    if (autoCheck) {
      checkLicense();
    }
  }, [autoCheck, checkLicense]);

  const isValid = license !== null && license.status === 'active';

  const contextValue = useMemo(
    () => ({
      license,
      isValid,
      isLoading,
      error,
      offlineMode,
      checkoutInProgress,
      lastRefresh,
      hasFeature,
      refresh,
      clear,
      setCheckoutInProgress,
    }),
    [
      license,
      isValid,
      isLoading,
      error,
      offlineMode,
      checkoutInProgress,
      lastRefresh,
      hasFeature,
      refresh,
      clear,
    ]
  );

  return (
    <TuishSdkContext.Provider value={sdk}>
      <LicenseContext.Provider value={contextValue}>
        {children}
      </LicenseContext.Provider>
    </TuishSdkContext.Provider>
  );
}
