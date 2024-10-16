import { Schema } from "effect"
import { hole } from "effect/Function"

class TR extends Schema.TaggedRequest<TR>()("TR", {
  failure: Schema.String,
  success: Schema.NumberFromString,
  payload: {
    id: Schema.NumberFromString
  }
}) {}

const successSchema = <Req extends Schema.TaggedRequest.All>(req: Req) => Schema.successSchema(Schema.asWithResult(req))

// $ExpectType Schema<number, string, never>
successSchema(new TR({ id: 1 }))

const failureSchema = <Req extends Schema.TaggedRequest.All>(req: Req) => Schema.failureSchema(Schema.asWithResult(req))

// $ExpectType Schema<string, string, never>
failureSchema(new TR({ id: 1 }))

const selfSchema = <Req extends Schema.TaggedRequest.All>(req: Req) =>
  Schema.serializableSchema(Schema.asSerializable(req))

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
hole<Schema.Serializable.Type<InstanceType<typeof Foo>>>()

// $ExpectType Encoded<{ readonly _tag: tag<"A">; } & { a: Schema<"payload", "payload-encoded", "payload-context">; }>
hole<Schema.Serializable.Encoded<InstanceType<typeof Foo>>>()

// $ExpectType "payload-context"
hole<Schema.Serializable.Context<InstanceType<typeof Foo>>>()

// ---------------------------------------------
// WithResult type-level helpers
// ---------------------------------------------

// $ExpectType "success"
hole<Schema.WithResult.Success<InstanceType<typeof Foo>>>()

// $ExpectType "success-encoded"
hole<Schema.WithResult.SuccessEncoded<InstanceType<typeof Foo>>>()

// $ExpectType "failure"
hole<Schema.WithResult.Failure<InstanceType<typeof Foo>>>()

// $ExpectType "failure-encoded"
hole<Schema.WithResult.FailureEncoded<InstanceType<typeof Foo>>>()

// $ExpectType "failure-context" | "success-context"
hole<Schema.WithResult.Context<InstanceType<typeof Foo>>>()

// ---------------------------------------------
// SerializableWithResult type-level helpers
// ---------------------------------------------

// $ExpectType "failure-context" | "success-context" | "payload-context"
hole<Schema.SerializableWithResult.Context<InstanceType<typeof Foo>>>()
