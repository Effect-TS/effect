import { Schema } from "effect"
import { hole } from "effect/Function"
import { describe, expect, it } from "tstyche"

class TR extends Schema.TaggedRequest<TR>()("TR", {
  failure: Schema.String,
  success: Schema.NumberFromString,
  payload: {
    id: Schema.NumberFromString
  }
}) {}

const successSchema = <Req extends Schema.TaggedRequest.All>(req: Req) => Schema.successSchema(Schema.asWithResult(req))

const failureSchema = <Req extends Schema.TaggedRequest.All>(req: Req) => Schema.failureSchema(Schema.asWithResult(req))

const selfSchema = <Req extends Schema.TaggedRequest.All>(req: Req) =>
  Schema.serializableSchema(Schema.asSerializable(req))

declare const F: Schema.Schema<"failure", "failure-encoded", "failure-context">
declare const S_: Schema.Schema<"success", "success-encoded", "success-context">
declare const P: {
  a: Schema.Schema<"payload", "payload-encoded", "payload-context">
}

class Foo extends Schema.TaggedRequest<Foo>()("A", {
  failure: F,
  success: S_,
  payload: P
}) {}

describe("Schema Serializable", () => {
  it("Serializable type-level helpers", () => {
    expect(hole<Schema.Serializable.Type<InstanceType<typeof Foo>>>()).type.toBe<Foo>()

    expect(hole<Schema.Serializable.Encoded<InstanceType<typeof Foo>>>()).type.toBe<
      Schema.Struct.Encoded<
        { readonly _tag: Schema.tag<"A"> } & { a: Schema.Schema<"payload", "payload-encoded", "payload-context"> }
      >
    >()

    expect(hole<Schema.Serializable.Context<InstanceType<typeof Foo>>>()).type.toBe<"payload-context">()
  })

  it("successSchema", () => {
    expect(successSchema(new TR({ id: 1 }))).type.toBe<Schema.Schema<number, string, never>>()
  })

  it("failureSchema", () => {
    expect(failureSchema(new TR({ id: 1 }))).type.toBe<Schema.Schema<string, string, never>>()
  })

  it("selfSchema", () => {
    expect(selfSchema(new TR({ id: 1 }))).type.toBe<
      Schema.Schema<
        TR,
        Schema.Struct.Encoded<{ readonly _tag: Schema.tag<"TR"> } & { id: typeof Schema.NumberFromString }>,
        never
      >
    >()
  })

  it("WithResult type-level helpers", () => {
    expect(hole<Schema.WithResult.Success<InstanceType<typeof Foo>>>()).type.toBe<"success">()
    expect(hole<Schema.WithResult.SuccessEncoded<InstanceType<typeof Foo>>>()).type.toBe<"success-encoded">()
    expect(hole<Schema.WithResult.Failure<InstanceType<typeof Foo>>>()).type.toBe<"failure">()
    expect(hole<Schema.WithResult.FailureEncoded<InstanceType<typeof Foo>>>()).type.toBe<"failure-encoded">()
    expect(hole<Schema.WithResult.Context<InstanceType<typeof Foo>>>()).type.toBe<
      "failure-context" | "success-context"
    >()
  })

  it("SerializableWithResult type-level helpers", () => {
    expect(hole<Schema.SerializableWithResult.Context<InstanceType<typeof Foo>>>()).type.toBe<
      "failure-context" | "success-context" | "payload-context"
    >()
  })
})
