import { MysqlProtocol, MysqlTypes } from "@effect/sql-mysql"
import * as Result from "effect/Result"
import { Bench } from "tinybench"

const success = <A, E>(result: Result.Result<A, E>): A => {
  if (Result.isFailure(result)) throw result.failure
  return result.success
}

const write = (run: Parameters<typeof MysqlProtocol.encodeWith>[0]): Uint8Array =>
  success(MysqlProtocol.encodeWith(run))

/** A column definition, built the way the server would send one. */
const column = (name: string, type: number, collation = MysqlProtocol.defaultCollation) =>
  success(MysqlProtocol.decodeColumn(write((w) => {
    w.lenencString("def")
    w.lenencString("bench")
    w.lenencString("rows")
    w.lenencString("rows")
    w.lenencString(name)
    w.lenencString(name)
    w.lenencInt(0x0c)
    w.uint16(collation)
    w.uint32(255)
    w.uint8(type)
    w.uint16(0)
    w.uint8(0)
    w.fill(0, 2)
  })))

const columns = [
  column("id", MysqlProtocol.ColumnType.longlong),
  column("name", MysqlProtocol.ColumnType.varString),
  column("n", MysqlProtocol.ColumnType.long),
  column("flag", MysqlProtocol.ColumnType.tiny)
]

const rowCount = 100

/** The text-protocol payloads for one hundred rows. */
const payloads = Array.from({ length: rowCount }, (_, index) =>
  write((w) => {
    w.lenencString(String(index + 1))
    w.lenencString(`row-${index + 1}`)
    w.lenencString(String(index + 1))
    w.lenencString(String(index % 2))
  }))

const readField = MysqlTypes.makeTextFieldReader(columns)

const toRow = (values: ReadonlyArray<unknown>): Record<string, unknown> => {
  const row: Record<string, unknown> = {}
  for (let index = 0; index < columns.length; index++) row[columns[index].name] = values[index]
  return row
}

/** Classify, decode and build one hundred rows, with no Effect and no socket. */
const decodeRows = (): Array<Record<string, unknown>> => {
  const rows: Array<Record<string, unknown>> = []
  for (let index = 0; index < payloads.length; index++) {
    const packet = success(MysqlProtocol.decodeRow(payloads[index]))
    if (!MysqlProtocol.RowPacket.$is("Row")(packet)) continue
    rows.push(toRow(success(MysqlProtocol.decodeTextRow(packet.payload, columns.length, readField))))
  }
  return rows
}

/** The same without the packet classification, to price that separately. */
const decodeRowsWithoutClassify = (): Array<Record<string, unknown>> => {
  const rows: Array<Record<string, unknown>> = []
  for (let index = 0; index < payloads.length; index++) {
    rows.push(toRow(success(MysqlProtocol.decodeTextRow(payloads[index], columns.length, readField))))
  }
  return rows
}

const sanity = decodeRows()
if (sanity.length !== rowCount || sanity[0].name !== "row-1" || sanity[0].id !== 1n) {
  throw new Error(`Decoded rows are wrong: ${JSON.stringify(sanity[0])}`)
}

const bench = new Bench({ time: 2000 })
bench.add(`decode ${rowCount} rows`, decodeRows)
bench.add(`decode ${rowCount} rows, no classification`, decodeRowsWithoutClassify)
await bench.run()
console.table(bench.table())
