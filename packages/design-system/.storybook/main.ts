import type { StorybookConfig } from '@storybook/vue3-vite'

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(js|ts)'],
  framework: {
    name: '@storybook/vue3-vite',
    options: {},
  },
  async viteFinal(viteConfig) {
    const { default: tailwindcss } = await import('@tailwindcss/vite')
    viteConfig.plugins = [...(viteConfig.plugins ?? []), tailwindcss()]
    return viteConfig
  },
}

export default config
