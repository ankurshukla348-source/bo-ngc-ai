/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Seller dashboard access PIN. Set in the project's env/keys settings;
   *  falls back to the built-in default when unset. */
  readonly VITE_SELLER_PIN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
