import { Schema, Serializable } from "effect"
import { hole } from "effect/Function"

class TR extends Schema.TaggedRequest<TR>()("TR", {
  failure: Schema.String,
  success: Schema.NumberFromString,
  payload: {
    id: Schema.NumberFromString
  }
}) {}

const successSchema = <Req extends Schema.TaggedRequest.All>(req: Req) =>
  Serializable.successSchema(Serializable.asWithResult(req))

// $ExpectType Schema<number, string, never>
successSchema(new TR({ id: 1 }))

const failureSchema = <Req extends Schema.TaggedRequest.All>(req: Req) =>
  Serializable.failureSchema(Serializable.asWithResult(req))

// $ExpectType Schema<string, string, never>
failureSchema(new TR({ id: 1 }))

const selfSchema = <Req extends Schema.TaggedRequest.All>(req: Req) =>
  Serializable.selfSchema(Serializable.asSerializable(req))

// $ExpectType Schema<TR, Encoded<{ readonly _tag: tag<"TR">; } & { id: typeof NumberFromString; }>, never>
selfSchema(new TR({ id: 1 }))

declare const F: Schema.Schema<"failure", "failure-encoded", "failure-context">
declare const S: Schema.Schema<"success", "success-encoded", "success-context">
declare const P: {
  a: Schema.Schema<"payload", "payload-encoded", "payload-context">
}

class Foo extends Schema.TaggedRequest<Foo>()("A", {
  failure: F,
  success: S,
  payload: P
}) {}

// ---------------------------------------------
// Serializable type-level helpers
// ---------------------------------------------

// $ExpectType Foo
hole<Serializable.Serializable.Type<InstanceType<typeof Foo>>>()

// $ExpectType Encoded<{ readonly _tag: tag<"A">; } & { a: Schema<"payload", "payload-encoded", "payload-context">; }>
hole<Serializable.Serializable.Encoded<InstanceType<typeof Foo>>>()

// $ExpectType "payload-context"
hole<Serializable.Serializable.Context<InstanceType<typeof Foo>>>()

// ---------------------------------------------
// WithResult type-level helpers
// ---------------------------------------------

// $ExpectType "success"
hole<Serializable.WithResult.Success<InstanceType<typeof Foo>>>()

// $ExpectType "success-encoded"
hole<Serializable.WithResult.SuccessEncoded<InstanceType<typeof Foo>>>()

// $ExpectType "failure"
hole<Serializable.WithResult.Failure<InstanceType<typeof Foo>>>()

// $ExpectType "failure-encoded"
hole<Serializable.WithResult.FailureEncoded<InstanceType<typeof Foo>>>()

// $ExpectType "failure-context" | "success-context"
hole<Serializable.WithResult.Context<InstanceType<typeof Foo>>>()

// ---------------------------------------------
// SerializableWithResult type-level helpers
// ---------------------------------------------

// $ExpectType "failure-context" | "success-context" | "payload-context"
hole<Serializable.SerializableWithResult.Context<InstanceType<typeof Foo>>>()
