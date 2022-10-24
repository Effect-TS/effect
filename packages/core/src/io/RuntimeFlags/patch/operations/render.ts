import { renderFlag } from "@effect/core/io/RuntimeFlags/_internal/allFlags"

/**
 * @tsplus getter effect/core/io/RuntimeFlags.Patch render
 * @category destructors
 * @since 1.0.0
 */
export function render(self: RuntimeFlags.Patch): string {
  const enabledS = `(${Array.from(self.enabledSet).map(renderFlag).join(", ")})`
  const disabledS = `(${Array.from(self.disabledSet).map(renderFlag).join(", ")})`
  return `RuntimeFlags.Patch(enabled = ${enabledS}, disabled = ${disabledS})`
}
