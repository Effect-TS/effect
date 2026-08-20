import { Schema } from "effect"
import { Msgpack, SchemaBinary } from "effect/unstable/encoding"
import { Packr, Unpackr } from "msgpackr"
import assert from "node:assert/strict"
import { Bench } from "tinybench"

const streamBatchSize = 32

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
    name: "large repeated records",
    schema: LargePayload,
    value: Array.from({ length: 200 }, (_, index) => ({
      transactionIdentifier: `transaction-${index.toString().padStart(4, "0")}`,
      customerIdentifier: `customer-${index % 37}`,
      productDescription: `Product ${index % 19} with a repeated descriptive field value`,
      fulfillmentLocation: ["London", "New York", "Singapore", "Sydney"][index % 4]!,
      quantityPurchased: index % 9 + 1,
      unitPriceInCents: 500 + index % 73 * 25,
      discountInBasisPoints: index % 5 * 125,
      requiresManualReview: index % 17 === 0
    }))
  }
] as const

interface Format {
  readonly name: string
  readonly encodedSize: number
  readonly encode: () => unknown
  readonly decode: () => unknown
}

interface StreamFormat {
  readonly name: string
  readonly encodedSize: number
  readonly decode: () => ReadonlyArray<unknown>
}

const textEncoder = new TextEncoder()

const repeatFrame = (frame: Uint8Array, count: number): Uint8Array<ArrayBuffer> => {
  const out = new Uint8Array(frame.length * count)
  for (let i = 0; i < count; i++) {
    out.set(frame, i * frame.length)
  }
  return out
}

const concatFrames = (frames: ReadonlyArray<Uint8Array>): Uint8Array<ArrayBuffer> => {
  const out = new Uint8Array(frames.reduce((length, frame) => length + frame.length, 0))
  let offset = 0
  for (const frame of frames) {
    out.set(frame, offset)
    offset += frame.length
  }
  return out
}

const prepare = <S extends Schema.ConstraintCodec<unknown, unknown>>(
  schema: S,
  value: S["Type"]
): {
  readonly formats: ReadonlyArray<Format>
  readonly streamFormats: ReadonlyArray<StreamFormat>
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
  const json = jsonEncode(value)
  const msgpack = msgpackEncode(value)

  assert.deepStrictEqual(binaryDecode(binary), value)
  assert.deepStrictEqual(jsonDecode(json), value)
  assert.deepStrictEqual(msgpackDecode(msgpack), value)

  const expectedStream = Array.from({ length: streamBatchSize }, () => value)
  const binaryStream = repeatFrame(binary, streamBatchSize)
  const encodeMsgpackValue = Schema.encodeUnknownSync(jsonSchema)
  const msgpackPackr = new Packr()
  const msgpackValue = encodeMsgpackValue(value)
  const msgpackStream = concatFrames(
    Array.from({ length: streamBatchSize }, () => msgpackPackr.pack(msgpackValue).slice())
  )
  const binaryParser = SchemaBinary.parser(schema)
  const msgpackUnpackr = new Unpackr()
  const decodeMsgpackValue = Schema.decodeUnknownSync(jsonSchema)
  const decodeBinaryStream = () => binaryParser.feedSync(binaryStream)
  const decodeMsgpackStream = () =>
    msgpackUnpackr.unpackMultiple(msgpackStream).map((value) => decodeMsgpackValue(value))

  assert.deepStrictEqual(decodeBinaryStream(), expectedStream)
  assert.deepStrictEqual(decodeMsgpackStream(), expectedStream)

  return {
    formats: [
      {
        name: "SchemaBinary",
        encodedSize: binary.length,
        encode: () => binaryEncode(value),
        decode: () => binaryDecode(binary)
      },
      {
        name: "JSON",
        encodedSize: textEncoder.encode(json).length,
        encode: () => jsonEncode(value),
        decode: () => jsonDecode(json)
      },
      {
        name: "Msgpack",
        encodedSize: msgpack.length,
        encode: () => msgpackEncode(value),
        decode: () => msgpackDecode(msgpack)
      }
    ],
    streamFormats: [
      {
        name: "SchemaBinary parser",
        encodedSize: binaryStream.length,
        decode: decodeBinaryStream
      },
      {
        name: "Msgpack unpackMultiple",
        encodedSize: msgpackStream.length,
        decode: decodeMsgpackStream
      }
    ]
  }
}

const prepared = cases.map((testCase) => ({ name: testCase.name, ...prepare(testCase.schema, testCase.value) }))

console.log(`Node ${process.version}; codec and schema construction excluded from timings.`)
console.log("JSON and Msgpack use the same Schema.toCodecJson representation; JSON sizes are UTF-8 bytes.")
console.log(
  "Compare formats within a case and direction in the same run; absolute rates vary with the machine and runtime."
)

console.table(prepared.flatMap((testCase) =>
  testCase.formats.map((format) => ({
    Case: testCase.name,
    Format: format.name,
    "Encoded bytes": format.encodedSize
  }))
))

console.log(
  `Streaming decode reuses one parser per format and processes ${streamBatchSize} concatenated frames per sample.`
)
console.table(prepared.flatMap((testCase) =>
  testCase.streamFormats.map((format) => ({
    Case: testCase.name,
    Format: format.name,
    Frames: streamBatchSize,
    "Encoded bytes": format.encodedSize,
    "Bytes / frame": format.encodedSize / streamBatchSize
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
const streamTasks = new Map<string, { readonly caseName: string; readonly formatName: string }>()

for (const testCase of prepared) {
  for (const format of testCase.streamFormats) {
    const name = `${testCase.name} / ${format.name} / stream decode`
    streamTasks.set(name, { caseName: testCase.name, formatName: format.name })
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
    "Throughput avg (values/s)": Math.round(result.throughput.mean * streamBatchSize),
    "Latency med (us/value)": (result.latency.p50 * 1_000 / streamBatchSize).toFixed(2),
    "Latency RME": `${result.latency.rme.toFixed(2)}%`,
    Samples: result.latency.samplesCount
  }
}))
