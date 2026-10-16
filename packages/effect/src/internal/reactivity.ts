import * as Context from "../Context.ts"
import type * as Effect from "../Effect.ts"

/**
 * Schedules a `Reactivity` invalidation requested by `invalidate` or
 * `mutation`. SQL transactions provide it so invalidations wait for the
 * outermost commit and are dropped on rollback.
 *
 * @internal
 */
export const DeferInvalidation = Context.Reference<
  ((invalidate: Effect.Effect<void>) => Effect.Effect<void>) | undefined
>("effect/reactivity/DeferInvalidation", { defaultValue: () => undefined })
