/* eslint-disable */

import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export interface IHDClient {
  fetchEffects(): Promise<any>;
  fetchStatus(): Promise<any>;
  fetchGameClient(): Promise<any>;
}
interface HDClient {
  new(baseUrl: string, warId: string): IHDClient;
}
interface ExtModule {
  HDClient: HDClient;
}

const __self = dirname(fileURLToPath(import.meta.url));
export let module: ExtModule;

export function supportsExt(): boolean {
  return existsSync(join(__self, 'keeper-ext.mjs'));
}

export async function initializeExt(): Promise<void> {
  if (!supportsExt()) {
    console.warn('Running without extension module, dependent functionality will be disabled');
    return;
  }

  const mod = (await import('./keeper-ext.mjs')) as ExtModule;
  module = mod;
}
