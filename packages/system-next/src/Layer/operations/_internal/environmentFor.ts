// ets_tracing: off

import { environmentWith } from "../../../Effect/operations/environmentWith"
import type { Has, Tag } from "../../../Has"
import { mergeEnvironments } from "../../../Has"
import type { Managed } from "../../../Managed/definition"
import { fromEffect } from "../../../Managed/operations/fromEffect"

export function environmentFor<T>(has: Tag<T>, a: T): Managed<{}, never, Has<T>> {
  // @ts-expect-error
  return fromEffect(
    environmentWith((r) => ({
      [has.key]: mergeEnvironments(has, r, a)[has.key]
    }))
  )
}
