/**
 * @since 1.0.0
 */
import type * as Cause from "effect/Cause"
import * as Channel from "effect/Channel"
import type * as Chunk from "effect/Chunk"
import { dual, pipe } from "effect/Function"
import type { ParseError } from "effect/ParseResult"
import * as Schema from "effect/Schema"

/**
 * @since 1.0.0
 * @category constructors
 */
export const encode = <A, I, R>(
  schema: Schema.Schema<A, I, R>
) =>
<IE = never, Done = unknown>(): Channel.Channel<
  Chunk.Chunk<I>,
  Chunk.Chunk<A>,
  IE | ParseError,
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
  return loop
}

/**
 * @since 1.0.0
 * @category constructors
 */
export const encodeUnknown: <A, I, R>(
  schema: Schema.Schema<A, I, R>
) => <IE = never, Done = unknown>() => Channel.Channel<
  Chunk.Chunk<unknown>,
  Chunk.Chunk<A>,
  IE | ParseError,
  IE,
  Done,
  Done,
  R
> = encode as any

/**
 * @since 1.0.0
 * @category constructors
 */
export const decode = <A, I, R>(
  schema: Schema.Schema<A, I, R>
) =>
<IE = never, Done = unknown>(): Channel.Channel<
  Chunk.Chunk<A>,
  Chunk.Chunk<I>,
  ParseError | IE,
  IE,
  Done,
  Done,
  R
> => {
  const decode = Schema.decode(Schema.ChunkFromSelf(schema))
  const loop: Channel.Channel<Chunk.Chunk<A>, Chunk.Chunk<I>, ParseError | IE, IE, Done, Done, R> = Channel
    .readWithCause({
      onInput(chunk: Chunk.Chunk<I>) {
        return decode(chunk).pipe(
          Channel.flatMap(Channel.write),
          Channel.zipRight(loop)
        )
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
export const decodeUnknown: <A, I, R>(
  schema: Schema.Schema<A, I, R>
) => <IE = never, Done = unknown>() => Channel.Channel<
  Chunk.Chunk<A>,
  Chunk.Chunk<any>,
  ParseError | IE,
  IE,
  Done,
  Done,
  R
> = decode as any

/**
 * @since 1.0.0
 * @category combinators
 */
export const duplex: {
  <IA, II, IR, OA, OI, OR>(options: {
    readonly inputSchema: Schema.Schema<IA, II, IR>
    readonly outputSchema: Schema.Schema<OA, OI, OR>
  }): <R, InErr, OutErr, OutDone, InDone>(
    self: Channel.Channel<
      Chunk.Chunk<OI>,
      Chunk.Chunk<II>,
      OutErr,
      ParseError | InErr,
      OutDone,
      InDone,
      R
    >
  ) => Channel.Channel<
    Chunk.Chunk<OA>,
    Chunk.Chunk<IA>,
    ParseError | OutErr,
    InErr,
    OutDone,
    InDone,
    R | IR | OR
  >
  <R, InErr, OutErr, OutDone, InDone, IA, II, IR, OA, OI, OR>(
    self: Channel.Channel<
      Chunk.Chunk<OI>,
      Chunk.Chunk<II>,
      OutErr,
      ParseError | InErr,
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
    ParseError | OutErr,
    InErr,
    OutDone,
    InDone,
    R | IR | OR
  >
} = dual(2, <R, InErr, OutErr, OutDone, InDone, IA, II, IR, OA, OI, OR>(
  self: Channel.Channel<
    Chunk.Chunk<OI>,
    Chunk.Chunk<II>,
    OutErr,
    ParseError | InErr,
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
  ParseError | OutErr,
  InErr,
  OutDone,
  InDone,
  R | IR | OR
> => {
  const decode = Schema.decode(Schema.ChunkFromSelf(options.outputSchema))
  return pipe(
    encode(options.inputSchema)<InErr, InDone>(),
    Channel.pipeTo(self),
    Channel.mapOutEffect(decode)
  )
})

/**
 * @since 1.0.0
 * @category combinators
 */
export const duplexUnknown: {
  <IA, II, IR, OA, OI, OR>(options: {
    readonly inputSchema: Schema.Schema<IA, II, IR>
    readonly outputSchema: Schema.Schema<OA, OI, OR>
  }): <R, InErr, OutErr, OutDone, InDone>(
    self: Channel.Channel<
      Chunk.Chunk<unknown>,
      Chunk.Chunk<any>,
      OutErr,
      ParseError | InErr,
      OutDone,
      InDone,
      R
    >
  ) => Channel.Channel<
    Chunk.Chunk<OA>,
    Chunk.Chunk<IA>,
    ParseError | OutErr,
    InErr,
    OutDone,
    InDone,
    R | IR | OR
  >
  <R, InErr, OutErr, OutDone, InDone, IA, II, IR, OA, OI, OR>(
    self: Channel.Channel<
      Chunk.Chunk<unknown>,
      Chunk.Chunk<any>,
      OutErr,
      ParseError | InErr,
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
    ParseError | OutErr,
    InErr,
    OutDone,
    InDone,
    R | IR | OR
  >
} = duplex as any
