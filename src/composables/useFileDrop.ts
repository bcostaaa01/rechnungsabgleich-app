import { ref } from 'vue'

// Drag state via an enter/leave counter, not a plain dragover/dragleave
// boolean: `dragleave` fires on every child-element boundary crossing
// during a drag, not just when leaving the container, so a naive boolean
// toggle flickers the "drop here" affordance on and off as the pointer
// moves over child elements.
export function useFileDrop(onFile: (file: File) => void) {
  const isDragging = ref(false)
  let depth = 0

  function onDragEnter() {
    depth += 1
    isDragging.value = true
  }

  function onDragLeave() {
    depth -= 1
    if (depth <= 0) {
      depth = 0
      isDragging.value = false
    }
  }

  function onDrop(event: DragEvent) {
    depth = 0
    isDragging.value = false
    const file = event.dataTransfer?.files[0]
    if (file) onFile(file)
  }

  return { isDragging, onDragEnter, onDragLeave, onDrop }
}
