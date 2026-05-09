/**
 * @since 1.0.0
 */
import { EventStreamCodec } from "@smithy/eventstream-codec"
import { fromUtf8, toUtf8 } from "@smithy/util-utf8"
import * as Channel from "effect/Channel"
import type * as Chunk from "effect/Chunk"
import * as Effect from "effect/Effect"
import * as Mailbox from "effect/Mailbox"
import type { ParseError } from "effect/ParseResult"
import * as Schema from "effect/Schema"
import type * as AsyncInput from "effect/SingleProducerAsyncInput"

/**
 * An event stream encoding parser.
 *
 * See the [AWS Documentation](https://docs.aws.amazon.com/lexv2/latest/dg/event-stream-encoding.html)
 * for more information.
 *
 * @since 1.0.0
 */
export const makeChannel: <A, I, R, IE, Done>(schema: Schema.Schema<A, I, R>, options?: {
  readonly bufferSize?: number
}) => Channel.Channel<
  Chunk.Chunk<A>,
  Chunk.Chunk<Uint8Array<ArrayBufferLike>>,
  IE | ParseError,
  IE,
  void,
  Done,
  R
> = Effect.fnUntraced(
  function*<A, I, R, IE, Done>(schema: Schema.Schema<A, I, R>, options?: {
    readonly bufferSize?: number
  }) {
    const context = yield* Effect.context<R>()

    const mailbox = yield* Mailbox.make<A, IE | ParseError>(options?.bufferSize ?? 16)

    const codec = new EventStreamCodec(toUtf8, fromUtf8)
    const decodeMessage = Schema.decodeUnknown(schema, {
      onExcessProperty: "ignore"
    })
    const textDecoder = new TextDecoder()

    let messages: Array<A> = []
    let buffer = new Uint8Array(0)

    const input: AsyncInput.AsyncInputProducer<
      IE | ParseError,
      Chunk.Chunk<Uint8Array>,
      Done
    > = {
      awaitRead() {
        return Effect.void
      },
      emit(chunks) {
        return Effect.forEach(
          chunks,
          Effect.fnUntraced(function*(chunk) {
            // Append new chunk to buffer
            const newBuffer = new Uint8Array(buffer.length + chunk.length)
            newBuffer.set(buffer)
            newBuffer.set(chunk, buffer.length)
            buffer = newBuffer

            // Try to decode messages from the buffer
            while (buffer.length >= 4) {
              // The first four bytes are the total length of the message (big-endian)
              const totalLength = new DataView(
                buffer.buffer,
                buffer.byteOffset,
                buffer.byteLength
              ).getUint32(0, false)

              // If we don't have the full message yet, keep looping
              if (buffer.length < totalLength) {
                break
              }

              // Decode exactly the sub-slice for this event
              const subView = buffer.subarray(0, totalLength)
              const decoded = codec.decode(subView)

              // Slice the used bytes off the buffer, removing this message
              buffer = buffer.slice(totalLength)

              // Process the message
              if (decoded.headers[":message-type"]?.value === "event") {
                const data = textDecoder.decode(decoded.body)

                // Wrap the data in the `":event-type"` field to match the
                // expected schema
                const message = yield* decodeMessage({
                  [decoded.headers[":event-type"]?.value as string]: JSON.parse(data)
                }).pipe(Effect.provide(context))

                messages.push(message)
              }
            }
            yield* mailbox.offerAll(messages)
            messages = []
          }),
          { discard: true }
        ).pipe(Effect.catchAll((error) => mailbox.fail(error)))
      },
      error(cause) {
        return mailbox.failCause(cause)
      },
      done() {
        return mailbox.end
      }
    }

    return Channel.embedInput(Mailbox.toChannel(mailbox), input)
  },
  Channel.unwrap
) as any
