/**
 * The stream that dies with an exception described by `msg`.
 *
 * @tsplus static ets/Stream/Ops dieMessage
 */
export function dieMessage(
  message: LazyArg<string>,
  __tsplusTrace?: string
): Stream<unknown, never, never> {
  return Stream.fromEffect(Effect.dieMessage(message))
}
