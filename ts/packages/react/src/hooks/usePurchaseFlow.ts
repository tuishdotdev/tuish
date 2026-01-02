import { useCallback, useEffect, useReducer, useRef } from 'react';
import type { LicenseDetails } from '@tuish/sdk';
import type { PurchaseFlowState, PurchaseFlowAction } from '../types.js';
import { useLicense } from './useLicense.js';
import { useTuishSdk } from './useTuishSdk.js';

function purchaseFlowReducer(
  state: PurchaseFlowState,
  action: PurchaseFlowAction
): PurchaseFlowState {
  switch (action.type) {
    case 'START':
      if (state.step === 'idle' || state.step === 'cancelled' || (state.step === 'error' && state.retryable)) {
        return { step: 'creating' };
      }
      return state;

    case 'SESSION_CREATED':
      if (state.step === 'creating') {
        return {
          step: 'waiting',
          sessionId: action.sessionId,
          checkoutUrl: action.checkoutUrl,
        };
      }
      return state;

    case 'SUCCESS':
      if (state.step === 'waiting') {
        return { step: 'success', license: action.license };
      }
      return state;

    case 'ERROR':
      return { step: 'error', error: action.error, retryable: action.retryable };

    case 'CANCEL':
      if (state.step === 'waiting' || state.step === 'creating') {
        return { step: 'cancelled' };
      }
      return state;

    case 'RETRY':
      if ((state.step === 'error' && state.retryable) || state.step === 'cancelled') {
        return { step: 'idle' };
      }
      return state;

    default:
      return state;
  }
}

export interface UsePurchaseFlowOptions {
  /** Pre-fill email for checkout */
  email?: string;
  /** Poll interval in ms (default: 2000) */
  pollInterval?: number;
  /** Timeout in ms (default: 600000 = 10 min) */
  timeout?: number;
  /** Called when purchase completes successfully */
  onComplete?: (license: LicenseDetails) => void;
  /** Called when user cancels */
  onCancel?: () => void;
}

export interface UsePurchaseFlowReturn {
  state: PurchaseFlowState;
  start: () => Promise<void>;
  cancel: () => void;
  retry: () => void;
}

/**
 * Hook to manage the purchase flow state machine.
 *
 * @example
 * ```tsx
 * const { state, start, cancel, retry } = usePurchaseFlow({
 *   onComplete: (license) => console.log('Purchased!', license),
 * });
 *
 * if (state.step === 'idle') {
 *   return <Button onPress={start}>Purchase</Button>;
 * }
 * ```
 */
export function usePurchaseFlow(options: UsePurchaseFlowOptions = {}): UsePurchaseFlowReturn {
  const {
    email,
    pollInterval = 2000,
    timeout = 600000,
    onComplete,
    onCancel,
  } = options;

  const [state, dispatch] = useReducer(purchaseFlowReducer, { step: 'idle' });
  const { setCheckoutInProgress, checkoutInProgress, refresh } = useLicense();
  const sdk = useTuishSdk();

  // Track if we're mounted to avoid state updates after unmount
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Track polling abort controller
  const abortControllerRef = useRef<AbortController | null>(null);

  const start = useCallback(async () => {
    if (checkoutInProgress) {
      return; // Prevent concurrent checkouts
    }

    dispatch({ type: 'START' });
    setCheckoutInProgress(true);

    try {
      // Create checkout session
      const session = await sdk.purchaseInBrowser({ email, openBrowser: true });

      if (!mountedRef.current) return;

      dispatch({
        type: 'SESSION_CREATED',
        sessionId: session.sessionId,
        checkoutUrl: session.checkoutUrl,
      });

      // Start polling
      abortControllerRef.current = new AbortController();

      const result = await sdk.waitForCheckoutComplete(session.sessionId, {
        pollIntervalMs: pollInterval,
        timeoutMs: timeout,
        onPoll: (_status) => {
          if (!mountedRef.current) return;
          // Could dispatch POLL_UPDATE here for UI feedback
        },
      });

      if (!mountedRef.current) return;

      if (result.valid && result.license) {
        dispatch({ type: 'SUCCESS', license: result.license });
        await refresh();
        onComplete?.(result.license);
      } else {
        const errorMessage = result.reason === 'expired'
          ? 'Checkout session expired. Please try again.'
          : 'Checkout failed. Please try again.';
        dispatch({
          type: 'ERROR',
          error: errorMessage,
          retryable: true,
        });
      }
    } catch (err) {
      if (!mountedRef.current) return;

      const error = err instanceof Error ? err.message : String(err);
      const retryable = !error.includes('Invalid product') && !error.includes('401');

      dispatch({ type: 'ERROR', error, retryable });
    } finally {
      if (mountedRef.current) {
        setCheckoutInProgress(false);
      }
    }
  }, [sdk, email, pollInterval, timeout, checkoutInProgress, setCheckoutInProgress, refresh, onComplete]);

  const cancel = useCallback(() => {
    abortControllerRef.current?.abort();
    dispatch({ type: 'CANCEL' });
    setCheckoutInProgress(false);
    onCancel?.();
  }, [setCheckoutInProgress, onCancel]);

  const retry = useCallback(() => {
    dispatch({ type: 'RETRY' });
  }, []);

  return { state, start, cancel, retry };
}
