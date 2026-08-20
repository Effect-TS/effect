import { Schema } from "effect"
import { Msgpack, SchemaBinary } from "effect/unstable/encoding"
import { Packr, Unpackr } from "msgpackr"
import assert from "node:assert/strict"
import { gzipSync, zstdCompressSync } from "node:zlib"
import { Bench } from "tinybench"

const streamBatchSize = 32
const repeatedRecordStreamSize = 200

const SmallRecord = Schema.Struct({
  id: Schema.Number,
  active: Schema.Boolean,
  score: Schema.Number,
  retryCount: Schema.Number,
  region: Schema.String,
  verified: Schema.Boolean
})

const LineItem = Schema.Struct({
  sku: Schema.String,
  quantity: Schema.Number,
  unitPrice: Schema.Number
})

const NestedPayload = Schema.Struct({
  orderId: Schema.String,
  customer: Schema.Struct({
    id: Schema.String,
    name: Schema.String,
    email: Schema.String
  }),
  shipping: Schema.Struct({
    street: Schema.String,
    city: Schema.String,
    postalCode: Schema.String,
    country: Schema.String
  }),
  lines: Schema.Array(LineItem),
  metadata: Schema.Struct({
    source: Schema.String,
    campaign: Schema.String,
    priority: Schema.Boolean
  })
})

const Collections = Schema.Struct({
  tags: Schema.Array(Schema.String),
  metrics: Schema.Record(Schema.String, Schema.Number),
  samples: Schema.Array(Schema.Tuple([Schema.Number, Schema.Number, Schema.Boolean])),
  buckets: Schema.Array(Schema.Array(Schema.Number))
})

const LargeRow = Schema.Struct({
  transactionIdentifier: Schema.String,
  customerIdentifier: Schema.String,
  productDescription: Schema.String,
  fulfillmentLocation: Schema.String,
  quantityPurchased: Schema.Number,
  unitPriceInCents: Schema.Number,
  discountInBasisPoints: Schema.Number,
  requiresManualReview: Schema.Boolean
})

const LargePayload = Schema.Array(LargeRow)

const largeRows = Array.from({ length: repeatedRecordStreamSize }, (_, index) => ({
  transactionIdentifier: `transaction-${index.toString().padStart(4, "0")}`,
  customerIdentifier: `customer-${index % 37}`,
  productDescription: `Product ${index % 19} with a repeated descriptive field value`,
  fulfillmentLocation: ["London", "New York", "Singapore", "Sydney"][index % 4]!,
  quantityPurchased: index % 9 + 1,
  unitPriceInCents: 500 + index % 73 * 25,
  discountInBasisPoints: index % 5 * 125,
  requiresManualReview: index % 17 === 0
}))

const metrics = (count: number) =>
  Object.fromEntries(Array.from({ length: count }, (_, index) => [`metric-${index}`, index * 1.25]))

const cases = [
  {
    name: "small record",
    schema: SmallRecord,
    value: {
      id: 42,
      active: true,
      score: 98.5,
      retryCount: 2,
      region: "eu-west-1",
      verified: false
    }
  },
  {
    name: "nested payload",
    schema: NestedPayload,
    value: {
      orderId: "order-2026-000184",
      customer: {
        id: "customer-91",
        name: "Ada Lovelace",
        email: "ada@example.com"
      },
      shipping: {
        street: "12 Analytical Engine Way",
        city: "London",
        postalCode: "SW1A 1AA",
        country: "GB"
      },
      lines: [
        { sku: "widget-blue", quantity: 2, unitPrice: 12.5 },
        { sku: "adapter-pro", quantity: 1, unitPrice: 48 },
        { sku: "cable-2m", quantity: 3, unitPrice: 8.25 }
      ],
      metadata: {
        source: "partner-api",
        campaign: "summer-2026",
        priority: true
      }
    }
  },
  {
    name: "collections",
    schema: Collections,
    value: {
      tags: Array.from({ length: 24 }, (_, index) => `tag-${index}`),
      metrics: Object.fromEntries(Array.from({ length: 24 }, (_, index) => [`metric-${index}`, index * 1.25])),
      samples: Array.from({ length: 48 }, (_, index) => [index, index / 10, index % 3 === 0] as const),
      buckets: Array.from({ length: 8 }, (_, bucket) => Array.from({ length: 16 }, (_, index) => bucket * 100 + index))
    }
  },
  {
    name: "index signatures / 128 keys",
    schema: Schema.Record(Schema.String, Schema.Number),
    value: metrics(128)
  },
  {
    name: "index signatures / 512 keys",
    schema: Schema.Record(Schema.String, Schema.Number),
    value: metrics(512)
  },
  {
    name: "large repeated records",
    schema: LargePayload,
    value: largeRows
  }
] as const

interface Format {
  readonly name: string
  readonly encodedSize: number
  readonly gzipSize: number
  readonly zstdSize: number
  readonly encode: () => unknown
  readonly decode: () => unknown
}

interface StreamFormat {
  readonly name: string
  readonly framesPerOp: number
  readonly decode: () => ReadonlyArray<unknown>
}

interface StreamSize {
  readonly name: string
  readonly frames: number
  readonly encodedSize: number
  readonly gzipSize: number
  readonly zstdSize: number
}

const textEncoder = new TextEncoder()

const concatFrames = (frames: ReadonlyArray<Uint8Array>): Uint8Array<ArrayBuffer> => {
  const out = new Uint8Array(frames.reduce((length, frame) => length + frame.length, 0))
  let offset = 0
  for (const frame of frames) {
    out.set(frame, offset)
    offset += frame.length
  }
  return out
}

const sizes = (encoded: Uint8Array): Pick<Format, "encodedSize" | "gzipSize" | "zstdSize"> => ({
  encodedSize: encoded.length,
  gzipSize: gzipSync(encoded).length,
  zstdSize: zstdCompressSync(encoded).length
})

const prepare = <S extends Schema.ConstraintCodec<unknown, unknown>>(
  schema: S,
  value: S["Type"]
): {
  readonly formats: ReadonlyArray<Format>
} => {
  const jsonSchema = Schema.toCodecJson(schema)
  const binaryCodec = SchemaBinary.toCodec(schema)
  const jsonCodec = Schema.fromJsonString(jsonSchema)
  const msgpackCodec = Msgpack.schema(jsonSchema)

  const binaryEncode = Schema.encodeUnknownSync(binaryCodec)
  const binaryDecode = Schema.decodeUnknownSync(binaryCodec)
  const jsonEncode = Schema.encodeUnknownSync(jsonCodec)
  const jsonDecode = Schema.decodeUnknownSync(jsonCodec)
  const msgpackEncode = Schema.encodeUnknownSync(msgpackCodec)
  const msgpackDecode = Schema.decodeUnknownSync(msgpackCodec)

  const binary = binaryEncode(value)
  const binaryCopy = binary.slice()
  const json = jsonEncode(value)
  const jsonBytes = textEncoder.encode(json)
  const msgpack = msgpackEncode(value)

  assert.deepStrictEqual(binaryDecode(binary), value)
  assert.deepStrictEqual(jsonDecode(json), value)
  assert.deepStrictEqual(msgpackDecode(msgpack), value)

  return {
    formats: [
      {
        name: "SchemaBinary arena",
        ...sizes(binary),
        encode: () => binaryEncode(value),
        decode: () => binaryDecode(binary)
      },
      {
        name: "SchemaBinary copy",
        ...sizes(binaryCopy),
        encode: () => binaryEncode(value).slice(),
        decode: () => binaryDecode(binaryCopy)
      },
      {
        name: "JSON",
        ...sizes(jsonBytes),
        encode: () => jsonEncode(value),
        decode: () => jsonDecode(json)
      },
      {
        name: "Msgpack",
        ...sizes(msgpack),
        encode: () => msgpackEncode(value),
        decode: () => msgpackDecode(msgpack)
      }
    ]
  }
}

const prepared = cases.map((testCase) => ({ name: testCase.name, ...prepare(testCase.schema, testCase.value) }))

const prepareStream = <S extends Schema.ConstraintCodec<unknown, unknown>>(
  schema: S,
  values: ReadonlyArray<S["Type"]>
): { readonly formats: ReadonlyArray<StreamFormat>; readonly sizes: ReadonlyArray<StreamSize> } => {
  const binaryCodec = SchemaBinary.toCodec(schema)
  const binaryEncode = Schema.encodeUnknownSync(binaryCodec)
  const binaryFrames = values.map((value) => binaryEncode(value))
  const binaryStream = concatFrames(binaryFrames)
  const binaryFragments = binaryFrames.map((frame) => {
    return [frame.subarray(0, 1), frame.subarray(1)] as const
  })

  const jsonSchema = Schema.toCodecJson(schema)
  const encodeMsgpackValue = Schema.encodeUnknownSync(jsonSchema)
  const decodeMsgpackValue = Schema.decodeUnknownSync(jsonSchema)
  const msgpackPackr = new Packr()
  const msgpackStream = concatFrames(values.map((value) => msgpackPackr.pack(encodeMsgpackValue(value)).slice()))
  const msgpackUnpackr = new Unpackr()

  const singleParser = SchemaBinary.parser(schema)
  const fragmentedParser = SchemaBinary.parser(schema)
  const batchParser = SchemaBinary.parser(schema)
  let singleIndex = 0
  let fragmentedIndex = 0
  const decodeSingle = () => singleParser.feedSync(binaryFrames[singleIndex++ % binaryFrames.length])
  const decodeFragmented = () => {
    const fragments = binaryFragments[fragmentedIndex++ % binaryFragments.length]
    const first = fragmentedParser.feedSync(fragments[0])
    const second = fragmentedParser.feedSync(fragments[1])
    return first.length === 0 ? second : [...first, ...second]
  }
  const decodeBatch = () => batchParser.feedSync(binaryStream)
  const decodeMsgpackStream = () =>
    msgpackUnpackr.unpackMultiple(msgpackStream).map((value) => decodeMsgpackValue(value))

  assert.deepStrictEqual(decodeSingle(), [values[0]])
  assert.deepStrictEqual(decodeFragmented(), [values[0]])
  assert.deepStrictEqual(decodeBatch(), values)
  assert.deepStrictEqual(decodeMsgpackStream(), values)

  return {
    formats: [
      { name: "SchemaBinary parser / single frame", framesPerOp: 1, decode: decodeSingle },
      { name: "SchemaBinary parser / batch", framesPerOp: values.length, decode: decodeBatch },
      { name: "SchemaBinary parser / fragmented", framesPerOp: 1, decode: decodeFragmented },
      { name: "Msgpack unpackMultiple / batch", framesPerOp: values.length, decode: decodeMsgpackStream }
    ],
    sizes: [
      { name: "SchemaBinary", frames: values.length, ...sizes(binaryStream) },
      { name: "Msgpack", frames: values.length, ...sizes(msgpackStream) }
    ]
  }
}

const preparedStreams = [
  ...cases.map((testCase) => ({
    name: testCase.name,
    ...prepareStream(testCase.schema, Array.from({ length: streamBatchSize }, () => testCase.value))
  })),
  { name: "per-frame repeated records", ...prepareStream(LargeRow, largeRows) }
]

console.log(`Node ${process.version}; codec and schema construction excluded from timings.`)
console.log("JSON and Msgpack use the same Schema.toCodecJson representation; JSON sizes are UTF-8 bytes.")
console.log(
  "Compare formats within a case and direction in the same run; absolute rates vary with the machine and runtime."
)

console.table(prepared.flatMap((testCase) =>
  testCase.formats.map((format) => ({
    Case: testCase.name,
    Format: format.name,
    "Raw bytes": format.encodedSize,
    "gzip -6 bytes": format.gzipSize,
    "zstd bytes": format.zstdSize
  }))
))

console.log(
  "Streaming decode reuses one parser per feed shape. Fragmented frames split after the first byte."
)
console.table(preparedStreams.flatMap((testCase) =>
  testCase.sizes.map((format) => ({
    Case: testCase.name,
    Format: format.name,
    Frames: format.frames,
    "Raw bytes": format.encodedSize,
    "Bytes / frame": format.encodedSize / format.frames,
    "gzip -6 bytes": format.gzipSize,
    "zstd bytes": format.zstdSize
  }))
))

const bench = new Bench({
  iterations: 1_000,
  time: 0,
  warmupIterations: 100,
  warmupTime: 0,
  timestampProvider: "hrtimeNow"
})
const tasks = new Map<string, { readonly caseName: string; readonly formatName: string; readonly direction: string }>()
const sinkSentinel = Symbol("benchmark did not run")
let sink: unknown = sinkSentinel

for (const testCase of prepared) {
  for (const format of testCase.formats) {
    for (const [direction, run] of [["encode", format.encode], ["decode", format.decode]] as const) {
      const name = `${testCase.name} / ${format.name} / ${direction}`
      tasks.set(name, { caseName: testCase.name, formatName: format.name, direction })
      bench.add(name, () => {
        sink = run()
      })
    }
  }
}

await bench.run()

if (sink === sinkSentinel) {
  throw new Error("Benchmark did not run")
}

console.table(bench.tasks.map((task) => {
  const labels = tasks.get(task.name)!
  const result = task.result
  if (result?.state === "errored") {
    return {
      Case: labels.caseName,
      Format: labels.formatName,
      Direction: labels.direction,
      Error: result.error.message
    }
  }
  if (result?.state !== "completed") {
    return {
      Case: labels.caseName,
      Format: labels.formatName,
      Direction: labels.direction,
      State: result?.state ?? "missing result"
    }
  }
  return {
    Case: labels.caseName,
    Format: labels.formatName,
    Direction: labels.direction,
    "Throughput avg (ops/s)": Math.round(result.throughput.mean),
    "Latency med (us/op)": (result.latency.p50 * 1_000).toFixed(2),
    "Latency RME": `${result.latency.rme.toFixed(2)}%`,
    Samples: result.latency.samplesCount
  }
}))

const streamBench = new Bench({
  iterations: 250,
  time: 0,
  warmupIterations: 25,
  warmupTime: 0,
  timestampProvider: "hrtimeNow"
})
const streamTasks = new Map<
  string,
  { readonly caseName: string; readonly formatName: string; readonly framesPerOp: number }
>()

for (const testCase of preparedStreams) {
  for (const format of testCase.formats) {
    const name = `${testCase.name} / ${format.name} / stream decode`
    streamTasks.set(name, {
      caseName: testCase.name,
      formatName: format.name,
      framesPerOp: format.framesPerOp
    })
    streamBench.add(name, () => {
      sink = format.decode()
    })
  }
}

await streamBench.run()

console.table(streamBench.tasks.map((task) => {
  const labels = streamTasks.get(task.name)!
  const result = task.result
  if (result?.state === "errored") {
    return {
      Case: labels.caseName,
      Format: labels.formatName,
      Error: result.error.message
    }
  }
  if (result?.state !== "completed") {
    return {
      Case: labels.caseName,
      Format: labels.formatName,
      State: result?.state ?? "missing result"
    }
  }
  return {
    Case: labels.caseName,
    Format: labels.formatName,
    "Throughput avg (values/s)": Math.round(result.throughput.mean * labels.framesPerOp),
    "Latency med (us/value)": (result.latency.p50 * 1_000 / labels.framesPerOp).toFixed(2),
    "Latency RME": `${result.latency.rme.toFixed(2)}%`,
    Samples: result.latency.samplesCount
  }
}))
