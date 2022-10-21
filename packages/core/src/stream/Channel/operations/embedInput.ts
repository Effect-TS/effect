import { Bridge } from "@effect/core/stream/Channel/definition/primitives"
import type { AsyncInputProducer } from "@effect/core/stream/Channel/SingleProducerAsyncInput"

/**
 * Embed inputs from continuos pulling of a producer.
 *
 * @tsplus static effect/core/stream/Channel.Aspects embedInput
 * @tsplus pipeable effect/core/stream/Channel embedInput
 */
export function embedInput<InErr, InElem, InDone>(
  input: AsyncInputProducer<InErr, InElem, InDone>
) {
  return <Env, OutErr, OutElem, OutDone>(
    self: Channel<Env, unknown, unknown, unknown, OutErr, OutElem, OutDone>
  ): Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone> => new Bridge(input, self)
}
