/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Seller dashboard access PIN. Set in the project's env/keys settings;
   *  falls back to the built-in default when unset. */
  readonly VITE_SELLER_PIN?: string;
  /** Store-owner Google account — routed straight to /seller on sign-in.
   *  Falls back to the built-in owner account when unset. */
  readonly VITE_ADMIN_EMAIL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
