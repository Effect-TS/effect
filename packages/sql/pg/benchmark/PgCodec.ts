import * as PgProtocol from "@effect/sql-pg/PgProtocol"
import * as PgTypes from "@effect/sql-pg/PgTypes"
import assert from "node:assert/strict"
import { Buffer } from "node:buffer"
import { createRequire } from "node:module"
import { types as pgTypes } from "pg"
import { DataRowMessage as PgDataRowMessage } from "pg-protocol/dist/messages.js"
import { Parser as PgParser } from "pg-protocol/dist/parser.js"
import { serialize as pgSerialize } from "pg-protocol/dist/serializer.js"
import postgres from "postgres"
import { Bench } from "tinybench"

const require = createRequire(import.meta.url)
const pgUtils: { readonly prepareValue: (value: unknown) => unknown } = require("pg/lib/utils.js")

const postgresSql = postgres({ max: 0 })
const postgresSerializers = postgresSql.options.serializers
const postgresParsers = postgresSql.options.parsers

const jsonValue = { active: true, tags: ["effect", "postgres"] }
const byteaValue = Uint8Array.from({ length: 32 }, (_, index) => index)

const payload = [
  { oid: PgTypes.OID.int4, value: 42, text: "42" },
  { oid: PgTypes.OID.bool, value: true, text: "t" },
  { oid: PgTypes.OID.float8, value: 1234.5, text: "1234.5" },
  { oid: PgTypes.OID.text, value: "codec benchmark: hello \\ world", text: "codec benchmark: hello \\ world" },
  { oid: PgTypes.OID.jsonb, value: jsonValue, text: JSON.stringify(jsonValue) },
  { oid: PgTypes.OID.bytea, value: byteaValue, text: `\\x${Buffer.from(byteaValue).toString("hex")}` }
] as const

const effectEncoded = payload.map(({ oid, value }) => PgTypes.encode(value, oid))
const pgTextParsers = payload.map(({ oid }) => pgTypes.getTypeParser(oid, "text"))
const postgresTextParsers = payload.map(({ oid }) => postgresParsers[oid] ?? ((value: string) => value))

const encodeEffect = () => payload.map(({ oid, value }) => PgTypes.encode(value, oid))
const encodePg = () => payload.map(({ value }) => pgUtils.prepareValue(value))
const encodePostgresJs = () => payload.map(({ oid, value }) => postgresSerializers[oid]?.(value) ?? String(value))

const decodeEffect = () => payload.map(({ oid }, index) => PgTypes.decode(effectEncoded[index], oid, 1))
const decodePg = () => payload.map(({ text }, index) => pgTextParsers[index](text))
const decodePostgresJs = () => payload.map(({ text }, index) => postgresTextParsers[index](text))

const normalize = (values: ReadonlyArray<unknown>) =>
  values.map((value) => value instanceof Uint8Array ? Array.from(value) : value)

assert.deepStrictEqual(normalize(decodeEffect()), normalize(decodePg()))
assert.deepStrictEqual(normalize(decodeEffect()), normalize(decodePostgresJs()))

const makeDataRow = (fields: ReadonlyArray<string | Uint8Array>): Uint8Array => {
  const encoded = fields.map((field) => typeof field === "string" ? Buffer.from(field, "utf8") : Buffer.from(field))
  const length = 4 + 2 + encoded.reduce((total, field) => total + 4 + field.length, 0)
  const frame = Buffer.allocUnsafe(1 + length)
  frame[0] = 0x44
  frame.writeInt32BE(length, 1)
  frame.writeInt16BE(encoded.length, 5)
  let offset = 7
  for (const field of encoded) {
    frame.writeInt32BE(field.length, offset)
    offset += 4
    field.copy(frame, offset)
    offset += field.length
  }
  return frame
}

const rowsPerParserRun = 100
const dataRow = makeDataRow(payload.map(({ text }) => text))
const parserPayload = new Uint8Array(dataRow.length * rowsPerParserRun)
for (let index = 0; index < rowsPerParserRun; index++) {
  parserPayload.set(dataRow, index * dataRow.length)
}
const parserBuffer = Buffer.from(parserPayload.buffer, parserPayload.byteOffset, parserPayload.byteLength)
const parserChunks = Array.from(
  { length: Math.ceil(parserPayload.length / 64) },
  (_, index) => parserPayload.subarray(index * 64, (index + 1) * 64)
)
const pgParserChunks = parserChunks.map((chunk) => Buffer.from(chunk.buffer, chunk.byteOffset, chunk.byteLength))

const effectSingleParser = PgProtocol.makeParser()
const effectChunkedParser = PgProtocol.makeParser()
const pgSingleParser = new PgParser()
const pgChunkedParser = new PgParser()

const parseEffectSingle = () => effectSingleParser.push(parserPayload).length
const parseEffectChunked = () => {
  let count = 0
  for (const chunk of parserChunks) {
    count += effectChunkedParser.push(chunk).length
  }
  return count
}
const parsePgSingle = () => {
  let count = 0
  pgSingleParser.parse(parserBuffer, () => count++)
  return count
}
const parsePgChunked = () => {
  let count = 0
  for (const chunk of pgParserChunks) {
    pgChunkedParser.parse(chunk, () => count++)
  }
  return count
}

assert.equal(parseEffectSingle(), rowsPerParserRun)
assert.equal(parseEffectChunked(), rowsPerParserRun)
assert.equal(parsePgSingle(), rowsPerParserRun)
assert.equal(parsePgChunked(), rowsPerParserRun)

// End to end: JavaScript values in, a complete Bind frame out. This is the
// comparison the type-encode table cannot make, because `pg` splits the work
// between `prepareValue` and its Bind serializer.
const bindValues = payload.map(({ value }) => value)

const bindEffect = () =>
  PgProtocol.encodeBind({
    portal: "",
    statement: "s1",
    parameters: payload.map(({ oid, value }) => PgTypes.encode(value, oid))
  })

// The same job with the values written straight into the frame, which is what
// a client should use: no array per parameter, no copy out of one.
const bindParameters = payload.map(({ oid, value }) => ({ oid, value }))
const encodeBindFused = PgProtocol.makeBindEncoder(PgTypes.writeParameter)
const bindEffectFused = () => encodeBindFused({ portal: "", statement: "s1", parameters: bindParameters })

const bindPg = () =>
  pgSerialize.bind({
    portal: "",
    statement: "s1",
    values: bindValues,
    valueMapper: pgUtils.prepareValue as (value: unknown, index: number) => unknown
  })

// Array parameters, where the win is much larger: every element used to be
// encoded into an array of its own before being copied into the frame.
const arrayRow = [
  { oid: PgTypes.OID.int4Array, value: Array.from({ length: 16 }, (_, index) => index) },
  { oid: PgTypes.OID.textArray, value: Array.from({ length: 8 }, (_, index) => `tag-${index}`) }
]
const arrayValues = arrayRow.map(({ value }) => value)
const bindArrayEffectFused = () => encodeBindFused({ portal: "", statement: "s2", parameters: arrayRow })
const bindArrayEffect = () =>
  PgProtocol.encodeBind({ portal: "", statement: "s2", parameters: arrayRow.map(PgTypes.encodeParameter) })
const bindArrayPg = () =>
  pgSerialize.bind({
    portal: "",
    statement: "s2",
    values: arrayValues,
    valueMapper: pgUtils.prepareValue as (value: unknown, index: number) => unknown
  })

// End to end: DataRow frames in, JavaScript values out. Each library reads its
// own wire format, so the frames the binary codec sees carry binary fields.
const binaryDataRow = makeDataRow(effectEncoded)
const binaryRowsPayload = new Uint8Array(binaryDataRow.length * rowsPerParserRun)
for (let index = 0; index < rowsPerParserRun; index++) {
  binaryRowsPayload.set(binaryDataRow, index * binaryDataRow.length)
}

const effectRowParser = PgProtocol.makeParser()
const pgRowParser = new PgParser()

const decodeRowsEffect = () => {
  let count = 0
  for (const message of effectRowParser.push(binaryRowsPayload)) {
    if (message._tag !== "DataRow") continue
    for (let index = 0; index < message.values.length; index++) {
      const field = message.values[index]
      if (field !== null) PgTypes.decode(field, payload[index].oid, 1)
    }
    count++
  }
  return count
}

const decodeRowsPg = () => {
  let count = 0
  pgRowParser.parse(parserBuffer, (message) => {
    if (!(message instanceof PgDataRowMessage)) return
    for (let index = 0; index < message.fields.length; index++) {
      const field = message.fields[index]
      if (field !== null) pgTextParsers[index](field)
    }
    count++
  })
  return count
}

assert.equal(decodeRowsEffect(), rowsPerParserRun)
assert.equal(decodeRowsPg(), rowsPerParserRun)
assert.ok(bindEffect().length > 0)
assert.ok(bindPg().length > 0)
assert.deepStrictEqual(Array.from(bindEffectFused()), Array.from(bindEffect()))
assert.deepStrictEqual(Array.from(bindArrayEffectFused()), Array.from(bindArrayEffect()))
assert.ok(bindArrayPg().length > 0)

// Arrays are the one place a value's cost is paid per element, so they get a
// suite of their own.
const int4ArrayLength = 16
const int4ArrayValue = Array.from({ length: int4ArrayLength }, (_, index) => index * 1000)
const int4ArrayText = `{${int4ArrayValue.join(",")}}`
const int4ArrayEncoded = PgTypes.encode(int4ArrayValue, PgTypes.OID.int4Array)
// `pg` types its parser lookup with a union that leaves the array OIDs out.
const pgArrayParser = (pgTypes.getTypeParser as (oid: number, format: "text") => (value: string) => unknown)(
  PgTypes.OID.int4Array,
  "text"
)
// postgres.js has no array parser to compare against: it leaves array columns
// as their text.
const decodeArrayEffect = () => PgTypes.decode(int4ArrayEncoded, PgTypes.OID.int4Array, 1)
const decodeArrayPg = () => pgArrayParser(int4ArrayText)

assert.deepStrictEqual(decodeArrayEffect(), int4ArrayValue)
assert.deepStrictEqual(decodeArrayPg(), int4ArrayValue)

const codecRowsPerRun = 100
let sink: unknown

const batch = (run: () => unknown, rows = codecRowsPerRun) => () => {
  let value: unknown
  for (let index = 0; index < rows; index++) {
    value = run()
  }
  sink = value
}

const options = {
  iterations: 64,
  time: 1_000,
  warmupIterations: 16,
  warmupTime: 250,
  timestampProvider: "hrtimeNow" as const
}

const runSuite = async (
  name: string,
  rowsPerRun: number,
  tasks: ReadonlyArray<readonly [name: string, run: () => unknown]>,
  shape = `${payload.length} columns per row`
) => {
  const bench = new Bench(options)
  for (const [taskName, run] of tasks) {
    bench.add(taskName, run)
  }
  await bench.run()
  console.log(`\n${name} (${shape})`)
  console.table(bench.table((task) => {
    const result = task.result
    if (result?.state !== "completed") {
      return { Implementation: task.name, State: result?.state ?? "missing result" }
    }
    return {
      Implementation: task.name,
      "Rows/s": Math.round(result.throughput.mean * rowsPerRun),
      "Latency (ns/row)": (result.latency.mean * 1_000_000 / rowsPerRun).toFixed(2),
      RME: `${result.latency.rme.toFixed(2)}%`,
      Samples: result.latency.samplesCount
    }
  }))
}

await runSuite("type encode", codecRowsPerRun, [
  ["@effect/sql-pg binary", batch(encodeEffect)],
  ["postgres.js text", batch(encodePostgresJs)],
  ["pg text", batch(encodePg)]
])

await runSuite("type decode", codecRowsPerRun, [
  ["@effect/sql-pg binary", batch(decodeEffect)],
  ["postgres.js text", batch(decodePostgresJs)],
  ["pg text", batch(decodePg)]
])

await runSuite("int4[] decode", codecRowsPerRun, [
  ["@effect/sql-pg binary", batch(decodeArrayEffect)],
  ["pg text", batch(decodeArrayPg)]
], `${int4ArrayLength} elements per array`)

await runSuite("Bind frame from JavaScript values", codecRowsPerRun, [
  ["@effect/sql-pg binary, value sink", batch(bindEffectFused)],
  ["@effect/sql-pg binary, encoded parameters", batch(bindEffect)],
  ["pg text", batch(bindPg)]
])

await runSuite(
  "Bind frame from array parameters",
  codecRowsPerRun,
  [
    ["@effect/sql-pg binary, value sink", batch(bindArrayEffectFused)],
    ["@effect/sql-pg binary, encoded parameters", batch(bindArrayEffect)],
    ["pg text", batch(bindArrayPg)]
  ],
  "int4[16] and text[8] per row"
)

await runSuite("DataRow frames to JavaScript values", rowsPerParserRun, [
  ["@effect/sql-pg binary", decodeRowsEffect],
  ["pg text", decodeRowsPg]
])

await runSuite("protocol DataRow parser, one chunk", rowsPerParserRun, [
  ["@effect/sql-pg", parseEffectSingle],
  ["pg-protocol (pg)", parsePgSingle]
])

await runSuite("protocol DataRow parser, 64-byte chunks", rowsPerParserRun, [
  ["@effect/sql-pg", parseEffectChunked],
  ["pg-protocol (pg)", parsePgChunked]
])

if (sink === undefined) {
  throw new Error("Benchmark did not run")
}

await postgresSql.end()
