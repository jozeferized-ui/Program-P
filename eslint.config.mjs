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
    // Migration scripts use CommonJS require
    "migrate-*.js",
    "scripts/**",
    // Service worker
    "public/sw.js",
  ]),
  // Custom rules for Next.js/Prisma project
  {
    rules: {
      // Disable no-explicit-any - required for Prisma dynamic models and external libraries
      "@typescript-eslint/no-explicit-any": "off",
      // Disable set-state-in-effect - it gives false positives for async fetch patterns in useEffect
      "react-hooks/set-state-in-effect": "off",
      // Allow underscore-prefixed variables to be unused (common pattern)
      "@typescript-eslint/no-unused-vars": ["warn", {
        "argsIgnorePattern": "^_",
        "varsIgnorePattern": "^_",
        "caughtErrorsIgnorePattern": "^_"
      }],
      // Disable incompatible-library - false positives for react-hook-form and other external libs
      "react-hooks/incompatible-library": "off",
    },
  },
]);

export default eslintConfig;
