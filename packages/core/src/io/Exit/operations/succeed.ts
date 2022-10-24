import { ISuccess } from "@effect/core/io/Effect/definition/primitives"

/**
 * @tsplus static effect/core/io/Exit.Ops succeed
 * @category constructors
 * @since 1.0.0
 */
export function succeed<A>(a: A): Exit<never, A> {
  return new ISuccess(a)
}
