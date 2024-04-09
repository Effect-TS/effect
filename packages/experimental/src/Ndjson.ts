/**
 * @since 1.0.0
 */
import { RefailError } from "@effect/platform/Error"
import type { ParseError } from "@effect/schema/ParseResult"
import * as Schema from "@effect/schema/Schema"
import type * as Cause from "effect/Cause"
import * as Channel from "effect/Channel"
import * as Chunk from "effect/Chunk"
import * as Effect from "effect/Effect"
import { dual, pipe } from "effect/Function"

/**
 * @since 1.0.0
 * @category type ids
 */
export const NdjsonErrorTypeId = Symbol.for("@effect/experimental/Ndjson/NdjsonError")

/**
 * @since 1.0.0
 * @category type ids
 */
export type NdjsonErrorTypeId = typeof NdjsonErrorTypeId

const encoder = new TextEncoder()

/**
 * @since 1.0.0
 * @category errors
 */
export class NdjsonError extends RefailError(NdjsonErrorTypeId, "NdjsonError")<{
  readonly reason: "Pack" | "Unpack"
}> {}

/**
 * @since 1.0.0
 * @category constructors
 */
export const pack = <IE = never, Done = unknown>(): Channel.Channel<
  Chunk.Chunk<Uint8Array>,
  Chunk.Chunk<unknown>,
  IE | NdjsonError,
  IE,
  Done,
  Done
> => {
  const loop: Channel.Channel<
    Chunk.Chunk<Uint8Array>,
    Chunk.Chunk<unknown>,
    IE | NdjsonError,
    IE,
    Done,
    Done
  > = Channel.readWithCause({
    onInput: (input: Chunk.Chunk<unknown>) =>
      Channel.zipRight(
        Channel.flatMap(
          Effect.try({
            try: () =>
              Chunk.of(
                encoder.encode(
                  Chunk.toReadonlyArray(input).map((_) => JSON.stringify(_)).join("\n") + "\n"
                )
              ),
            catch: (error) => new NdjsonError({ reason: "Pack", error })
          }),
          Channel.write
        ),
        loop
      ),
    onFailure: (cause: Cause.Cause<IE>) => Channel.failCause(cause),
    onDone: (_) => Channel.succeed(_)
  })
  return loop
}

/**
 * @since 1.0.0
 * @category constructors
 */
export const packSchema = <A, I, R>(
  schema: Schema.Schema<A, I, R>
) =>
<IE = never, Done = unknown>(): Channel.Channel<
  Chunk.Chunk<Uint8Array>,
  Chunk.Chunk<A>,
  IE | NdjsonError | ParseError,
  IE,
  Done,
  Done,
  R
> => {
  const encode = Schema.encode(Schema.ChunkFromSelf(schema))
  const loop: Channel.Channel<Chunk.Chunk<I>, Chunk.Chunk<A>, IE | ParseError, IE, Done, Done, R> = Channel
    .readWithCause({
      onInput: (input: Chunk.Chunk<A>) =>
        Channel.zipRight(
          Channel.flatMap(encode(input), Channel.write),
          loop
        ),
      onFailure: (cause: Cause.Cause<IE>) => Channel.failCause(cause),
      onDone: Channel.succeed
    })
  return Channel.pipeTo(loop, pack())
}

/**
 * @since 1.0.0
 * @category constructors
 */
export const unpack = <IE = never, Done = unknown>(): Channel.Channel<
  Chunk.Chunk<unknown>,
  Chunk.Chunk<Uint8Array>,
  IE | NdjsonError,
  IE,
  Done,
  Done
> =>
  Channel.suspend(() => {
    const decoder = new TextDecoder()
    const loop: Channel.Channel<Chunk.Chunk<string>, Chunk.Chunk<Uint8Array>, IE, IE, Done, Done, never> = Channel
      .readWithCause({
        onInput: (input) =>
          Channel.zipRight(
            Channel.write(Chunk.map(input, (_) => decoder.decode(_))),
            loop
          ),
        onFailure: (cause) => Channel.failCause(cause),
        onDone: (_) => Channel.succeed(_)
      })
    return Channel.mapOutEffect(Channel.pipeTo(loop, Channel.splitLines()), (chunk) =>
      Effect.try({
        try: () => Chunk.map(chunk, (_) => JSON.parse(_)),
        catch: (error) => new NdjsonError({ reason: "Unpack", error })
      }))
  })

/**
 * @since 1.0.0
 * @category constructors
 */
export const unpackSchema = <A, I, R>(
  schema: Schema.Schema<A, I, R>
) =>
<IE = never, Done = unknown>(): Channel.Channel<
  Chunk.Chunk<A>,
  Chunk.Chunk<Uint8Array>,
  NdjsonError | ParseError | IE,
  IE,
  Done,
  Done,
  R
> => {
  const parse = Schema.decodeUnknown(Schema.ChunkFromSelf(schema))
  return Channel.mapOutEffect(unpack<IE, Done>(), parse)
}

/**
 * @since 1.0.0
 * @category combinators
 */
export const duplex = <R, IE, OE, OutDone, InDone>(
  self: Channel.Channel<Chunk.Chunk<Uint8Array>, Chunk.Chunk<Uint8Array>, OE, IE | NdjsonError, OutDone, InDone, R>
): Channel.Channel<Chunk.Chunk<unknown>, Chunk.Chunk<unknown>, NdjsonError | OE, IE, OutDone, InDone, R> =>
  Channel.pipeTo(
    Channel.pipeTo(pack(), self),
    unpack()
  )

/**
 * @since 1.0.0
 * @category combinators
 */
export const duplexSchema = dual<
  <IA, II, IR, OA, OI, OR>(
    options: {
      readonly inputSchema: Schema.Schema<IA, II, IR>
      readonly outputSchema: Schema.Schema<OA, OI, OR>
    }
  ) => <R, InErr, OutErr, OutDone, InDone>(
    self: Channel.Channel<
      Chunk.Chunk<Uint8Array>,
      Chunk.Chunk<Uint8Array>,
      OutErr,
      NdjsonError | ParseError | InErr,
      OutDone,
      InDone,
      R
    >
  ) => Channel.Channel<
    Chunk.Chunk<OA>,
    Chunk.Chunk<IA>,
    NdjsonError | ParseError | OutErr,
    InErr,
    OutDone,
    InDone,
    R | IR | OR
  >,
  <R, InErr, OutErr, OutDone, InDone, IA, II, IR, OA, OI, OR>(
    self: Channel.Channel<
      Chunk.Chunk<Uint8Array>,
      Chunk.Chunk<Uint8Array>,
      OutErr,
      NdjsonError | ParseError | InErr,
      OutDone,
      InDone,
      R
    >,
    options: {
      readonly inputSchema: Schema.Schema<IA, II, IR>
      readonly outputSchema: Schema.Schema<OA, OI, OR>
    }
  ) => Channel.Channel<
    Chunk.Chunk<OA>,
    Chunk.Chunk<IA>,
    NdjsonError | ParseError | OutErr,
    InErr,
    OutDone,
    InDone,
    R | IR | OR
  >
>(2, <R, InErr, OutErr, OutDone, InDone, IA, II, IR, OA, OI, OR>(
  self: Channel.Channel<
    Chunk.Chunk<Uint8Array>,
    Chunk.Chunk<Uint8Array>,
    OutErr,
    NdjsonError | ParseError | InErr,
    OutDone,
    InDone,
    R
  >,
  options: {
    readonly inputSchema: Schema.Schema<IA, II, IR>
    readonly outputSchema: Schema.Schema<OA, OI, OR>
  }
): Channel.Channel<
  Chunk.Chunk<OA>,
  Chunk.Chunk<IA>,
  NdjsonError | ParseError | OutErr,
  InErr,
  OutDone,
  InDone,
  R | IR | OR
> => {
  const pack = packSchema(options.inputSchema)
  const unpack = unpackSchema(options.outputSchema)
  return pipe(
    pack<InErr, InDone>(),
    Channel.pipeTo(self),
    Channel.pipeTo(unpack())
  )
})
