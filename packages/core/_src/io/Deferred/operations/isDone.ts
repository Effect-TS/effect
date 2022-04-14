import { concreteDeferred } from "@effect/core/io/Deferred/operations/_internal/DeferredInternal";

/**
 * Checks for completion of this `Promise`. Produces true if this promise has
 * already been completed with a value or an error and false otherwise.
 *
 * @tsplus fluent ets/Deferred isDone
 */
export function isDone<E, A>(
  self: Deferred<E, A>,
  __tsplusTrace?: string
): Effect.UIO<boolean> {
  concreteDeferred(self);
  return Effect.succeed(self.state.get._tag === "Done");
}
