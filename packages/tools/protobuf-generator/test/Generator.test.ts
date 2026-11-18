/**
 * The modules generated for the sample `.proto` files are pinned by snapshot
 * files under `test/generated/`, which `pnpm check` typechecks and these
 * tests import. Run with `-u` to update them after an intended change.
 */
import * as Generator from "@effect/protobuf-generator/Generator"
import { assert, describe, it } from "@effect/vitest"
import { ProtobufDescriptorProto, ProtobufMessage } from "effect/protobuf"
import * as Result from "effect/Result"
import * as Legacy from "./generated/acme/legacy/v1/legacy.proto.ts"
import * as Order from "./generated/acme/shop/v1/order.proto.ts"
import { files, samples } from "./utils/generator.ts"

const sampleFiles = ["acme/common/v1/money.proto", "acme/shop/v1/order.proto", "acme/legacy/v1/legacy.proto"]

describe("Generator", () => {
  it("generates a module per file", async ({ expect }) => {
    const generated = files(Generator.generate({
      file_to_generate: sampleFiles,
      parameter: "import_extension=ts",
      proto_file: samples
    }))
    assert.deepStrictEqual(Object.keys(generated), sampleFiles.map((name) => name.replace(/\.proto$/, ".proto.ts")))
    for (const [name, content] of Object.entries(generated)) {
      await expect(content).toMatchFileSnapshot(`./generated/${name}`)
    }
  })

  it("resolves each file against the modules of its imports", () => {
    assert.strictEqual(Order.orderFile.name, "acme/shop/v1/order.proto")
    const price = Order.Order_Item.fields.find((field) => field.name === "price")!
    assert.strictEqual(price.type.kind === "message" && price.type.message.typeName, "acme.common.v1.Money")
    assert.strictEqual(Order.sensitive.extendee, ProtobufDescriptorProto.FieldOptions)
    assert.deepStrictEqual(Order.Order.messages, [Order.Order_Item, Order.Order_Voucher])
    const [getOrder] = Order.Orders.methods
    assert.strictEqual(getOrder.input, Order.Order)
    assert.strictEqual(getOrder.idempotency, "noSideEffects")
  })

  it("encodes and decodes the values its interfaces describe", () => {
    const order: Order.Order = {
      id: "o-1",
      status: Order.Order_Status.STATUS_PAID,
      items: [{ sku: "lamp", quantity: 2, price: { currency_code: "EUR", units: "12", nanos: 500_000_000 } }],
      labels: { channel: "web" },
      payment: { _tag: "voucher", value: { code: "WELCOME" } },
      version: 3n
    }
    const bytes = Result.getOrThrow(ProtobufMessage.encode(Order.Order)(order))
    const decoded = Result.getOrThrow(ProtobufMessage.decode(Order.Order)(bytes)) as Order.Order
    assert.deepStrictEqual(decoded.payment, { _tag: "voucher", value: { code: "WELCOME" } })
    assert.deepStrictEqual(decoded.items?.[0].price, { currency_code: "EUR", units: "12", nanos: 500_000_000 })
    assert.strictEqual(decoded.version, 3n)
  })

  it("keeps custom options, which extensions read", () => {
    const note = Order.Order.fields.find((field) => field.name === "note")!
    assert.strictEqual(Result.getOrThrow(ProtobufMessage.getExtension(note.proto.options!, Order.sensitive)), true)
  })

  it("appends $ to names that generated code reserves", () => {
    assert.strictEqual(Legacy.Uint8Array$.typeName, "acme.legacy.v1.Uint8Array")
    assert.strictEqual(Legacy.owner.extendee, Legacy.Record)
  })

  it("reports invalid parameters in the response", () => {
    const response = Generator.generate({ file_to_generate: [], parameter: "import_extension=mjs", proto_file: [] })
    assert.match(response.error ?? "", /^invalid plugin parameters/)
  })

  it("reports two types with the same name in the response", () => {
    const response = Generator.generate({
      file_to_generate: ["a.proto"],
      proto_file: [{
        name: "a.proto",
        syntax: "proto3",
        message_type: [{ name: "A_B" }, { name: "A", nested_type: [{ name: "B" }] }]
      }]
    })
    assert.strictEqual(response.error, "a.proto: A_B and A.B are both named A_B")
  })
})
