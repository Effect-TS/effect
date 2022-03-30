import type { Has, Tag } from "../../../../data/Has"
import { mergeEnvironments } from "../../../../data/Has"
import { Effect } from "../../../Effect"

export function environmentFor<T>(has: Tag<T>, a: T): Effect<{}, never, Has<T>> {
  // @ts-expect-error
  return Effect.environmentWith((r) => ({
    [has.key]: mergeEnvironments(has, r, a)[has.key]
  }))
}
