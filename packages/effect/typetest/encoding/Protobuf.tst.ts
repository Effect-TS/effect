import { Context, Effect, type Option, Schema, SchemaGetter } from "effect"
import * as Protobuf from "effect/encoding/Protobuf"
import { describe, expect, it } from "tstyche"

class Decoding extends Context.Service<Decoding, string>()("Decoding") {}
class Encoding extends Context.Service<Encoding, string>()("Encoding") {}

const User = Protobuf.Message("acme.v1.User", {
  id: Protobuf.UInt64.pipe(Protobuf.field(1)),
  name: Schema.String.pipe(Protobuf.field(2))
})

const Checked = Protobuf.Message("acme.v1.Checked", {
  id: Schema.NumberFromString.pipe(
    Schema.decode({
      decode: SchemaGetter.checkEffect(() => Effect.as(Decoding, true)),
      encode: SchemaGetter.checkEffect(() => Effect.as(Encoding, true))
    }),
    Protobuf.field(1)
  )
})

// A recursive message, typed by an interface of its schema like protoc-gen-effect
// generates it: the annotated thunks keep the type from referring to itself.
const Expr = Protobuf.Message("acme.v1.Expr", {
  kind: Protobuf.Oneof({
    number: Protobuf.Double.pipe(Protobuf.field(1)),
    negate: Schema.suspend((): Schema.Codec<Expr> => Expr).pipe(Protobuf.field(2))
  }),
  args: Schema.Array(Schema.suspend((): Schema.Codec<Expr> => Expr)).pipe(Protobuf.field(3)),
  byName: Protobuf.Map(Schema.String, Schema.suspend((): Schema.Codec<Expr> => Expr)).pipe(Protobuf.field(4))
})
interface Expr extends Schema.Schema.Type<typeof Expr> {}

describe("Protobuf", () => {
  it("toCodec decodes the type of the schema from bytes", () => {
    const codec = Protobuf.toCodec(User)
    expect<typeof codec["Type"]>().type.toBe<
      { readonly id: bigint; readonly name: string; readonly [Protobuf.unknown]?: Uint8Array<ArrayBufferLike> }
    >()
    expect<typeof codec["Encoded"]>().type.toBe<Uint8Array<ArrayBuffer>>()
  })

  it("field keeps the optionality of a property", () => {
    const schema = Protobuf.Message("acme.v1.Optional", {
      a: Schema.optionalKey(Schema.String).pipe(Protobuf.field(1))
    })
    expect<typeof schema["Type"]["a"]>().type.toBe<string | undefined>()
    expect<keyof typeof schema["Type"]>().type.toBe<"a" | typeof Protobuf.unknown>()
  })

  it("toCodec keeps the services of the schema", () => {
    const codec = Protobuf.toCodec(Checked)
    expect<typeof codec["DecodingServices"]>().type.toBe<Decoding>()
    expect<typeof codec["EncodingServices"]>().type.toBe<Encoding>()
  })

  it("Enum is a union of its value names, and OpenEnum of numbers too", () => {
    const Closed = Protobuf.Enum("acme.v1.Status", { STATUS_UNSPECIFIED: 0, STATUS_ACTIVE: 1 })
    const Open = Protobuf.OpenEnum("acme.v1.Status", { STATUS_UNSPECIFIED: 0, STATUS_ACTIVE: 1 })
    expect<typeof Closed["Type"]>().type.toBe<"STATUS_UNSPECIFIED" | "STATUS_ACTIVE">()
    expect<typeof Open["Type"]>().type.toBe<"STATUS_UNSPECIFIED" | "STATUS_ACTIVE" | number>()
    expect(Protobuf.Enum).type.not.toBeCallableWith("acme.v1.Status", { STATUS_ACTIVE: [1, "STATUS_ACTIVE"] })
  })

  it("Oneof is an optional property of a tagged union of its cases", () => {
    const Choice = Protobuf.Oneof({
      text: Schema.String.pipe(Protobuf.field(1)),
      count: Protobuf.Int32.pipe(Protobuf.field(2))
    })
    expect<typeof Choice["Type"]>().type.toBe<
      { readonly _tag: "text"; readonly value: string } | { readonly _tag: "count"; readonly value: number }
    >()
    expect(Choice.schema.cases.text.fields.value).type.toBe<Schema.String>()
    expect(Choice).type.toBeAssignableTo<Schema.optionalKey<Schema.Top>>()
  })

  it("Map is a record of its key schema", () => {
    expect(Protobuf.Map(Protobuf.SInt32, Schema.String)).type.toBe<Schema.$Record<Schema.Number, Schema.String>>()
    expect(Protobuf.Map(Protobuf.Int64String, Schema.String)).type.toBe<Schema.$Record<Schema.String, Schema.String>>()
    expect(Protobuf.Map(Protobuf.BoolKey, Protobuf.Int32)).type.toBe<Schema.$Record<Schema.String, Schema.Number>>()
    expect(Protobuf.Map).type.not.toBeCallableWith(Schema.Boolean, Schema.String)
  })

  it("field, Message, Oneof, and Map type a recursive message through its interface", () => {
    expect<Expr["kind"]>().type.toBe<
      | { readonly _tag: "number"; readonly value: number }
      | { readonly _tag: "negate"; readonly value: Expr }
      | undefined
    >()
    expect<Expr["args"]>().type.toBe<ReadonlyArray<Expr>>()
    expect<Expr["byName"]>().type.toBe<{ readonly [x: string]: Expr }>()
    expect(Expr.fields.args).type.toBe<Schema.$Array<Schema.suspend<Schema.Codec<Expr>>>>()
    expect(Expr).type.toBeAssignableTo<Schema.Codec<Expr>>()
    expect<Expr[typeof Protobuf.unknown]>().type.toBe<Uint8Array<ArrayBufferLike> | undefined>()
  })

  it("Message keeps unknown fields at a symbol key", () => {
    const Kept = Protobuf.Message("acme.v1.Kept", { name: Schema.String.pipe(Protobuf.field(1)) })
    expect<typeof Kept["Type"]>().type.toBe<
      { readonly name: string; readonly [Protobuf.unknown]?: Uint8Array<ArrayBufferLike> }
    >()
    expect(Kept.fields.name).type.toBe<Schema.String>()
  })

  it("Message makes the struct of a class", () => {
    class Event extends Schema.Class<Event>("Event")(
      Protobuf.Message("acme.v1.Event", { id: Protobuf.Int32.pipe(Protobuf.field(1)) })
    ) {}
    expect(new Event({ id: 1 })[Protobuf.unknown]).type.toBe<Uint8Array<ArrayBufferLike> | undefined>()
  })

  it("extensions and Any are typed by their schema", () => {
    const Product = Protobuf.Message("acme.Product", { name: Schema.String.pipe(Protobuf.field(1)) })
    const priority = Protobuf.extension(Product, 100, Protobuf.Int32)
    expect(Protobuf.getExtension({ name: "a" }, priority)).type.toBe<Option.Option<number>>()
    expect(Protobuf.setExtension).type.not.toBeCallableWith({ name: "a" }, priority, "3")
    const any = Protobuf.anyPack(Product, { name: "a" })
    expect(Protobuf.anyUnpack(any, Product)).type.toBe<
      Option.Option<{ readonly name: string; readonly [Protobuf.unknown]?: Uint8Array<ArrayBufferLike> }>
    >()
    expect(Protobuf.anyUnpack(any, Protobuf.registry(Product))).type.toBe<Option.Option<unknown>>()
  })
})
