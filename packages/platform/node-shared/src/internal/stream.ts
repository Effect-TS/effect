import type { Readable, Writable } from "node:stream"

// Keep teardown errors handled after removing the consumer's lifecycle listeners.
// Node emits the destruction error (if any) only once _destroy has completed.
export const destroyStream = (
  readable: Readable | Writable,
  cleanup: () => void,
  onDestroyed?: () => void
): void => {
  if (!("closed" in readable)) {
    cleanup()
    onDestroyed?.()
    return
  }
  const onDone = () => {
    clearImmediate(immediate)
    readable.off("error", onDone)
    readable.off("close", onDone)
    onDestroyed?.()
  }
  // With emitClose: false, successful destruction emits no event. Check the
  // public closed flag on a later turn, after any queued destruction error.
  // This also protects streams already closed but with an error still queued.
  const onClosed = () => {
    if (readable.closed) {
      onDone()
    } else {
      immediate = setImmediate(onClosed)
      if (!onDestroyed) immediate.unref()
    }
  }
  let immediate = setImmediate(onClosed)
  if (!onDestroyed) immediate.unref()
  readable.once("error", onDone)
  readable.once("close", onDone)
  cleanup()
  if (!readable.closed) {
    readable.destroy()
  }
}
