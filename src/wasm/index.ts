import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export interface WASMModule {
  configureBaseUrl(url: string): void;
  configureWarId(id: string): void;

  fetchEffects(): Promise<string>;
  fetchStatus(): Promise<string>;
  fetchGameClient(): Promise<string>;
}

const __self = dirname(fileURLToPath(import.meta.url));
export let module: WASMModule;

export function supportsWasm(): boolean {
  return existsSync(join(__self, 'keeper-wasm.mjs'));
}

export async function initializeWasm(): Promise<void> {
  if (!supportsWasm()) {
    console.warn('Running without WASM module, dependent functionality will be disabled');
    return;
  }

  // const module = await import(join(__self, 'keeper-wasm.js'));
  const mod = (await import('./keeper-wasm.mjs')) as WASMModule;
  module = mod;
}
