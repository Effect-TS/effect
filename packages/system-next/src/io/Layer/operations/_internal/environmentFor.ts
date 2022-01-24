import type { Has, Tag } from "../../../../data/Has"
import { mergeEnvironments } from "../../../../data/Has"
import { environmentWith } from "../../../Effect/operations/environmentWith"
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
