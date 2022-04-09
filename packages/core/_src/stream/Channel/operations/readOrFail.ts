import { ContinuationK, Read } from "@effect/core/stream/Channel/definition/primitives";

/**
 * @tsplus static ets/Channel/Ops readOrFail
 */
export function readOrFail<In, E>(
  e: E
): Channel<unknown, unknown, In, unknown, E, never, In> {
  return new Read<unknown, unknown, In, unknown, E, never, In, never, In>(
    (i) => Channel.succeedNow(i),
    new ContinuationK(
      () => Channel.fail(e),
      () => Channel.fail(e)
    )
  );
}
