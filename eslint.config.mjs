import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: false,
  allConfig: false,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      "**/*.tsbuildinfo",
    ],
    rules: {
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "react-hooks/exhaustive-deps": "off",
      "@next/next/no-img-element": "off",
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "react-i18next",
              message: "Use 'next-intl' instead of 'react-i18next'. Import 'useTranslations' from 'next-intl' (note the 's' at the end). See docs/development/i18n-standards.md",
            },
            {
              name: "i18next",
              message: "Use 'next-intl' instead of 'i18next'. See docs/development/i18n-standards.md",
            },
          ],
          patterns: [
            {
              group: ["react-i18next/*"],
              message: "Use 'next-intl' instead of 'react-i18next'. See docs/development/i18n-standards.md",
            },
          ],
        },
      ],
      "no-restricted-syntax": [
        "warn",
        {
          selector: "CallExpression[callee.name='useTranslation']",
          message: "Use 'useTranslations' (with 's') from 'next-intl' instead of 'useTranslation'. See docs/development/i18n-standards.md",
        },
      ],
    },
  },
];

export default eslintConfig;
