import type { Meta, StoryObj } from '@storybook/vue3-vite'
import Badge from './Badge.vue'

const meta: Meta<typeof Badge> = {
  title: 'Badge',
  component: Badge,
  argTypes: {
    tone: {
      control: 'select',
      options: ['neutral', 'error', 'warning'],
    },
  },
}

export default meta
type Story = StoryObj<typeof Badge>

export const Neutral: Story = {
  args: { tone: 'neutral' },
  render: (args) => ({
    components: { Badge },
    setup() {
      return { args }
    },
    template: '<Badge v-bind="args">EN16931</Badge>',
  }),
}

export const Error: Story = {
  args: { tone: 'error' },
  render: (args) => ({
    components: { Badge },
    setup() {
      return { args }
    },
    template: '<Badge v-bind="args">R-LINE-01</Badge>',
  }),
}

export const Warning: Story = {
  args: { tone: 'warning' },
  render: (args) => ({
    components: { Badge },
    setup() {
      return { args }
    },
    template: '<Badge v-bind="args">R-SUM-01</Badge>',
  }),
}
