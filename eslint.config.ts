import { globalIgnores } from 'eslint/config'
import { defineConfigWithVueTs, vueTsConfigs } from '@vue/eslint-config-typescript'
import pluginVue from 'eslint-plugin-vue'
import pluginVitest from '@vitest/eslint-plugin'
import pluginOxlint from 'eslint-plugin-oxlint'
import skipFormatting from 'eslint-config-prettier/flat'

// To allow more languages other than `ts` in `.vue` files, uncomment the following lines:
// import { configureVueProject } from '@vue/eslint-config-typescript'
// configureVueProject({ scriptLangs: ['ts', 'tsx'] })
// More info at https://github.com/vuejs/eslint-config-typescript/#advanced-setup

export default defineConfigWithVueTs(
  {
    name: 'app/files-to-lint',
    files: ['**/*.{vue,ts,mts,tsx}'],
  },

  globalIgnores([
    '**/dist/**',
    '**/dist-ssr/**',
    '**/coverage/**',
    // Its own standalone React project (deliberately not an npm workspace
    // member -- see examples/subcontractor-intake/README.md) -- the Vue-
    // flavored config below (pluginVue, vueTsConfigs) doesn't apply to it.
    'examples/**',
  ]),

  ...pluginVue.configs['flat/essential'],
  vueTsConfigs.recommended,

  {
    name: 'design-system/single-word-component-names',
    // Design-system packages conventionally export single-word component
    // names (Button, Badge) -- consumers always import them namespaced
    // (`import { Button } from '@rechnungsabgleich/design-system'`), so
    // there's no ambiguity the multi-word rule is meant to prevent.
    files: ['packages/design-system/src/**/*.vue'],
    rules: {
      'vue/multi-word-component-names': 'off',
    },
  },

  {
    ...pluginVitest.configs.recommended,
    files: ['src/**/__tests__/*'],
  },

  ...pluginOxlint.buildFromOxlintConfigFile('.oxlintrc.json'),

  skipFormatting,
)
