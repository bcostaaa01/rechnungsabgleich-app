import type { StorybookConfig } from '@storybook/vue3-vite'

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(js|ts)'],
  framework: {
    name: '@storybook/vue3-vite',
    options: {},
  },
  async viteFinal(viteConfig) {
    // @storybook/vue3-vite does not register @vitejs/plugin-vue itself --
    // it only aliases the `vue` import target (see its templateCompilation
    // preset plugin). Without this, every .vue file 404s the moment a
    // story tries to dynamically import its component.
    const { default: vue } = await import('@vitejs/plugin-vue')
    const { default: tailwindcss } = await import('@tailwindcss/vite')
    viteConfig.plugins = [...(viteConfig.plugins ?? []), vue(), tailwindcss()]
    return viteConfig
  },
}

export default config
