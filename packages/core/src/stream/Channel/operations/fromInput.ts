import { Channel } from "../definition"
import type { AsyncInputConsumer } from "../SingleProducerAsyncInput"

/**
 * @tsplus static ets/ChannelOps fromInput
 */
export function fromInput<Err, Elem, Done>(
  input: AsyncInputConsumer<Err, Elem, Done>
): Channel<unknown, unknown, unknown, unknown, Err, Elem, Done> {
  return Channel.unwrap(
    input.takeWith(
      (cause) => Channel.failCause(cause),
      (elem) => Channel.write(elem) > fromInput(input),
      (done) => Channel.succeedNow(done)
    )
  )
}
