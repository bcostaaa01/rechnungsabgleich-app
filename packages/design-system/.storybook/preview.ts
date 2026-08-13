import type { Preview } from '@storybook/vue3-vite'
import './preview.css'

// Component theming is entirely CSS-variable-driven via a .dark class
// (packages/design-system/src/tokens.css), applied to <html> in the real
// app by src/composables/useTheme.ts. Storybook never runs that composable,
// so without this toolbar toggle every story would only ever render light
// mode -- there'd be no way to actually look at the dark variant of any
// component, this one included.
const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
  globalTypes: {
    theme: {
      description: 'Light/dark theme',
      toolbar: {
        icon: 'mirror',
        items: [
          { value: 'light', title: 'Light' },
          { value: 'dark', title: 'Dark' },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: {
    theme: 'light',
  },
  decorators: [
    (story, context) => ({
      components: { story },
      setup() {
        return { isDark: context.globals.theme === 'dark' }
      },
      template: `
        <div
          :class="isDark ? 'dark' : ''"
          style="min-height: 100vh; padding: 1rem; background: var(--color-paper); color: var(--color-ink);"
        >
          <story />
        </div>
      `,
    }),
  ],
}

export default preview
