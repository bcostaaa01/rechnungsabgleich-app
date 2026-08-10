import type { Meta, StoryObj } from '@storybook/vue3-vite'
import Spinner from './Spinner.vue'

const meta: Meta<typeof Spinner> = {
  title: 'Spinner',
  component: Spinner,
}

export default meta
type Story = StoryObj<typeof Spinner>

export const Bare: Story = {}

export const WithLabel: Story = {
  args: { label: 'Rechnung wird geladen …' },
}
