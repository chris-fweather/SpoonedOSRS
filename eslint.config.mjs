import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Build output, local Worker state and static assets.
    "dist/**",
    ".wrangler/**",
    "public/**",
    "artwork/**",
    ".claude/**",
  ]),
  {
    rules: {
      // The site renders on Cloudflare Workers through vinext: plain anchors and images are intended (no Next router or image optimiser).
      "@next/next/no-html-link-for-pages": "off",
      "@next/next/no-img-element": "off",
      // React Compiler checks; the app does not use the compiler, and loading data into state from effects is its normal pattern.
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/refs": "off",
    },
  },
  {
    // Tests build partial fixtures, and three.js is typed by a minimal local shim (types/three-shims.d.ts).
    files: ["**/*.test.ts", "app/Look.tsx"],
    rules: {"@typescript-eslint/no-explicit-any": "off"},
  },
]);

export default eslintConfig;
