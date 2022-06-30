import { Success } from "@effect/core/io/Exit/definition"

/**
 * @tsplus static effect/core/io/Exit.Ops succeed
 */
export function succeed<A>(a: A): Exit<never, A> {
  return new Success(a)
}
