import { renderFlag } from "@effect/core/io/RuntimeFlags/_internal/allFlags"

/**
 * @tsplus getter effect/core/io/RuntimeFlags.Patch render
 */
export function render(self: RuntimeFlags.Patch): string {
  const enabledS = `(${Chunk.from(self.enabledSet).map(renderFlag).join(", ")})`
  const disabledS = `(${Chunk.from(self.disabledSet).map(renderFlag).join(", ")})`
  return `RuntimeFlags.Patch(enabled = ${enabledS}, disabled = ${disabledS})`
}
