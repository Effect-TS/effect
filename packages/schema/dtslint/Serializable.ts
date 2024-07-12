import { Schema, Serializable } from "@effect/schema"

class TR extends Schema.TaggedRequest<TR>()("TR", {
  failure: Schema.String,
  success: Schema.NumberFromString,
  payload: {
    id: Schema.NumberFromString
  }
}) {}

const successSchema = <Req extends Schema.TaggedProcedure.All>(req: Req) =>
  Serializable.successSchema(Serializable.asWithExit(req))

// $ExpectType Schema<number, string, never>
successSchema(new TR({ id: 1 }))

const failureSchema = <Req extends Schema.TaggedProcedure.All>(req: Req) =>
  Serializable.failureSchema(Serializable.asWithExit(req))

// $ExpectType Schema<string, string, never>
failureSchema(new TR({ id: 1 }))

const selfSchema = <Req extends Schema.TaggedProcedure.All>(req: Req) =>
  Serializable.selfSchema(Serializable.asSerializable(req))

// $ExpectType Schema<TR, Encoded<{ readonly _tag: PropertySignature<":", "TR", never, ":", "TR", true, never>; } & { id: typeof NumberFromString; }>, never>
selfSchema(new TR({ id: 1 }))
