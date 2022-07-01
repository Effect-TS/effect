import { renderFlag } from "@effect/core/stable/RuntimeFlags/_internal"
import type { Patch } from "@effect/core/stable/RuntimeFlags/Patch/definition"

/**
 * @tsplus getter effect/core/stable/RuntimeFlags/Patch render
 */
export function render(self: Patch): string {
  const enabledS = `(${Chunk.from(self.enabledSet).map(renderFlag).join(", ")})`
  const disabledS = `(${Chunk.from(self.disabledSet).map(renderFlag).join(", ")})`
  return `RuntimeFlags.Patch(enabled = ${enabledS}, disabled = ${disabledS})`
}
