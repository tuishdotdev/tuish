import type { LicenseDetails } from '@tuish/sdk';
import type { ReactNode } from 'react';

// Context Types
export interface LicenseContextValue {
  license: LicenseDetails | null;
  isValid: boolean;
  isLoading: boolean;
  error: Error | null;
  offlineMode: boolean;
  checkoutInProgress: boolean;
  lastRefresh: number | null;
  hasFeature: (feature: string) => boolean;
  refresh: () => Promise<void>;
  clear: () => void;
  setCheckoutInProgress: (inProgress: boolean) => void;
}

// Provider Props
export interface LicenseProviderProps {
  children: ReactNode;
  productId: string;
  publicKey: string;
  apiBaseUrl?: string;
  debug?: boolean;
  /** Check license on mount (default: true) */
  autoCheck?: boolean;
}

// PurchaseFlow State Machine
export type PurchaseFlowState =
  | { step: 'idle' }
  | { step: 'creating' }
  | { step: 'waiting'; sessionId: string; checkoutUrl: string }
  | { step: 'success'; license: LicenseDetails }
  | { step: 'error'; error: string; retryable: boolean }
  | { step: 'cancelled' };

export type PurchaseFlowAction =
  | { type: 'START' }
  | { type: 'SESSION_CREATED'; sessionId: string; checkoutUrl: string }
  | { type: 'POLL_UPDATE'; status: 'pending' | 'complete' | 'expired' }
  | { type: 'SUCCESS'; license: LicenseDetails }
  | { type: 'ERROR'; error: string; retryable: boolean }
  | { type: 'CANCEL' }
  | { type: 'RETRY' };
