import type { LicenseDetails } from '@tuish/sdk';
import type { ReactNode } from 'react';

// LicenseGate Props
export interface LicenseGateProps {
  children: ReactNode;
  /** Required feature to access children */
  feature?: string;
  /** Require any valid license (when feature not specified) */
  requireLicense?: boolean;
  /** Rendered when access denied */
  fallback?: ReactNode;
  /** Rendered while checking license */
  loading?: ReactNode;
}

// PurchaseFlow Props
export interface PurchaseFlowProps {
  /** Called when purchase completes successfully */
  onComplete?: (license: LicenseDetails) => void;
  /** Called when user cancels */
  onCancel?: () => void;
  /** Show QR code (default: true, falls back if terminal too narrow) */
  showQrCode?: boolean;
  /** Pre-fill email for checkout */
  email?: string;
  /** Poll interval in ms (default: 2000) */
  pollInterval?: number;
  /** Timeout in ms (default: 600000 = 10 min) */
  timeout?: number;
}

// LicenseStatus Props
export interface LicenseStatusProps {
  /** Show feature list (default: true) */
  showFeatures?: boolean;
  /** Show expiry date (default: true) */
  showExpiry?: boolean;
  /** Compact single-line display */
  compact?: boolean;
}

// TuishLicenseManager Props
export interface TuishLicenseManagerProps {
  /** Called when user exits manager */
  onExit?: () => void;
  /** Allow manual license key entry (default: true) */
  allowManualEntry?: boolean;
  /** Pre-fill email for purchase */
  email?: string;
}
