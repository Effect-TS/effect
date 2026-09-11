/**
 * Reading the reply to a command.
 *
 * These readers are programs over a stream of packets and nothing else: they
 * hold no connection, so they can be driven by a socket or by packets written
 * by hand, which is what makes them testable without a server.
 *
 * The row shape is a type parameter rather than a mode flag, so the reader
 * that builds row objects and the one that builds value arrays are the same
 * program read twice.
 *
 * @internal
 */
import * as Data from "effect/Data"
import * as Effect from "effect/Effect"
import * as Match from "effect/Match"
import * as Queue from "effect/Queue"
import * as EffectResult from "effect/Result"
import { SqlError } from "effect/unstable/sql/SqlError"
import * as MysqlProtocol from "../MysqlProtocol.ts"
import * as MysqlTypes from "../MysqlTypes.ts"
import { classifyErr, queryError } from "./sqlError.ts"

export interface Prepared {
  readonly statementId: number
  readonly parameterCount: number
}

export type RowDecoder = (
  columns: ReadonlyArray<MysqlProtocol.Column>
) => (payload: Uint8Array) => EffectResult.Result<Array<unknown>, MysqlProtocol.ParseError>

export const textRows = (options: MysqlTypes.DecodeOptions): RowDecoder => (columns) => {
  const readField = MysqlTypes.makeTextFieldReader(columns, options)
  return (payload) => MysqlProtocol.decodeTextRow(payload, columns.length, readField)
}

export const binaryRows = (options: MysqlTypes.DecodeOptions): RowDecoder => (columns) => {
  const readField = MysqlTypes.makeBinaryFieldReader(columns, options)
  return (payload) => MysqlProtocol.decodeBinaryRow(payload, columns.length, readField)
}

/**
 * Reads the packets of the reply currently in flight.
 *
 * `one` is for the parts of a reply that are a fixed sequence, where reading
 * it as a program is worth a step per packet. `chunk` is for the parts that
 * repeat per row, where it is not: a socket chunk carries many rows, and
 * crossing the Effect runtime for each of them costs more than decoding it.
 */
export interface PacketReader {
  /** The next packet, waiting for one if the buffer is empty. */
  readonly one: Effect.Effect<MysqlProtocol.Packet, SqlError>
  /**
   * The next packet already in hand, or `undefined` when the buffer is spent.
   *
   * A row loop reads through this so that a reply costs one trip through the
   * Effect runtime per socket chunk rather than per row, without the reader
   * losing track of where the caller got to: a caller that stops in the middle
   * of a chunk leaves the rest of it readable.
   */
  readonly buffered: () => MysqlProtocol.Packet | undefined
  /** Waits for more packets, once `buffered` has run out. */
  readonly refill: Effect.Effect<void, SqlError>
}

/** Kept for the readers that take a reply one packet at a time. */
export type Take = Effect.Effect<MysqlProtocol.Packet, SqlError>

export const makeReader = (queue: Queue.Dequeue<MysqlProtocol.Packet, SqlError>): PacketReader => {
  let batch: ReadonlyArray<MysqlProtocol.Packet> = []
  let index = 0
  return {
    one: Effect.suspend(() => {
      if (index < batch.length) return Effect.succeed(batch[index++])
      return Effect.map(Queue.takeAll(queue), (next) => {
        batch = next
        index = 1
        return next[0]
      })
    }),
    buffered: () => index < batch.length ? batch[index++] : undefined,
    refill: Effect.map(Queue.takeAll(queue), (next) => {
      batch = next
      index = 0
    })
  }
}

/** Lifts a decode result into the command, failing it on malformed bytes. */
export const decodedAs = <A>(
  result: EffectResult.Result<A, MysqlProtocol.ParseError>,
  message: string,
  operation: string
): Effect.Effect<A, SqlError> =>
  EffectResult.isSuccess(result)
    ? Effect.succeed(result.success)
    : Effect.fail(queryError(result.failure, message, operation))

/** Takes a packet and decodes it. */
export const take = <A>(
  from: Take,
  decode: (payload: Uint8Array) => EffectResult.Result<A, MysqlProtocol.ParseError>,
  message: string,
  operation: string
): Effect.Effect<A, SqlError> => Effect.flatMap(from, (packet) => decodedAs(decode(packet.payload), message, operation))

const serverError = (error: MysqlProtocol.Err, message: string, operation: string): SqlError =>
  new SqlError({ reason: classifyErr(error, message, operation) })

/**
 * A finished statement, in whatever shape its rows were built.
 *
 * The shape is a type parameter rather than a mode flag, so a reader that
 * builds arrays and one that builds row objects are the same program read
 * twice, and neither has to widen its rows to `any`.
 *
 * Which of the two a statement produced is carried rather than inferred. The
 * reply reader knows it from the response packet, and a consumer that has to
 * work it out again from an empty column list is reconstructing something
 * that was already certain.
 */
export type Completed<A> = Data.TaggedEnum<{
  readonly ResultSet: {
    readonly rows: ReadonlyArray<A>
    readonly columns: ReadonlyArray<MysqlProtocol.Column>
    readonly ok: MysqlProtocol.Ok
  }
  readonly Ok: {
    readonly ok: MysqlProtocol.Ok
  }
}>

/** @internal */
export interface CompletedDefinition extends Data.TaggedEnum.WithGenerics<1> {
  readonly taggedEnum: Completed<this["A"]>
}

/** @internal */
export const Completed = Data.taggedEnum<CompletedDefinition>()

/** Builds one row from its column-ordered values. */
export type BuildRow<A> = (columns: ReadonlyArray<MysqlProtocol.Column>, values: ReadonlyArray<unknown>) => A

export const readPrepared = Effect.fnUntraced(function*(from: Take): Effect.fn.Return<Prepared, SqlError> {
  const packet = yield* from
  if (packet.payload.length > 0 && packet.payload[0] === 0xff) {
    const error = yield* take(
      Effect.succeed(packet),
      MysqlProtocol.decodeErr,
      "MysqlConnection: Failed to read an error response",
      "prepare"
    )
    return yield* Effect.fail(serverError(error, "MysqlConnection: Failed to prepare statement", "prepare"))
  }
  const ok = yield* decodedAs(
    MysqlProtocol.decodeStmtPrepareOk(packet.payload),
    "MysqlConnection: Failed to read a prepare response",
    "prepare"
  )
  const definitions = ok.parameterCount + ok.columnCount
  for (let index = 0; index < definitions; index++) yield* from
  return { statementId: ok.statementId, parameterCount: ok.parameterCount }
})

/** Reads a result set, from its column definitions to its terminator. */
const readResultSet = Effect.fnUntraced(function*<A>(
  reader: PacketReader,
  columnCount: number,
  rowDecoder: RowDecoder,
  buildRow: BuildRow<A>
): Effect.fn.Return<Completed<A>, SqlError> {
  const columns = yield* readColumns(reader.one, columnCount, "execute")
  // The columns are known from here on, so the decoder and the rows it
  // produces cannot be reached before they exist.
  const decodeRow = rowDecoder(columns)
  const rows: Array<A> = []
  // A value this client cannot read is the statement's problem, not the
  // session's, so the rest of the reply is still read before failing.
  // Abandoning it here would desync the next command instead.
  let undecodable: SqlError | undefined
  while (true) {
    const packet = reader.buffered()
    if (packet === undefined) {
      yield* reader.refill
      continue
    }
    const next = yield* decodedAs(
      MysqlProtocol.decodeRow(packet.payload),
      "MysqlConnection: Failed to read a row",
      "execute"
    )
    if (MysqlProtocol.RowPacket.$is("End")(next)) {
      if (undecodable !== undefined) return yield* Effect.fail(undecodable)
      return Completed.ResultSet({ rows, columns, ok: next.ok })
    }
    if (MysqlProtocol.RowPacket.$is("Error")(next)) {
      return yield* Effect.fail(serverError(next.error, "MysqlConnection: Failed to execute statement", "execute"))
    }
    if (undecodable !== undefined) continue
    const values = decodeRow(next.payload)
    if (EffectResult.isFailure(values)) {
      undecodable = queryError(values.failure, "MysqlConnection: Failed to read a row", "execute")
      continue
    }
    rows.push(buildRow(columns, values.success))
  }
})

/**
 * Reads a command's reply: one entry per statement, in order.
 */
export const readReply = Effect.fnUntraced(function*<A>(
  reader: PacketReader,
  rowDecoder: RowDecoder,
  buildRow: BuildRow<A>
): Effect.fn.Return<ReadonlyArray<Completed<A>>, SqlError> {
  const statements: Array<Completed<A>> = []
  while (true) {
    const response = yield* take(
      reader.one,
      MysqlProtocol.decodeResponse,
      "MysqlConnection: Failed to read a response",
      "execute"
    )
    const finished = yield* Match.value(response).pipe(
      Match.tagsExhaustive({
        Ok: ({ ok }): Effect.Effect<Completed<A>, SqlError> => Effect.succeed(Completed.Ok({ ok })),
        Error: ({ error }) =>
          Effect.fail(serverError(error, "MysqlConnection: Failed to execute statement", "execute")),
        LocalInfile: () => Effect.fail(localInfileRefused("execute")),
        ResultSet: ({ columnCount }) => readResultSet(reader, columnCount, rowDecoder, buildRow)
      })
    )
    statements.push(finished)
    if (
      !MysqlProtocol.ServerStatus.has(finished.ok.statusFlags, MysqlProtocol.ServerStatusFlag.moreResultsExists)
    ) {
      return statements
    }
  }
})

export const readAcknowledgement = (from: Take, message: string, operation: string): Effect.Effect<void, SqlError> =>
  Effect.flatMap(
    take(from, MysqlProtocol.decodeResponse, message, operation),
    (response) =>
      MysqlProtocol.Response.$is("Error")(response)
        ? Effect.fail(serverError(response.error, message, operation))
        : Effect.void
  )

const readColumns = Effect.fnUntraced(function*(
  from: Take,
  columnCount: number,
  operation: string
): Effect.fn.Return<Array<MysqlProtocol.Column>, SqlError> {
  const columns: Array<MysqlProtocol.Column> = []
  for (let index = 0; index < columnCount; index++) {
    columns.push(
      yield* take(from, MysqlProtocol.decodeColumn, "MysqlConnection: Failed to read a column definition", operation)
    )
  }
  return columns
})

const streamResultSet = Effect.fnUntraced(function*<A>(
  reader: PacketReader,
  columnCount: number,
  rowDecoder: RowDecoder,
  buildRow: BuildRow<A>,
  push: (row: A) => void
): Effect.fn.Return<MysqlProtocol.ServerStatus, SqlError> {
  const columns = yield* readColumns(reader.one, columnCount, "stream")
  const decodeRow = rowDecoder(columns)
  while (true) {
    const packet = reader.buffered()
    if (packet === undefined) {
      yield* reader.refill
      continue
    }
    const next = yield* decodedAs(
      MysqlProtocol.decodeRow(packet.payload),
      "MysqlConnection: Failed to read a row",
      "stream"
    )
    if (MysqlProtocol.RowPacket.$is("End")(next)) return next.ok.statusFlags
    if (MysqlProtocol.RowPacket.$is("Error")(next)) {
      return yield* Effect.fail(serverError(next.error, "MysqlConnection: Failed to stream statement", "stream"))
    }
    const values = yield* decodedAs(decodeRow(next.payload), "MysqlConnection: Failed to read a row", "stream")
    push(buildRow(columns, values))
  }
})

/**
 * Reads whatever is left of a reply and throws it away.
 *
 * A cancelled statement still finishes on the wire, as either a result-set
 * terminator or an error, and the session cannot be reused until that has been
 * read.
 *
 * This must take over the reader's own `Take`, not a fresh one: taking refills
 * a chunk at a time, so an interrupted reader can be holding packets that have
 * already left the queue - including, if the whole reply arrived at once, the
 * terminator this is looking for.
 */
export const drainReply = Effect.fnUntraced(function*(from: Take): Effect.fn.Return<void, SqlError> {
  while (true) {
    const payload = (yield* from).payload
    if (payload.length === 0) continue
    if (payload[0] === 0xff) return
    if (payload[0] === 0xfe && payload.length < 9) return
  }
})

/** How many rows accumulate before a streaming read hands them over. */
const streamBatchSize = 64

/**
 * Reads a reply, emitting rows as they arrive instead of collecting them.
 *
 * Rows are handed over in batches: offering each one separately would cost a
 * queue round per row, and a result set delivers them in bulk.
 */
export const readStream = <A>(
  reader: PacketReader,
  rowDecoder: RowDecoder,
  buildRow: BuildRow<A>,
  emit: { readonly array: (rows: ReadonlyArray<A>) => void }
): Effect.Effect<void, SqlError> =>
  Effect.suspend(() => {
    let buffered: Array<A> = []
    const flush = (): void => {
      if (buffered.length === 0) return
      const batch = buffered
      buffered = []
      emit.array(batch)
    }
    const push = (row: A): void => {
      buffered.push(row)
      if (buffered.length >= streamBatchSize) flush()
    }

    return Effect.gen(function*() {
      while (true) {
        const response = yield* take(
          reader.one,
          MysqlProtocol.decodeResponse,
          "MysqlConnection: Failed to read a response",
          "stream"
        )
        const status = yield* Match.value(response).pipe(
          Match.tagsExhaustive({
            Ok: ({ ok }) => Effect.succeed(ok.statusFlags),
            Error: ({ error }) => Effect.fail(streamFailed(error)),
            LocalInfile: () => Effect.fail(localInfileRefused("stream")),
            ResultSet: ({ columnCount }) => streamResultSet(reader, columnCount, rowDecoder, buildRow, push)
          })
        )
        if (!MysqlProtocol.ServerStatus.has(status, MysqlProtocol.ServerStatusFlag.moreResultsExists)) return
      }
    }).pipe(Effect.onExit(() => Effect.sync(flush)))
  })

const streamFailed = (error: MysqlProtocol.Err): SqlError =>
  serverError(error, "MysqlConnection: Failed to stream statement", "stream")

const localInfileRefused = (operation: string): SqlError =>
  queryError(
    new Error("The server requested a LOCAL INFILE transfer"),
    "MysqlConnection: LOCAL INFILE is not enabled",
    operation
  )
