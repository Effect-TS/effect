/**
 * @since 1.0.0
 */
import type * as Cause from "effect/Cause"
import * as Channel from "effect/Channel"
import * as Chunk from "effect/Chunk"
import * as Effect from "effect/Effect"
import { dual, identity } from "effect/Function"
import type { ParseError } from "effect/ParseResult"
import type * as Schema from "effect/Schema"
import * as ChannelSchema from "./ChannelSchema.js"
import { TypeIdError } from "./Error.js"

/**
 * @since 1.0.0
 * @category type ids
 */
export const ErrorTypeId: unique symbol = Symbol.for("@effect/platform/Ndjson/NdjsonError")

/**
 * @since 1.0.0
 * @category type ids
 */
export type NdjsonErrorTypeId = typeof ErrorTypeId

const encoder = new TextEncoder()

/**
 * @since 1.0.0
 * @category errors
 */
export class NdjsonError extends TypeIdError(ErrorTypeId, "NdjsonError")<{
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

/**
 * @since 1.0.0
 * @category constructors
 */
export const packString = <IE = never, Done = unknown>(): Channel.Channel<
  Chunk.Chunk<string>,
  Chunk.Chunk<unknown>,
  IE | NdjsonError,
  IE,
  Done,
  Done
> => {
  const loop: Channel.Channel<
    Chunk.Chunk<string>,
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
            try: () => Chunk.of(Chunk.toReadonlyArray(input).map((_) => JSON.stringify(_)).join("\n") + "\n"),
            catch: (cause) => new NdjsonError({ reason: "Pack", cause })
          }),
          Channel.write
        ),
        loop
      ),
    onFailure: Channel.failCause,
    onDone: Channel.succeed
  })
  return loop
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
> => Channel.mapOut(packString(), Chunk.map((_) => encoder.encode(_)))

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
export const packSchemaString = <A, I, R>(
  schema: Schema.Schema<A, I, R>
) =>
<IE = never, Done = unknown>(): Channel.Channel<
  Chunk.Chunk<string>,
  Chunk.Chunk<A>,
  IE | NdjsonError | ParseError,
  IE,
  Done,
  Done,
  R
> => Channel.pipeTo(ChannelSchema.encode(schema)(), packString())

const filterEmpty = Chunk.filter<string>((line) => line.length > 0)
const filterEmptyChannel = <IE, Done>() => {
  const loop: Channel.Channel<
    Chunk.Chunk<string>,
    Chunk.Chunk<string>,
    IE,
    IE,
    Done,
    Done,
    never
  > = Channel.readWithCause({
    onInput(input: Chunk.Chunk<string>) {
      const filtered = filterEmpty(input)
      return Channel.zipRight(Chunk.isEmpty(filtered) ? Channel.void : Channel.write(filtered), loop)
    },
    onFailure(cause: Cause.Cause<IE>) {
      return Channel.failCause(cause)
    },
    onDone(done: Done) {
      return Channel.succeed(done)
    }
  })
  return loop
}

/**
 * @since 1.0.0
 * @category constructors
 */
export const unpackString = <IE = never, Done = unknown>(options?: NdjsonOptions): Channel.Channel<
  Chunk.Chunk<unknown>,
  Chunk.Chunk<string>,
  IE | NdjsonError,
  IE,
  Done,
  Done
> => {
  const lines = Channel.splitLines<IE, Done>().pipe(
    options?.ignoreEmptyLines === true ?
      Channel.pipeTo(filterEmptyChannel()) :
      identity
  )
  return Channel.mapOutEffect(lines, (chunk) =>
    Effect.try({
      try: () => Chunk.map(chunk, (_) => JSON.parse(_)),
      catch: (cause) => new NdjsonError({ reason: "Unpack", cause })
    }))
}

const decodeString = <IE, Done>() => {
  const decoder = new TextDecoder()
  const loop: Channel.Channel<
    Chunk.Chunk<string>,
    Chunk.Chunk<Uint8Array>,
    IE,
    IE,
    Done,
    Done,
    never
  > = Channel.readWithCause({
    onInput: (input) =>
      Channel.zipRight(
        Channel.write(Chunk.map(input, (_) => decoder.decode(_))),
        loop
      ),
    onFailure: Channel.failCause,
    onDone: Channel.succeed
  })
  return loop
}

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
> => {
  return Channel.pipeTo(decodeString(), unpackString(options))
}

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
> => Channel.pipeTo(unpack(options), ChannelSchema.decodeUnknown(schema)())

/**
 * @since 1.0.0
 * @category constructors
 */
export const unpackSchemaString = <A, I, R>(
  schema: Schema.Schema<A, I, R>
) =>
<IE = never, Done = unknown>(options?: NdjsonOptions): Channel.Channel<
  Chunk.Chunk<A>,
  Chunk.Chunk<string>,
  NdjsonError | ParseError | IE,
  IE,
  Done,
  Done,
  R
> => Channel.pipeTo(unpackString(options), ChannelSchema.decodeUnknown(schema)())

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
export const duplexString: {
  (options?: NdjsonOptions): <R, IE, OE, OutDone, InDone>(
    self: Channel.Channel<Chunk.Chunk<string>, Chunk.Chunk<string>, OE, IE | NdjsonError, OutDone, InDone, R>
  ) => Channel.Channel<Chunk.Chunk<unknown>, Chunk.Chunk<unknown>, NdjsonError | OE, IE, OutDone, InDone, R>
  <R, IE, OE, OutDone, InDone>(
    self: Channel.Channel<Chunk.Chunk<string>, Chunk.Chunk<string>, OE, IE | NdjsonError, OutDone, InDone, R>,
    options?: NdjsonOptions
  ): Channel.Channel<Chunk.Chunk<unknown>, Chunk.Chunk<unknown>, NdjsonError | OE, IE, OutDone, InDone, R>
} = dual((args) => Channel.isChannel(args[0]), <R, IE, OE, OutDone, InDone>(
  self: Channel.Channel<Chunk.Chunk<string>, Chunk.Chunk<string>, OE, IE | NdjsonError, OutDone, InDone, R>,
  options?: NdjsonOptions
): Channel.Channel<Chunk.Chunk<unknown>, Chunk.Chunk<unknown>, NdjsonError | OE, IE, OutDone, InDone, R> =>
  Channel.pipeTo(
    Channel.pipeTo(packString(), self),
    unpackString(options)
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
> => ChannelSchema.duplexUnknown(duplex(self, options), options))

/**
 * @since 1.0.0
 * @category combinators
 */
export const duplexSchemaString: {
  <IA, II, IR, OA, OI, OR>(
    options: Partial<NdjsonOptions> & {
      readonly inputSchema: Schema.Schema<IA, II, IR>
      readonly outputSchema: Schema.Schema<OA, OI, OR>
    }
  ): <R, InErr, OutErr, OutDone, InDone>(
    self: Channel.Channel<
      Chunk.Chunk<string>,
      Chunk.Chunk<string>,
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
      Chunk.Chunk<string>,
      Chunk.Chunk<string>,
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
    Chunk.Chunk<string>,
    Chunk.Chunk<string>,
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
> => ChannelSchema.duplexUnknown(duplexString(self, options), options))
