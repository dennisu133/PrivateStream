import { defineEnvVars } from "@sveltejs/kit/env";

// Every variable is optional: missing configuration is reported at runtime
// (see hooks.server.ts) rather than preventing the server from starting.
const optional = (value: string | undefined) => value;

export const variables = defineEnvVars({
	SITE_PASSWORD_HASH: {
		description: "Base64 bcrypt hash of the site passphrase",
		schema: optional
	},
	SESSION_SECRET: {
		description: "Base64 session signing secret of at least 32 bytes",
		schema: optional
	},
	DANGEROUSLY_DISABLE_AUTH: {
		description: 'Set to "true" to disable the password gate (development only)',
		schema: optional
	},
	REACTIONS: {
		description: 'Set to "false" to disable reactions and their API',
		schema: optional
	},
	SRS_WHEP_URL: {
		description: "SRS WHEP playback endpoint",
		schema: optional
	},
	SERVER_PUBLIC_IP: {
		description: "Public IP advertised to SRS as the WebRTC candidate",
		schema: optional
	},
	IP_LOOKUP_URLS: {
		description: "Comma-separated plain-text IP echo services",
		schema: optional
	}
});
