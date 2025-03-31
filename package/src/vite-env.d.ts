/// <reference types="vite/client" />

interface ImportMetaEnv {
	SOCKET_URL: string;
	API_URL: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
