/**
 * @since 1.0.0
 */
import type * as Cause from "effect/Cause"
import * as Channel from "effect/Channel"
import * as Chunk from "effect/Chunk"
import * as Context from "effect/Context"
import * as Data from "effect/Data"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as Option from "effect/Option"
import * as Scope from "effect/Scope"
import type * as AsyncProducer from "effect/SingleProducerAsyncInput"

/**
 * @since 1.0.0
 * @category type ids
 */
export const SocketTypeId = Symbol.for("@effect/experimental/Socket")

/**
 * @since 1.0.0
 * @category type ids
 */
export type SocketTypeId = typeof SocketTypeId

/**
 * @since 1.0.0
 * @category tags
 */
export const Socket: Context.Tag<Socket, Socket> = Context.Tag<Socket>(
  "@effect/experimental/Socket"
)

/**
 * @since 1.0.0
 * @category models
 */
export interface Socket {
  readonly [SocketTypeId]: SocketTypeId
  readonly writer: Effect.Effect<Scope.Scope, never, (chunk: Uint8Array) => Effect.Effect<never, SocketError, void>>
  readonly pull: Effect.Effect<never, Option.Option<SocketError>, Uint8Array>
}

/**
 * @since 1.0.0
 * @category errors
 */
export class SocketError extends Data.TaggedError("SocketError")<{
  readonly reason: "Write" | "Read" | "Open"
  readonly error: unknown
}> {}

/**
 * @since 1.0.0
 * @category combinators
 */
export const toChannel = <IE = never>() =>
(
  self: Socket
): Channel.Channel<never, IE, Chunk.Chunk<Uint8Array>, unknown, SocketError | IE, Chunk.Chunk<Uint8Array>, void> =>
  Channel.unwrap(
    Effect.gen(function*(_) {
      const writeScope = yield* _(Scope.make())
      const write = yield* _(Scope.extend(self.writer, writeScope))
      let inputError: Cause.Cause<IE | SocketError> | undefined

      const input: AsyncProducer.AsyncInputProducer<IE, Chunk.Chunk<Uint8Array>, unknown> = {
        awaitRead: () => Effect.unit,
        emit(chunk) {
          return Effect.catchAllCause(Effect.forEach(chunk, write, { discard: true }), (cause) => {
            inputError = cause
            return Effect.unit
          })
        },
        error(error) {
          inputError = error
          return Scope.close(writeScope, Exit.unit)
        },
        done() {
          return Scope.close(writeScope, Exit.unit)
        }
      }

      const loop: Channel.Channel<
        never,
        unknown,
        unknown,
        unknown,
        Option.Option<SocketError>,
        Chunk.Chunk<Uint8Array>,
        void
      > = Channel.flatMap(
        self.pull,
        (chunk) => Channel.zipRight(Channel.write(Chunk.of(chunk)), loop)
      )

      const pull = Channel.catchAll(
        loop,
        Option.match({
          onNone: () => inputError ? Channel.failCause(inputError) : Channel.unit,
          onSome: (error: SocketError | IE) => Channel.fail(error)
        })
      )

      return Channel.embedInput(pull, input)
    })
  )

/**
 * @since 1.0.0
 * @category constructors
 */
export const makeChannel = <IE = never>(): Channel.Channel<
  Socket,
  IE,
  Chunk.Chunk<Uint8Array>,
  unknown,
  SocketError | IE,
  Chunk.Chunk<Uint8Array>,
  void
> => Channel.unwrap(Effect.map(Socket, toChannel<IE>()))
