import * as Context from "../Context.ts"
import type * as Effect from "../Effect.ts"

/**
 * Defers reactivity invalidations until the outermost SQL commit, dropping them
 * on rollback.
 *
 * @internal
 */
export const DeferInvalidation = Context.Reference<
  ((invalidate: Effect.Effect<void>) => Effect.Effect<void>) | undefined
>("effect/reactivity/DeferInvalidation", { defaultValue: () => undefined })
