import { unsafeMakeDeferred } from "@effect/core/io/Fiber/_internal/runtime"

/**
 * @category constructors
 * @since 1.0.0
 */
export const unsafeMake: <E, A>(fiberId: FiberId) => Deferred<E, A> = unsafeMakeDeferred
