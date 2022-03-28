import type { Channel } from "../definition"
import { Bridge } from "../definition"
import type { AsyncInputProducer } from "../SingleProducerAsyncInput"

/**
 * Embed inputs from continuos pulling of a producer.
 *
 * @tsplus fluent ets/Channel embedInput
 */
export function embedInput_<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>(
  self: Channel<Env, unknown, unknown, unknown, OutErr, OutElem, OutDone>,
  input: AsyncInputProducer<InErr, InElem, InDone>
): Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone> {
  return new Bridge(input, self)
}

/**
 * Embed inputs from continuos pulling of a producer.
 */
export const embedInput = Pipeable(embedInput_)
