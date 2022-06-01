import { Emit } from "@effect/core/stream/Channel/definition/primitives"

/**
 * Writes an output to the channel.
 *
 * @tsplus static ets/Channel/Ops write
 */
export function write<OutElem>(
  out: LazyArg<OutElem>
): Channel<never, unknown, unknown, unknown, never, OutElem, void> {
  return new Emit(out)
}
