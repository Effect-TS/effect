/**
 * Reads and writes the Arrow IPC formats: the stream format
 * (`application/vnd.apache.arrow.stream`) and the file format
 * (`application/vnd.apache.arrow.file`, also known as Feather v2).
 *
 * **Mental model**
 *
 * - A stream is a schema message, then dictionary and record batch messages,
 *   then an end-of-stream marker. A file wraps the same messages in `ARROW1`
 *   magic bytes and adds a footer that indexes them.
 * - Decoding returns a {@link ArrowTable.Table} whose buffers are views into
 *   the input bytes; nothing is copied. Keep the input alive while you use the
 *   table, and don't mutate it.
 * - Decoding validates the input fully (offsets, indices, views, buffer
 *   sizes), so any slot of the result can be read safely.
 *
 * **Gotchas**
 *
 * - Big-endian data and compressed bodies (LZ4 frame, ZSTD) are rejected with
 *   an {@link ArrowIpcError} whose `kind` says so.
 * - Writing requires unsliced data (`offset` 0) for now.
 * - {@link decode} and {@link encode} stream the stream format; the file
 *   format needs its footer, so it is read and written whole.
 *
 * **Example** (Writing and reading a stream)
 *
 * ```ts import.meta.vitest
 * import { ArrowIpc, ArrowSchema, ArrowTable } from "effect/arrow"
 * import { Result } from "effect"
 *
 * const schema = ArrowSchema.make([ArrowSchema.field("id", ArrowSchema.int32)])
 * const table = Result.getOrThrow(ArrowTable.fromRows(schema, [{ id: 1 }, { id: 2 }]))
 *
 * const bytes = Result.getOrThrow(ArrowIpc.encodeStream(table))
 * const decoded = Result.getOrThrow(ArrowIpc.decodeStream(bytes))
 *
 * ArrowTable.toRows(decoded) // => [{ id: 1 }, { id: 2 }]
 * ```
 *
 * @stability experimental
 * @since 4.1.5
 */
import * as Arr from "../Array.ts"
import * as Cause from "../Cause.ts"
import * as Channel from "../Channel.ts"
import * as Data from "../Data.ts"
import * as Effect from "../Effect.ts"
import * as Predicate from "../Predicate.ts"
import * as Pull from "../Pull.ts"
import * as Result from "../Result.ts"
import type * as ArrowSchema from "./ArrowSchema.ts"
import type * as ArrowTable from "./ArrowTable.ts"
import * as internal from "./internal/ipc.ts"

const ArrowIpcErrorTypeId = "~effect/arrow/ArrowIpc/ArrowIpcError"

/**
 * The error returned when IPC input cannot be decoded or a table cannot be
 * encoded.
 *
 * **Details**
 *
 * The `kind` field identifies the failure:
 *
 * - `Invalid`: the bytes are not valid Arrow IPC.
 * - `BigEndian`: the data is big-endian, which is not supported.
 * - `Compression`: record batch bodies are compressed, which is not supported.
 * - `Unsupported`: valid input or data that uses a feature this
 *   implementation lacks.
 *
 * **Example** (Rejecting bytes that are not Arrow)
 *
 * ```ts import.meta.vitest
 * import { ArrowIpc } from "effect/arrow"
 * import { Result } from "effect"
 *
 * const result = ArrowIpc.decodeFile(new Uint8Array([1, 2, 3]))
 *
 * Result.isFailure(result) && result.failure.kind // => "Invalid"
 * ```
 *
 * @stability experimental
 * @category errors
 * @since 4.1.5
 */
export class ArrowIpcError extends Data.TaggedError("ArrowIpcError")<{
  readonly kind: "Invalid" | "BigEndian" | "Compression" | "Unsupported"
  readonly message: string
}> {
  /**
   * Marks this value as an `ArrowIpcError` for {@link isArrowIpcError}.
   *
   * @since 4.1.5
   */
  readonly [ArrowIpcErrorTypeId] = ArrowIpcErrorTypeId
}

/**
 * Returns `true` when the value is an {@link ArrowIpcError}.
 *
 * @stability experimental
 * @category guards
 * @since 4.1.5
 */
export const isArrowIpcError = (u: unknown): u is ArrowIpcError => Predicate.hasProperty(u, ArrowIpcErrorTypeId)

const toError = (e: internal.IpcFailure) => new ArrowIpcError({ kind: e.kind, message: e.message })

const run = <A>(f: () => A): Result.Result<A, ArrowIpcError> => {
  try {
    return Result.succeed(f())
  } catch (e) {
    if (e instanceof internal.IpcFailure) {
      return Result.fail(toError(e))
    }
    throw e
  }
}

/**
 * Decodes the IPC stream format.
 *
 * @stability experimental
 * @category decoding
 * @since 4.1.5
 */
export const decodeStream = (bytes: Uint8Array): Result.Result<ArrowTable.Table, ArrowIpcError> =>
  run(() => internal.decodeStream(bytes))

/**
 * Decodes the IPC file format.
 *
 * @stability experimental
 * @category decoding
 * @since 4.1.5
 */
export const decodeFile = (bytes: Uint8Array): Result.Result<ArrowTable.Table, ArrowIpcError> =>
  run(() => internal.decodeFile(bytes))

/**
 * Encodes a table in the IPC stream format. Dictionaries are written before
 * the first batch that uses them, and again whenever a batch uses a different
 * dictionary for the same id.
 *
 * @stability experimental
 * @category encoding
 * @since 4.1.5
 */
export const encodeStream = (table: ArrowTable.Table): Result.Result<Uint8Array, ArrowIpcError> =>
  run(() => internal.encodeStream(table))

/**
 * Encodes a table in the IPC file format. Every batch must use the same
 * dictionary per id, since the file format cannot replace dictionaries.
 *
 * @stability experimental
 * @category encoding
 * @since 4.1.5
 */
export const encodeFile = (table: ArrowTable.Table): Result.Result<Uint8Array, ArrowIpcError> =>
  run(() => internal.encodeFile(table))

/** Runs `f`, turning IPC failures into a failed effect. */
const attempt = <A>(f: () => A): Effect.Effect<A, ArrowIpcError> => {
  try {
    return Effect.succeed(f())
  } catch (e) {
    return e instanceof internal.IpcFailure ? Effect.fail(toError(e)) : Effect.die(e)
  }
}

/**
 * Creates a channel that decodes the IPC stream format from byte chunks into
 * record batches.
 *
 * **Details**
 *
 * Messages may span chunks and chunks may hold many messages; each record
 * batch is emitted as soon as it is complete. A message that lies within one
 * chunk is read in place, without copying, so keep the chunks alive while
 * using the batches. Every batch carries the stream's schema.
 *
 * The channel fails with an {@link ArrowIpcError} for invalid input, and with
 * kind `"Invalid"` when the input ends inside a message or holds no schema.
 * Bytes after the end-of-stream marker are ignored.
 *
 * **Example** (Decoding a stream from chunks)
 *
 * ```ts import.meta.vitest
 * import { ArrowIpc, ArrowSchema, ArrowTable } from "effect/arrow"
 * import { Effect, Result, Stream } from "effect"
 *
 * const schema = ArrowSchema.make([ArrowSchema.field("id", ArrowSchema.int32)])
 * const bytes = Result.getOrThrow(ArrowIpc.encodeStream(Result.getOrThrow(ArrowTable.fromRows(schema, [{ id: 1 }]))))
 *
 * const program = Stream.make(bytes.subarray(0, 100), bytes.subarray(100)).pipe(
 *   Stream.pipeThroughChannel(ArrowIpc.decode()),
 *   Stream.map((batch) => batch.length),
 *   Stream.runCollect
 * )
 *
 * Effect.runSync(program) // => [1]
 * ```
 *
 * @stability experimental
 * @category decoding
 * @since 4.1.5
 */
export const decode = <IE = never, Done = unknown>(): Channel.Channel<
  Arr.NonEmptyReadonlyArray<ArrowTable.RecordBatch>,
  ArrowIpcError | IE,
  Done,
  Arr.NonEmptyReadonlyArray<Uint8Array>,
  IE,
  Done
> =>
  Channel.fromTransform((upstream, _scope) =>
    Effect.sync(() => {
      const decoder = new internal.StreamDecoder()
      let done: { readonly leftover: Done } | undefined
      const pull: Pull.Pull<Arr.NonEmptyReadonlyArray<ArrowTable.RecordBatch>, ArrowIpcError | IE, Done> = Effect
        .suspend(() => {
          if (done !== undefined) return Cause.done(done.leftover)
          return Pull.matchEffect(upstream, {
            onSuccess: (chunks) =>
              Effect.flatMap(
                attempt(() => {
                  const out: Array<ArrowTable.RecordBatch> = []
                  for (const chunk of chunks) {
                    decoder.push(chunk)
                    decoder.drain(out)
                  }
                  return out
                }),
                (out) => Arr.isArrayNonEmpty(out) ? Effect.succeed(out) : pull
              ),
            onFailure: Effect.failCause,
            onDone: (leftover) => {
              done = { leftover }
              return Effect.flatMap(attempt(() => decoder.finish()), () => Cause.done(leftover))
            }
          })
        })
      return pull
    })
  )

/**
 * Creates a channel that encodes record batches of `schema` in the IPC stream
 * format.
 *
 * **Details**
 *
 * The schema message comes first, then each batch with the dictionaries it
 * needs, then the end-of-stream marker when the input ends, so an empty input
 * still yields a valid stream. Output chunks are the framed message headers
 * and views of the batches' own buffers: nothing is copied, which suits
 * writers that take several buffers at once (sockets, files). Concatenate the
 * chunks for one contiguous buffer.
 *
 * **Example** (Encoding batches into chunks)
 *
 * ```ts import.meta.vitest
 * import { ArrowIpc, ArrowSchema, ArrowTable } from "effect/arrow"
 * import { Effect, Result, Stream } from "effect"
 *
 * const schema = ArrowSchema.make([ArrowSchema.field("id", ArrowSchema.int32)])
 * const table = Result.getOrThrow(ArrowTable.fromRows(schema, [{ id: 1 }, { id: 2 }], { batchSize: 1 }))
 *
 * const program = Stream.fromIterable(table.batches).pipe(
 *   Stream.pipeThroughChannel(ArrowIpc.encode(schema)),
 *   Stream.pipeThroughChannel(ArrowIpc.decode()),
 *   Stream.runCollect
 * )
 *
 * Effect.runSync(program).length // => 2
 * ```
 *
 * @stability experimental
 * @category encoding
 * @since 4.1.5
 */
export const encode = <IE = never, Done = unknown>(schema: ArrowSchema.Schema): Channel.Channel<
  Arr.NonEmptyReadonlyArray<Uint8Array>,
  ArrowIpcError | IE,
  Done,
  Arr.NonEmptyReadonlyArray<ArrowTable.RecordBatch>,
  IE,
  Done
> =>
  Channel.fromTransform((upstream, _scope) =>
    Effect.sync(() => {
      const encoder = new internal.StreamEncoder(schema)
      let done: { readonly leftover: Done } | undefined
      type Out = Arr.NonEmptyReadonlyArray<Uint8Array>
      const pull: Pull.Pull<Out, ArrowIpcError | IE, Done> = Effect.suspend(
        (): Pull.Pull<Out, ArrowIpcError | IE, Done> => {
          if (done !== undefined) return Cause.done(done.leftover)
          return Pull.matchEffect(upstream, {
            // Every write emits at least the batch message, so `out` is never empty.
            onSuccess: (batches) =>
              attempt(() => {
                const out: Array<Uint8Array> = []
                for (const batch of batches) encoder.write(batch, out)
                return out as unknown as Out
              }),
            onFailure: Effect.failCause,
            onDone: (leftover) => {
              done = { leftover }
              const out: Array<Uint8Array> = []
              encoder.end(out)
              return Effect.succeed(out as unknown as Out)
            }
          })
        }
      )
      return pull
    })
  )
