import { createContext } from 'react';
import type { LicenseContextValue } from '../types.js';

export const LicenseContext = createContext<LicenseContextValue | null>(null);
