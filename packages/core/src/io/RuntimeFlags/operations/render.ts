import { allFlags } from "@effect/core/io/RuntimeFlags/_internal/allFlags"

/**
 * @tsplus getter effect/core/io/RuntimeFlags render
 */
export function render(flags: RuntimeFlags) {
  const active: string[] = []
  Object.entries(allFlags).forEach(([s, f]) => {
    if (flags.isEnabled(f)) {
      active.push(s)
    }
  })
  return `(${active.join(",")})`
}
