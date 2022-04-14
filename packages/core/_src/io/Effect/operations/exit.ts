import { IFold } from "@effect/core/io/Effect/definition/primitives";

/**
 * Returns an effect that semantically runs the effect on a fiber, producing
 * an `Exit` for the completion value of the fiber.
 *
 * @tsplus fluent ets/Effect exit
 */
export function exit<R, E, A>(
  self: Effect<R, E, A>,
  __tsplusTrace?: string
): Effect.RIO<R, Exit<E, A>> {
  return new IFold(
    self,
    (cause) => Effect.succeedNow(Exit.failCause(cause)),
    (success) => Effect.succeedNow(Exit.succeed(success)),
    __tsplusTrace
  );
}
