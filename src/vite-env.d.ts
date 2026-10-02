/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Store-owner Google account — the only account with seller dashboard
   *  access. Falls back to the built-in owner account when unset. */
  readonly VITE_ADMIN_EMAIL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
