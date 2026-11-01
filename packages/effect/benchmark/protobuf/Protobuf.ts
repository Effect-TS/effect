// Compares `Protobuf.toCodec` with protobufjs on the same messages. Run from the
// repository root:
//
//   nix develop -c pnpm --dir packages/effect exec node benchmark/protobuf/Protobuf.ts
//
// Compare the two libraries within the same case and run; absolute throughput
// varies with the machine and runtime.
import { Schema } from "effect"
import * as Protobuf from "effect/protobuf/Protobuf"
import assert from "node:assert/strict"
import protobuf, { type Message, type Type } from "protobufjs"
import { Bench } from "tinybench"

const f = Protobuf.field

const SmallRecord = Protobuf.Message("bench.SmallRecord", {
  id: Protobuf.Double.pipe(f(1)),
  active: Schema.Boolean.pipe(f(2)),
  score: Protobuf.Double.pipe(f(3)),
  retryCount: Protobuf.Int32.pipe(f(4)),
  region: Schema.String.pipe(f(5)),
  verified: Schema.Boolean.pipe(f(6))
})

const LineItem = Protobuf.Message("bench.LineItem", {
  sku: Schema.String.pipe(f(1)),
  quantity: Protobuf.Int32.pipe(f(2)),
  unitPrice: Protobuf.Double.pipe(f(3))
})

const Customer = Protobuf.Message("bench.Customer", {
  id: Schema.String.pipe(f(1)),
  name: Schema.String.pipe(f(2)),
  email: Schema.String.pipe(f(3))
})

const NestedPayload = Protobuf.Message("bench.NestedPayload", {
  orderId: Schema.String.pipe(f(1)),
  customer: Customer.pipe(f(2)),
  lines: Schema.Array(LineItem).pipe(f(3)),
  createdAt: Protobuf.Int64.pipe(f(4))
})

const Numbers = Protobuf.Message("bench.Numbers", {
  ints: Schema.Array(Protobuf.Int32).pipe(f(1)),
  doubles: Schema.Array(Protobuf.Double).pipe(f(2))
})

const Metrics = Protobuf.Message("bench.Metrics", {
  values: Protobuf.Map(Schema.String, Protobuf.Double).pipe(f(1))
})

const LargeRow = Protobuf.Message("bench.LargeRow", {
  transactionIdentifier: Schema.String.pipe(f(1)),
  customerIdentifier: Schema.String.pipe(f(2)),
  productDescription: Schema.String.pipe(f(3)),
  fulfillmentLocation: Schema.String.pipe(f(4)),
  quantityPurchased: Protobuf.Int32.pipe(f(5)),
  unitPriceInCents: Protobuf.Int64.pipe(f(6)),
  discountInBasisPoints: Protobuf.Int32.pipe(f(7)),
  requiresManualReview: Schema.Boolean.pipe(f(8))
})

const LargePayload = Protobuf.Message("bench.LargePayload", {
  rows: Schema.Array(LargeRow).pipe(f(1))
})

const protobufRoot = protobuf.parse(`
  syntax = "proto3";
  package bench;
  message SmallRecord {
    double id = 1; bool active = 2; double score = 3; int32 retryCount = 4; string region = 5; bool verified = 6;
  }
  message LineItem { string sku = 1; int32 quantity = 2; double unitPrice = 3; }
  message Customer { string id = 1; string name = 2; string email = 3; }
  message NestedPayload { string orderId = 1; Customer customer = 2; repeated LineItem lines = 3; int64 createdAt = 4; }
  message Numbers { repeated int32 ints = 1; repeated double doubles = 2; }
  message Metrics { map<string, double> values = 1; }
  message LargeRow {
    string transactionIdentifier = 1; string customerIdentifier = 2; string productDescription = 3;
    string fulfillmentLocation = 4; int32 quantityPurchased = 5; int64 unitPriceInCents = 6;
    int32 discountInBasisPoints = 7; bool requiresManualReview = 8;
  }
  message LargePayload { repeated LargeRow rows = 1; }
`).root

interface Case {
  readonly name: string
  readonly proto: string
  readonly schema: Schema.Top
  readonly value: unknown
}

const cases: ReadonlyArray<Case> = [
  {
    name: "small record",
    proto: "SmallRecord",
    schema: SmallRecord,
    value: { id: 42, active: true, score: 98.5, retryCount: 3, region: "eu-west-1", verified: false }
  },
  {
    name: "nested payload",
    proto: "NestedPayload",
    schema: NestedPayload,
    value: {
      orderId: "order-2026-10-23-000042",
      customer: { id: "customer-17", name: "Ada Lovelace", email: "ada@example.com" },
      lines: Array.from({ length: 8 }, (_, i) => ({ sku: `sku-${i}`, quantity: i + 1, unitPrice: 9.99 * (i + 1) })),
      createdAt: BigInt(1761206400000)
    }
  },
  {
    name: "packed numbers",
    proto: "Numbers",
    schema: Numbers,
    value: {
      ints: Array.from({ length: 1000 }, (_, i) => i * 37 - 5000),
      doubles: Array.from({ length: 1000 }, (_, i) => i * 1.25)
    }
  },
  {
    name: "string map",
    proto: "Metrics",
    schema: Metrics,
    value: { values: Object.fromEntries(Array.from({ length: 64 }, (_, i) => [`metric-${i}`, i * 1.25])) }
  },
  {
    name: "large payload",
    proto: "LargePayload",
    schema: LargePayload,
    value: {
      rows: Array.from({ length: 200 }, (_, i) => ({
        transactionIdentifier: `transaction-${i.toString().padStart(4, "0")}`,
        customerIdentifier: `customer-${i % 37}`,
        productDescription: `Product ${i % 19} with a repeated descriptive field value`,
        fulfillmentLocation: ["London", "New York", "Singapore", "Sydney"][i % 4]!,
        quantityPurchased: i % 9 + 1,
        unitPriceInCents: BigInt(500 + i % 73 * 25),
        discountInBasisPoints: i % 5 * 125,
        requiresManualReview: i % 17 === 0
      }))
    }
  }
]

const toProtobufjs = (value: unknown): unknown =>
  typeof value === "bigint"
    ? Number(value)
    : Array.isArray(value)
    ? value.map(toProtobufjs)
    : typeof value === "object" && value !== null
    ? Object.fromEntries(Object.entries(value).map(([k, v]) => [k, toProtobufjs(v)]))
    : value

const bench = new Bench({ time: 500 })

for (const { name, proto, schema, value } of cases) {
  const codec = Protobuf.toCodec(schema as Schema.Codec<unknown, unknown>)
  const encode = Schema.encodeUnknownSync(codec)
  const decode = Schema.decodeUnknownSync(codec)
  const bytes = encode(value)
  assert.deepStrictEqual(decode(bytes), value)

  const type: Type = protobufRoot.lookupType(`bench.${proto}`)
  const pbValue = toProtobufjs(value) as object
  const pbBytes = type.encode(pbValue).finish()
  assert.equal(pbBytes.length, bytes.length, `${name}: protobufjs size`)

  bench
    .add(`${name} / effect encode`, () => encode(value))
    .add(`${name} / protobufjs encode`, () => type.encode(pbValue).finish())
    .add(`${name} / effect decode`, () => decode(bytes))
    .add(`${name} / protobufjs decode`, () => type.toObject(type.decode(pbBytes) as Message, { longs: Number }))
}

await bench.run()

console.table(bench.tasks.map((task) => {
  const result = task.result
  if (result?.state !== "completed") return { Task: task.name, State: result?.state }
  return {
    Task: task.name,
    "Throughput avg (ops/s)": Math.round(result.throughput.mean),
    "Latency med (us/op)": (result.latency.p50 * 1_000).toFixed(2)
  }
}))
