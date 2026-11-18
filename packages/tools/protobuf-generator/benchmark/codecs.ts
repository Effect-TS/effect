/**
 * effect/protobuf against protobuf-es (`@bufbuild/protobuf`), decoding and
 * encoding the same bytes. Both derive their codecs from descriptors. Run with
 * `node benchmark/codecs.ts`.
 *
 * protobuf-es reads the same `.proto` files, from the descriptor set of the
 * fixtures, which is what its generated modules embed. Each library encodes
 * the value it decoded from the shared bytes.
 */
import { createFileRegistry, type DescMessage, fromBinary, toBinary } from "@bufbuild/protobuf"
import { FileDescriptorSetSchema } from "@bufbuild/protobuf/wkt"
import type { ProtobufDescriptor } from "effect/protobuf"
import { ProtobufDescriptorProto, ProtobufMessage } from "effect/protobuf"
import * as Result from "effect/Result"
import { readFileSync } from "node:fs"
import { Bench } from "tinybench"
import * as Money from "../test/generated/acme/common/v1/money.proto.ts"
import * as Series from "../test/generated/acme/metrics/v1/series.proto.ts"
import * as Order from "../test/generated/acme/shop/v1/order.proto.ts"

const money: Money.Money = { currency_code: "EUR", units: "12", nanos: 500_000_000 }

const order: Order.Order = {
  id: "o-12345",
  status: Order.Order_Status.STATUS_PAID,
  items: Array.from({ length: 10 }, (_, i) => ({ sku: `sku-${i}`, quantity: i + 1, price: money })),
  labels: { channel: "web", region: "eu", tier: "gold", campaign: "spring", source: "newsletter" },
  payment: { _tag: "voucher", value: { code: "WELCOME" } },
  version: 3n,
  signature: new Uint8Array(32).fill(7),
  totals_by_year: { "2024": money, "2025": money, "2026": money }
}

const batch: Series.Batch = {
  series: Array.from({ length: 20 }, (_, s) => ({
    name: `http_requests_${s}`,
    labels: { host: `web-${s}`, method: "GET", status: "200" },
    timestamps: Array.from({ length: 100 }, (_, i) => 1_763_000_000_000n + BigInt(i * 1000)),
    values: Array.from({ length: 100 }, (_, i) => i * 1.5)
  }))
}

const read = (path: string) => new Uint8Array(readFileSync(new URL(path, import.meta.url)))
const descriptorSet = read("../../../effect/test/fixtures/protobuf/descriptor-set.binpb")
const registry = createFileRegistry(fromBinary(FileDescriptorSetSchema, read("../test/fixtures/protos.binpb")))
const es = (typeName: string): DescMessage => {
  const schema = registry.getMessage(typeName)
  if (schema === undefined) throw new Error(`protobuf-es: no message ${typeName}`)
  return schema
}

interface Case {
  readonly name: string
  readonly descriptor: ProtobufDescriptor.MessageDescriptor
  readonly es: DescMessage
  readonly value: object
}

const cases: ReadonlyArray<Case> = [
  { name: "Money", descriptor: Money.Money, es: es("acme.common.v1.Money"), value: money },
  { name: "Order", descriptor: Order.Order, es: es("acme.shop.v1.Order"), value: order },
  { name: "Batch (20×100 points)", descriptor: Series.Batch, es: es("acme.metrics.v1.Batch"), value: batch },
  {
    name: `FileDescriptorSet (${(descriptorSet.length / 1024).toFixed(0)} KiB)`,
    descriptor: ProtobufDescriptorProto.FileDescriptorSet,
    es: FileDescriptorSetSchema,
    value: Result.getOrThrow(ProtobufMessage.decode(ProtobufDescriptorProto.FileDescriptorSet)(descriptorSet))
  }
]

const same = (a: Uint8Array, b: Uint8Array) => a.length === b.length && a.every((byte, i) => byte === b[i])

const prepared = cases.map((item) => {
  const decode = ProtobufMessage.decode(item.descriptor)
  const encode = ProtobufMessage.encode(item.descriptor)
  const bytes = Result.getOrThrow(encode(item.value))
  const esValue = fromBinary(item.es, bytes)
  // Both must agree before they are compared.
  if (!same(toBinary(item.es, esValue), bytes)) throw new Error(`${item.name}: protobuf-es encodes differently`)
  return { ...item, decode, encode, bytes, esValue }
})

// Both libraries share their codec code between message types. Running every
// type first measures them as a program with several types runs them, not
// specialized to the first type measured.
for (let i = 0; i < 200; i++) {
  for (const { bytes, decode, encode, es, esValue, value } of prepared) {
    decode(bytes)
    encode(value)
    fromBinary(es, bytes)
    toBinary(es, esValue)
  }
}

const bench = new Bench({ time: 1000, warmup: true })
for (const { bytes, decode, encode, es, esValue, name, value } of prepared) {
  bench
    .add(`${name} decode effect`, () => decode(bytes))
    .add(`${name} decode protobuf-es`, () => fromBinary(es, bytes))
    .add(`${name} encode effect`, () => encode(value))
    .add(`${name} encode protobuf-es`, () => toBinary(es, esValue))
}

await bench.run()

// Operations per second per case and direction.
const throughput = new Map(bench.tasks.map((task) => [task.name, (task.result as any).throughput?.mean as number]))
const rows = cases.flatMap(({ name }) =>
  (["decode", "encode"] as const).map((direction) => {
    const effect = throughput.get(`${name} ${direction} effect`)!
    const protobufEs = throughput.get(`${name} ${direction} protobuf-es`)!
    return {
      case: name,
      direction,
      "effect ops/s": Math.round(effect),
      "protobuf-es ops/s": Math.round(protobufEs),
      "effect / protobuf-es": `${(effect / protobufEs).toFixed(2)}x`
    }
  })
)
console.table(rows)
