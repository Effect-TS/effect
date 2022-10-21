import { Emit } from "@effect/core/stream/Channel/definition/primitives"

/**
 * Writes an output to the channel.
 *
 * @tsplus static effect/core/stream/Channel.Ops write
 */
export function write<OutElem>(
  out: OutElem
): Channel<never, unknown, unknown, unknown, never, OutElem, void> {
  return new Emit(out)
}
