/**
 * @since 1.0.0
 */
import { TypeIdError } from "@effect/platform/Error"
import type { ParseError } from "@effect/schema/ParseResult"
import * as Schema from "@effect/schema/Schema"
import type * as Cause from "effect/Cause"
import * as Channel from "effect/Channel"
import * as Chunk from "effect/Chunk"
import * as Effect from "effect/Effect"
import { constTrue, dual, pipe } from "effect/Function"
import * as ChannelSchema from "./ChannelSchema.js"

/**
 * @since 1.0.0
 * @category type ids
 */
export const NdjsonErrorTypeId: unique symbol = Symbol.for("@effect/experimental/Ndjson/NdjsonError")

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
export class NdjsonError extends TypeIdError(NdjsonErrorTypeId, "NdjsonError")<{
  readonly reason: "Pack" | "Unpack"
  readonly cause: unknown
}> {
  get message() {
    return this.reason
  }
}

/**
 * Represents a set of options which can be used to control how the newline
 * delimited JSON is handled.
 *
 * @since 1.0.0
 * @category models
 */
export interface NdjsonOptions {
  /**
   * Whether or not the newline delimited JSON parser should ignore empty lines.
   *
   * Defaults to `false`.
   *
   * From the [newline delimited JSON spec](https://github.com/ndjson/ndjson-spec):
   * ```text
   * The parser MAY silently ignore empty lines, e.g. \n\n. This behavior MUST
   * be documented and SHOULD be configurable by the user of the parser.
   * ```
   *
   * @since 1.0.0
   */
  readonly ignoreEmptyLines?: boolean
}

const defaultOptions: NdjsonOptions = {
  ignoreEmptyLines: false
}

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
            catch: (cause) => new NdjsonError({ reason: "Pack", cause })
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
> => Channel.pipeTo(ChannelSchema.encode(schema)(), pack())

/**
 * @since 1.0.0
 * @category constructors
 */
export const unpack = <IE = never, Done = unknown>(options?: NdjsonOptions): Channel.Channel<
  Chunk.Chunk<unknown>,
  Chunk.Chunk<Uint8Array>,
  IE | NdjsonError,
  IE,
  Done,
  Done
> =>
  Channel.suspend(() => {
    const opts = { ...defaultOptions, ...options }
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
    const filter = opts.ignoreEmptyLines ? (line: string) => line.length > 0 : constTrue
    return Channel.mapOutEffect(Channel.pipeTo(loop, Channel.splitLines()), (chunk) =>
      Effect.try({
        try: () => chunk.pipe(Chunk.filter(filter), Chunk.map((_) => JSON.parse(_))),
        catch: (cause) => new NdjsonError({ reason: "Unpack", cause })
      }))
  })

/**
 * @since 1.0.0
 * @category constructors
 */
export const unpackSchema = <A, I, R>(
  schema: Schema.Schema<A, I, R>
) =>
<IE = never, Done = unknown>(options?: NdjsonOptions): Channel.Channel<
  Chunk.Chunk<A>,
  Chunk.Chunk<Uint8Array>,
  NdjsonError | ParseError | IE,
  IE,
  Done,
  Done,
  R
> => {
  const parse = Schema.decodeUnknown(Schema.ChunkFromSelf(schema))
  return Channel.mapOutEffect(unpack<IE, Done>(options), parse)
}

/**
 * @since 1.0.0
 * @category combinators
 */
export const duplex: {
  (options?: NdjsonOptions): <R, IE, OE, OutDone, InDone>(
    self: Channel.Channel<Chunk.Chunk<Uint8Array>, Chunk.Chunk<Uint8Array>, OE, IE | NdjsonError, OutDone, InDone, R>
  ) => Channel.Channel<Chunk.Chunk<unknown>, Chunk.Chunk<unknown>, NdjsonError | OE, IE, OutDone, InDone, R>
  <R, IE, OE, OutDone, InDone>(
    self: Channel.Channel<Chunk.Chunk<Uint8Array>, Chunk.Chunk<Uint8Array>, OE, IE | NdjsonError, OutDone, InDone, R>,
    options?: NdjsonOptions
  ): Channel.Channel<Chunk.Chunk<unknown>, Chunk.Chunk<unknown>, NdjsonError | OE, IE, OutDone, InDone, R>
} = dual((args) => Channel.isChannel(args[0]), <R, IE, OE, OutDone, InDone>(
  self: Channel.Channel<Chunk.Chunk<Uint8Array>, Chunk.Chunk<Uint8Array>, OE, IE | NdjsonError, OutDone, InDone, R>,
  options?: NdjsonOptions
): Channel.Channel<Chunk.Chunk<unknown>, Chunk.Chunk<unknown>, NdjsonError | OE, IE, OutDone, InDone, R> =>
  Channel.pipeTo(
    Channel.pipeTo(pack(), self),
    unpack(options)
  ))

/**
 * @since 1.0.0
 * @category combinators
 */
export const duplexSchema: {
  <IA, II, IR, OA, OI, OR>(
    options: Partial<NdjsonOptions> & {
      readonly inputSchema: Schema.Schema<IA, II, IR>
      readonly outputSchema: Schema.Schema<OA, OI, OR>
    }
  ): <R, InErr, OutErr, OutDone, InDone>(
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
  >
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
    options: Partial<NdjsonOptions> & {
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
  >
} = dual(2, <R, InErr, OutErr, OutDone, InDone, IA, II, IR, OA, OI, OR>(
  self: Channel.Channel<
    Chunk.Chunk<Uint8Array>,
    Chunk.Chunk<Uint8Array>,
    OutErr,
    NdjsonError | ParseError | InErr,
    OutDone,
    InDone,
    R
  >,
  options: Partial<NdjsonOptions> & {
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
  const { inputSchema, outputSchema, ...opts } = options
  const pack = packSchema(inputSchema)
  const unpack = unpackSchema(outputSchema)
  return pipe(
    pack<InErr, InDone>(),
    Channel.pipeTo(self),
    Channel.pipeTo(unpack(opts))
  )
})
