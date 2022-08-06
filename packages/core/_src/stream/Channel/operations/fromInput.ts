import type { AsyncInputConsumer } from "@effect/core/stream/Channel/SingleProducerAsyncInput"

/**
 * @tsplus static effect/core/stream/Channel.Ops fromInput
 */
export function fromInput<Err, Elem, Done>(
  input: AsyncInputConsumer<Err, Elem, Done>
): Channel<never, unknown, unknown, unknown, Err, Elem, Done> {
  return Channel.unwrap(
    input.takeWith(
      (cause) => Channel.failCause(cause),
      (elem) => Channel.write(elem) > fromInput(input),
      (done) => Channel.succeed(done)
    )
  )
}
