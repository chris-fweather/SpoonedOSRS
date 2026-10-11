import vinext from "vinext";
import { defineConfig } from "vite";
import { buildReleaseInfo } from "./scripts/release-info.mjs";
import { deploymentConfig } from "./scripts/deployment-config.mjs";

const LOCAL_PLACEHOLDER_DATABASE_ID =
  "00000000-0000-4000-8000-000000000000";

const isBuild = process.argv.includes("build");
// Database, Discord and owner identifiers come from Workers Builds variables (or the private
// repository's config/deployment.private.json). A production build fails if any is missing.
const deployment = deploymentConfig({ required: isBuild });
const PRODUCTION_DATABASE_ID = deployment.d1DatabaseId;

const localBindingConfig = {
  name: "spoonedosrs",
  compatibility_date: "2026-05-15",
  main: "./build/worker.ts",
  compatibility_flags: ["nodejs_compat"],
  // Serve only on spoonedosrs.com (a dashboard custom domain). Without these, every deploy re-enables the
  // account's *.workers.dev address and per-version preview URLs, which expose the account subdomain.
  workers_dev: false,
  preview_urls: false,
  // Background refresh (lib/background-refresh.ts): profiles that never had a full four-source pull.
  triggers: { crons: ["*/10 * * * *"] },
  assets: { binding: "ASSETS" },
  ratelimits: [
    {name:"API_READ_LIMIT",namespace_id:"1556611",simple:{limit:180,period:60 as const}},
    {name:"API_WRITE_LIMIT",namespace_id:"1556612",simple:{limit:30,period:60 as const}},
  ],
  // Public OAuth client id from the deployment configuration. A dashboard variable is dropped on
  // the next deploy unless it is declared here. The client secret, session secret and deploy-check
  // secret stay Worker secrets and are never listed in this file.
  vars: {
    DISCORD_CLIENT_ID: deployment.discord.applicationId,
  },
  d1_databases: [
    {
      binding: "DB",
      database_name: "spoonedosrs-db",
      // Local dev keeps the placeholder so existing local data stays put.
      database_id: isBuild && PRODUCTION_DATABASE_ID ? PRODUCTION_DATABASE_ID : LOCAL_PLACEHOLDER_DATABASE_ID,
      // The Cloudflare plugin rebases this project-relative path in its generated config.
      migrations_dir: "drizzle",
    },
  ],
};

export default defineConfig(async () => {
  // Use Miniflare's local Request.cf placeholder unless fetching is requested.
  process.env.CLOUDFLARE_CF_FETCH_ENABLED ??= "false";
  process.env.WRANGLER_SEND_METRICS ??= "false";

  // Keep Wrangler and Miniflare state project-local. These are non-secret tool
  // settings; application environment belongs in ignored `.env*` files.
  process.env.WRANGLER_WRITE_LOGS ??= "false";
  process.env.WRANGLER_LOG_PATH ??= ".wrangler/logs";
  process.env.WRANGLER_REGISTRY_PATH ??= ".wrangler/dev-registry";
  process.env.MINIFLARE_REGISTRY_PATH ??= ".wrangler/registry";

  // Wrangler snapshots its log path while the Cloudflare plugin is imported.
  const { cloudflare } = await import("@cloudflare/vite-plugin");

  return {
    define: {
      __SPOONED_RELEASE__: JSON.stringify(buildReleaseInfo()),
      __SPOONED_DISCORD__: JSON.stringify(deployment.discord),
      // Referenced only by server modules (lib/account-identity.ts).
      __SPOONED_OWNERS__: JSON.stringify(deployment.ownerDiscordIds),
    },
    plugins: [
      vinext(),
      cloudflare({
        viteEnvironment: { name: "rsc", childEnvironments: ["ssr"] },
        inspectorPort: false,
        config: localBindingConfig,
      }),
    ],
  };
});
