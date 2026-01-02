import type { Tuish } from '@tuish/sdk';
import { createContext } from 'react';

export const TuishSdkContext = createContext<Tuish | null>(null);
