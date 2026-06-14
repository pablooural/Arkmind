interface ImportMetaEnv {
  readonly BASE_URL?: string;
  readonly [key: string]: any; // allow other VITE_... vars used in the app
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
