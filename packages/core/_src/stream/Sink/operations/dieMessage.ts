/**
 * Creates a sink halting with the specified message, wrapped in a
 * `RuntimeError`.
 *
 * @tsplus static effect/core/stream/Sink.Ops dieMessage
 */
export function dieMessage(
  message: LazyArg<string>,
  __tsplusTrace?: string
): Sink<never, never, unknown, never, never> {
  return Sink.failCause(Cause.die(new RuntimeError(message())))
}
