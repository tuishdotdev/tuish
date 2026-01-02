// Ink-specific Components
export {
  LicenseStatus,
  LicenseGate,
  QrCode,
  PurchaseFlow,
  TuishLicenseManager,
} from './components/index.js';

// Utilities (for advanced use)
export {
  getTerminalWidth,
  canFitQrCode,
  generateQrMatrix,
  renderQrAsUnicode,
  getQrModuleCount,
} from './utils/index.js';

// Ink-specific Types
export type {
  LicenseGateProps,
  PurchaseFlowProps,
  LicenseStatusProps,
  TuishLicenseManagerProps,
} from './types.js';
