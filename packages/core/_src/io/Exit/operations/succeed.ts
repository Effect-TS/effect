import { ISuccess } from "@effect/core/io/Effect/definition/primitives"

/**
 * @tsplus static effect/core/io/Exit.Ops succeed
 */
export function succeed<A>(a: A): Exit<never, A> {
  return new ISuccess(a)
}
