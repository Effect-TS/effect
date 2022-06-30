import { ISupervise } from "@effect/core/io/Effect/definition/primitives"

/**
 * Returns an effect with the behavior of this one, but where all child fibers
 * forked in the effect are reported to the specified supervisor.
 *
 * @tsplus static effect/core/io/Effect.Aspects supervised
 * @tsplus pipeable effect/core/io/Effect supervised
 */
export function supervised<X>(
  supervisor: LazyArg<Supervisor<X>>,
  __tsplusTrace?: string
) {
  return <R, E, A>(self: Effect<R, E, A>): Effect<R, E, A> =>
    Effect.suspendSucceed(new ISupervise(self, supervisor, __tsplusTrace))
}
