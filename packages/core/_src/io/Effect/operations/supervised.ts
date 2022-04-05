import { ISupervise } from "@effect-ts/core/io/Effect/definition/primitives";

/**
 * Returns an effect with the behavior of this one, but where all child fibers
 * forked in the effect are reported to the specified supervisor.
 *
 * @tsplus fluent ets/Effect supervised
 */
export function supervised_<R, E, A, X>(
  self: Effect<R, E, A>,
  supervisor: LazyArg<Supervisor<X>>,
  __tsplusTrace?: string
): Effect<R, E, A> {
  return Effect.suspendSucceed(new ISupervise(self, supervisor, __tsplusTrace));
}

/**
 * Returns an effect with the behavior of this one, but where all child fibers
 * forked in the effect are reported to the specified supervisor.
 *
 * @tsplus static ets/Effect/Aspects supervised
 */
export const supervised = Pipeable(supervised_);
