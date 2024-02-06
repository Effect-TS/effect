/**
 * @since 1.0.0
 */
import type { ParseError } from "@effect/schema/ParseResult"
import * as Schema from "@effect/schema/Schema"
import type * as Cause from "effect/Cause"
import * as Channel from "effect/Channel"
import * as Chunk from "effect/Chunk"
import * as Data from "effect/Data"
import * as Effect from "effect/Effect"
import { dual, pipe } from "effect/Function"
import { Packr, Unpackr } from "msgpackr"

/**
 * @since 1.0.0
 * @category errors
 */
export class MsgPackError extends Data.TaggedError("MsgPackError")<{
  readonly reason: "Pack" | "Unpack"
  readonly error: unknown
}> {}

/**
 * @since 1.0.0
 * @category constructors
 */
export const pack = <IE = never>(): Channel.Channel<
  Chunk.Chunk<Uint8Array>,
  Chunk.Chunk<unknown>,
  IE | MsgPackError,
  IE,
  void,
  unknown
> =>
  Channel.flatMap(
    Channel.sync(() => new Packr()),
    (packr) => {
      const pack = (value: Chunk.Chunk<unknown>) =>
        Channel.flatMap(
          Effect.try({
            try: () => Chunk.map(value, (_) => packr.pack(_) as Uint8Array),
            catch: (error) => new MsgPackError({ reason: "Pack", error })
          }),
          Channel.write
        )

      const loop: Channel.Channel<Chunk.Chunk<Uint8Array>, Chunk.Chunk<unknown>, IE | MsgPackError, IE, void, unknown> =
        Channel.readWithCause({
          onInput: (input: Chunk.Chunk<unknown>) => Channel.zipRight(pack(input), loop),
          onFailure: (cause) => Channel.failCause(cause),
          onDone: () => Channel.unit
        })
      return loop
    }
  )

/**
 * @since 1.0.0
 * @category constructors
 */
export const packSchema = <A, I, R>(
  schema: Schema.Schema<A, I, R>
) =>
<IE = never>(): Channel.Channel<
  Chunk.Chunk<Uint8Array>,
  Chunk.Chunk<A>,
  IE | MsgPackError | ParseError,
  IE,
  void,
  unknown,
  R
> => {
  const encode = Schema.encode(Schema.chunkFromSelf(schema))
  const loop: Channel.Channel<Chunk.Chunk<I>, Chunk.Chunk<A>, IE | ParseError, IE, unknown, unknown, R> = Channel
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
export const unpack = <IE = never>(): Channel.Channel<
  Chunk.Chunk<unknown>,
  Chunk.Chunk<Uint8Array>,
  IE | MsgPackError,
  IE,
  void,
  unknown
> =>
  Channel.flatMap(
    Channel.sync(() => new Unpackr()),
    (packr) => {
      let incomplete: Uint8Array | undefined = undefined
      const unpack = (value: Chunk.Chunk<Uint8Array>) =>
        Channel.flatMap(
          Effect.try({
            try: () =>
              Chunk.flatMap(value, (buf) => {
                if (incomplete !== undefined) {
                  const chunk = new Uint8Array(incomplete.length + buf.length)
                  chunk.set(incomplete)
                  chunk.set(buf, incomplete.length)
                  buf = chunk
                  incomplete = undefined
                }
                try {
                  return Chunk.unsafeFromArray(packr.unpackMultiple(buf))
                } catch (error_) {
                  const error: any = error_
                  if (error.incomplete) {
                    incomplete = buf.subarray(error.lastPosition)
                    return Chunk.unsafeFromArray(error.values ?? [])
                  }
                  throw error
                }
              }),
            catch: (error) => new MsgPackError({ reason: "Unpack", error })
          }),
          Channel.write
        )

      const loop: Channel.Channel<Chunk.Chunk<unknown>, Chunk.Chunk<Uint8Array>, IE | MsgPackError, IE, void, unknown> =
        Channel.readWithCause({
          onInput: (input: Chunk.Chunk<Uint8Array>) => Channel.zipRight(unpack(input), loop),
          onFailure: (cause) => Channel.failCause(cause),
          onDone: () => Channel.unit
        })

      return loop
    }
  )

/**
 * @since 1.0.0
 * @category constructors
 */
export const unpackSchema = <A, I, R>(
  schema: Schema.Schema<A, I, R>
) =>
<IE = never>(): Channel.Channel<
  Chunk.Chunk<A>,
  Chunk.Chunk<Uint8Array>,
  MsgPackError | ParseError | IE,
  IE,
  void,
  unknown,
  R
> => {
  const parse = Schema.decodeUnknown(Schema.chunkFromSelf(schema))
  return Channel.mapOutEffect(unpack<IE>(), parse)
}

/**
 * @since 1.0.0
 * @category combinators
 */
export const duplex = <R, IE, OE>(
  self: Channel.Channel<Chunk.Chunk<Uint8Array>, Chunk.Chunk<Uint8Array>, OE, IE | MsgPackError, void, unknown, R>
): Channel.Channel<Chunk.Chunk<unknown>, Chunk.Chunk<unknown>, MsgPackError | OE, IE, void, unknown, R> =>
  Channel.pipeTo(
    Channel.pipeTo(pack(), self),
    unpack()
  )

/**
 * @since 1.0.0
 * @category combinators
 */
export const duplexSchema: {
  <IA, II, IR, OA, OI, OR>(
    options: {
      readonly inputSchema: Schema.Schema<IA, II, IR>
      readonly outputSchema: Schema.Schema<OA, OI, OR>
    }
  ): <R, InErr, OutErr>(
    self: Channel.Channel<
      Chunk.Chunk<Uint8Array>,
      Chunk.Chunk<Uint8Array>,
      OutErr,
      MsgPackError | ParseError | InErr,
      void,
      unknown,
      R
    >
  ) => Channel.Channel<
    Chunk.Chunk<OA>,
    Chunk.Chunk<IA>,
    MsgPackError | ParseError | OutErr,
    InErr,
    void,
    unknown,
    IR | OR | R
  >
  <R, InErr, OutErr, IA, II, IR, OA, OI, OR>(
    self: Channel.Channel<
      Chunk.Chunk<Uint8Array>,
      Chunk.Chunk<Uint8Array>,
      OutErr,
      MsgPackError | ParseError | InErr,
      void,
      unknown,
      R
    >,
    options: {
      readonly inputSchema: Schema.Schema<IA, II, IR>
      readonly outputSchema: Schema.Schema<OA, OI, OR>
    }
  ): Channel.Channel<
    Chunk.Chunk<OA>,
    Chunk.Chunk<IA>,
    MsgPackError | ParseError | OutErr,
    InErr,
    void,
    unknown,
    R | IR | OR
  >
} = dual<
  <IA, II, IR, OA, OI, OR>(
    options: {
      readonly inputSchema: Schema.Schema<IA, II, IR>
      readonly outputSchema: Schema.Schema<OA, OI, OR>
    }
  ) => <R, InErr, OutErr>(
    self: Channel.Channel<
      Chunk.Chunk<Uint8Array>,
      Chunk.Chunk<Uint8Array>,
      OutErr,
      MsgPackError | ParseError | InErr,
      void,
      unknown,
      R
    >
  ) => Channel.Channel<
    Chunk.Chunk<OA>,
    Chunk.Chunk<IA>,
    MsgPackError | ParseError | OutErr,
    InErr,
    void,
    unknown,
    R | IR | OR
  >,
  <R, InErr, OutErr, IA, II, IR, OA, OI, OR>(
    self: Channel.Channel<
      Chunk.Chunk<Uint8Array>,
      Chunk.Chunk<Uint8Array>,
      OutErr,
      MsgPackError | ParseError | InErr,
      void,
      unknown,
      R
    >,
    options: {
      readonly inputSchema: Schema.Schema<IA, II, IR>
      readonly outputSchema: Schema.Schema<OA, OI, OR>
    }
  ) => Channel.Channel<
    Chunk.Chunk<OA>,
    Chunk.Chunk<IA>,
    MsgPackError | ParseError | OutErr,
    InErr,
    void,
    unknown,
    R | IR | OR
  >
>(2, <R, InErr, OutErr, IA, II, IR, OA, OI, OR>(
  self: Channel.Channel<
    Chunk.Chunk<Uint8Array>,
    Chunk.Chunk<Uint8Array>,
    OutErr,
    MsgPackError | ParseError | InErr,
    void,
    unknown,
    R
  >,
  options: {
    readonly inputSchema: Schema.Schema<IA, II, IR>
    readonly outputSchema: Schema.Schema<OA, OI, OR>
  }
): Channel.Channel<
  Chunk.Chunk<OA>,
  Chunk.Chunk<IA>,
  MsgPackError | ParseError | OutErr,
  InErr,
  void,
  unknown,
  R | IR | OR
> => {
  const pack = packSchema(options.inputSchema)
  const unpack = unpackSchema(options.outputSchema)
  return pipe(
    pack<InErr>(),
    Channel.pipeTo(self),
    Channel.pipeTo(unpack())
  )
})
