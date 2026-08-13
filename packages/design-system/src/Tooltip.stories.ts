import type { Meta, StoryObj } from '@storybook/vue3-vite'
import Tooltip from './Tooltip.vue'
import Button from './Button.vue'

const meta: Meta<typeof Tooltip> = {
  title: 'Tooltip',
  component: Tooltip,
  argTypes: {
    placement: {
      control: 'select',
      options: ['top', 'bottom'],
    },
    align: {
      control: 'select',
      options: ['center', 'end'],
    },
  },
}

export default meta
type Story = StoryObj<typeof Tooltip>

export const Top: Story = {
  args: { label: 'Vergrößern', placement: 'top' },
  render: (args) => ({
    components: { Tooltip, Button },
    setup() {
      return { args }
    },
    template: `
      <div class="p-12">
        <Tooltip v-bind="args">
          <Button variant="ghost">+</Button>
        </Tooltip>
      </div>
    `,
  }),
}

export const Bottom: Story = {
  args: { label: 'Tastaturkürzel anzeigen', placement: 'bottom' },
  render: (args) => ({
    components: { Tooltip, Button },
    setup() {
      return { args }
    },
    template: `
      <div class="p-12">
        <Tooltip v-bind="args">
          <Button variant="ghost">?</Button>
        </Tooltip>
      </div>
    `,
  }),
}

// A trigger flush against a container's right edge: 'end' keeps the bubble
// from running off-screen, unlike the default centered alignment.
export const AlignedToEdge: Story = {
  args: { label: 'Zu dunklem Modus wechseln', placement: 'bottom', align: 'end' },
  render: (args) => ({
    components: { Tooltip, Button },
    setup() {
      return { args }
    },
    template: `
      <div class="flex justify-end p-12">
        <Tooltip v-bind="args">
          <Button variant="ghost">🌙</Button>
        </Tooltip>
      </div>
    `,
  }),
}
