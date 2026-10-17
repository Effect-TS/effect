import { MysqlProtocol } from "@effect/sql-mysql"
import type { Completed } from "@effect/sql-mysql/internal/reply"
import { makeReader, readReply, textRows } from "@effect/sql-mysql/internal/reply"
import { assert, describe, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as Queue from "effect/Queue"
import * as Result from "effect/Result"
import type { SqlError } from "effect/unstable/sql/SqlError"

const success = <A, E>(result: Result.Result<A, E>): A => {
  assert.isTrue(Result.isSuccess(result), "expected a success")
  return (result as Result.Success<A, E>).success
}

const write = (run: Parameters<typeof MysqlProtocol.encodeWith>[0]): Uint8Array =>
  success(MysqlProtocol.encodeWith(run))

/** The result set a statement produced, failing the test if it produced counters. */
const resultSet = <A>(
  completed: Completed<A> | undefined
): Extract<Completed<A>, { _tag: "ResultSet" }> => {
  if (completed === undefined || completed._tag !== "ResultSet") {
    throw new Error(`expected a result set, got ${completed === undefined ? "nothing" : completed._tag}`)
  }
  return completed
}

const packet = (payload: Uint8Array): MysqlProtocol.Packet => ({ sequenceId: 0, payload })

/** The header that opens a result set, carrying its column count. */
const columnCount = (count: number) => packet(write((w) => w.lenencInt(count)))

const columnDefinition = (name: string, type: number) =>
  packet(write((w) => {
    w.lenencString("def")
    w.lenencString("test")
    w.lenencString("t")
    w.lenencString("t")
    w.lenencString(name)
    w.lenencString(name)
    w.lenencInt(0x0c)
    w.uint16(MysqlProtocol.defaultCollation)
    w.uint32(255)
    w.uint8(type)
    w.uint16(0)
    w.uint8(0)
    w.fill(0, 2)
  }))

const row = (...values: ReadonlyArray<string>) =>
  packet(write((w) => {
    for (const value of values) w.lenencString(value)
  }))

/** A row whose first field claims more bytes than the packet holds. */
const truncatedRow = () => packet(new Uint8Array([0x05, 0x61, 0x62]))

const ok = (statusFlags: number, affectedRows = 0) =>
  packet(write((w) => {
    w.uint8(0x00)
    w.lenencInt(affectedRows)
    w.lenencInt(0)
    w.uint16(statusFlags)
    w.uint16(0)
  }))

/** The packet that ends a result set: an OK wearing the 0xfe header. */
const endOfRows = (statusFlags: number) =>
  packet(write((w) => {
    w.uint8(0xfe)
    w.lenencInt(0)
    w.lenencInt(0)
    w.uint16(statusFlags)
    w.uint16(0)
  }))

const autocommit = 2
const moreResults = autocommit + 8

const readerOf = (packets: ReadonlyArray<MysqlProtocol.Packet>) =>
  Effect.map(Queue.make<MysqlProtocol.Packet, SqlError>(), (queue) => {
    Queue.offerAllUnsafe(queue, packets)
    return { reader: makeReader(queue), queue }
  })

/** Reads a reply, reporting each statement's rows as bare value arrays. */
const read = (packets: ReadonlyArray<MysqlProtocol.Packet>) =>
  Effect.flatMap(
    readerOf(packets),
    ({ reader }) => readReply(reader, textRows({}), (_, values) => values)
  )

describe("reply", () => {
  it.effect("reads a statement that produced no rows", () =>
    Effect.gen(function*() {
      const statements = yield* read([ok(autocommit, 3)])
      assert.strictEqual(statements.length, 1)
      // No rows is the tag's business now, not an empty array's.
      assert.strictEqual(statements[0]._tag, "Ok")
      assert.strictEqual(statements[0].ok.affectedRows, 3)
    }))

  it.effect("reads a result set", () =>
    Effect.gen(function*() {
      const statements = yield* read([
        columnCount(2),
        columnDefinition("a", MysqlProtocol.ColumnType.varString),
        columnDefinition("b", MysqlProtocol.ColumnType.long),
        row("x", "1"),
        row("y", "2"),
        endOfRows(autocommit)
      ])
      assert.strictEqual(statements.length, 1)
      assert.deepStrictEqual(resultSet(statements[0]).rows, [["x", 1], ["y", 2]])
      assert.deepStrictEqual(resultSet(statements[0]).columns.map((column) => column.name), ["a", "b"])
    }))

  it.effect("reads one entry per statement of a multi-statement reply", () =>
    Effect.gen(function*() {
      const statements = yield* read([
        ok(moreResults, 1),
        columnCount(1),
        columnDefinition("a", MysqlProtocol.ColumnType.varString),
        row("only"),
        endOfRows(autocommit)
      ])
      assert.strictEqual(statements.length, 2)
      assert.strictEqual(statements[0].ok.affectedRows, 1)
      assert.deepStrictEqual(resultSet(statements[1]).rows, [["only"]])
    }))

  it.effect("reads a row whose first column is empty", () =>
    Effect.gen(function*() {
      // Starts 0x00 and is long enough to look like an OK packet, which is why
      // classification has to know it is reading rows.
      const statements = yield* read([
        columnCount(2),
        columnDefinition("a", MysqlProtocol.ColumnType.varString),
        columnDefinition("b", MysqlProtocol.ColumnType.varString),
        row("", "aaaaaaaa"),
        endOfRows(autocommit)
      ])
      assert.deepStrictEqual(resultSet(statements[0]).rows, [["", "aaaaaaaa"]])
    }))

  it.effect("fails with the server's error", () =>
    Effect.gen(function*() {
      const err = packet(write((w) => {
        w.uint8(0xff)
        w.uint16(1062)
        w.uint8(0x23)
        w.utf8("23000")
        w.utf8("Duplicate entry 'a' for key 'users.email'")
      }))
      const error = yield* Effect.flip(read([err]))
      assert.strictEqual(error.reason._tag, "UniqueViolation")
      assert.strictEqual((error.reason as { readonly constraint: string }).constraint, "users.email")
    }))

  it.effect("refuses a LOCAL INFILE request", () =>
    Effect.gen(function*() {
      const request = packet(new Uint8Array([0xfb, 0x2f, 0x74, 0x6d, 0x70]))
      const error = yield* Effect.flip(read([request]))
      assert.match(error.message, /LOCAL INFILE/)
    }))

  it.effect("reads the reply to its end before failing on a value it cannot decode", () =>
    Effect.gen(function*() {
      const { queue, reader } = yield* readerOf([
        columnCount(1),
        columnDefinition("a", MysqlProtocol.ColumnType.varString),
        truncatedRow(),
        row("after"),
        endOfRows(autocommit)
      ])
      const error = yield* Effect.flip(readReply(reader, textRows({}), (_, values) => values))
      assert.match(error.message, /Failed to read a row/)

      // The session is reusable: the next reply reads cleanly off the same
      // reader, which it could not if the first had been abandoned early.
      Queue.offerAllUnsafe(queue, [ok(autocommit, 7)])
      const next = yield* readReply(reader, textRows({}), (_, values) => values)
      assert.strictEqual(next[0].ok.affectedRows, 7)
    }))

  it.effect("reads two result sets that arrive in one chunk", () =>
    Effect.gen(function*() {
      const statements = yield* read([
        columnCount(1),
        columnDefinition("a", MysqlProtocol.ColumnType.varString),
        row("first"),
        endOfRows(moreResults),
        columnCount(1),
        columnDefinition("b", MysqlProtocol.ColumnType.varString),
        row("second"),
        endOfRows(autocommit)
      ])
      assert.strictEqual(statements.length, 2)
      assert.deepStrictEqual(resultSet(statements[0]).rows, [["first"]])
      assert.deepStrictEqual(resultSet(statements[1]).rows, [["second"]])
    }))
})
