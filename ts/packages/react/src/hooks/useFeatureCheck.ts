import { useMemo } from 'react';
import { useLicense } from './useLicense.js';

/**
 * Hook to check if a specific feature is available.
 * Memoizes the result for performance.
 *
 * @example
 * ```tsx
 * const hasPro = useFeatureCheck('pro');
 * const hasAdvanced = useFeatureCheck('advanced');
 * ```
 */
export function useFeatureCheck(feature: string): boolean {
  const { license } = useLicense();

  return useMemo(() => {
    if (!license) return false;
    return license.features.includes(feature);
  }, [license, feature]);
}
