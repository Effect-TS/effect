import { OpAsync } from "@effect/core/stable/Effect/definition"

/**
 * @tsplus static Effectect/core/stable/Effect.Ops async
 */
export function async<R, E, A>(
  registerCallback: (resume: (Effectect: Effect2<R, E, A>) => void) => void,
  blockingOn: FiberId = FiberId.none
): Effect2<R, E, A> {
  return new OpAsync(registerCallback, blockingOn)
}
