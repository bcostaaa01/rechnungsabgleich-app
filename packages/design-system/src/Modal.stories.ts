import type { Meta, StoryObj } from '@storybook/vue3-vite'
import Modal from './Modal.vue'
import Button from './Button.vue'

const meta: Meta<typeof Modal> = {
  title: 'Modal',
  component: Modal,
}

export default meta
type Story = StoryObj<typeof Modal>

export const ConfirmDialog: Story = {
  render: () => ({
    components: { Modal, Button },
    template: `
      <Modal v-slot="{ titleId }">
        <h2 :id="titleId" class="font-semibold text-ink">Rechnung verlassen?</h2>
        <p class="mt-2 text-muted">
          Ihre Prüfentscheidungen (akzeptierte und markierte Positionen) für diese
          Rechnung gehen verloren.
        </p>
        <div class="mt-4 flex justify-end gap-2">
          <Button variant="secondary">Abbrechen</Button>
          <Button variant="primary">Verwerfen</Button>
        </div>
      </Modal>
    `,
  }),
}
