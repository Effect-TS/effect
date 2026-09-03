import { Context, Effect, Exit, Schema, SchemaGetter } from "effect"
import { Reply, Snowflake } from "effect/unstable/cluster"
import { Rpc, RpcSerialization } from "effect/unstable/rpc"

export class SuccessDecoder extends Context.Service<SuccessDecoder, number>()("ReplyServices/SuccessDecoder") {}
export class SuccessEncoder extends Context.Service<SuccessEncoder, number>()("ReplyServices/SuccessEncoder") {}
export class ErrorDecoder extends Context.Service<ErrorDecoder, string>()("ReplyServices/ErrorDecoder") {}
export class ErrorEncoder extends Context.Service<ErrorEncoder, string>()("ReplyServices/ErrorEncoder") {}

export const decodedSuccess = Schema.Number.pipe(Schema.decodeTo(Schema.Number, {
  decode: SchemaGetter.transformOrFail((n) => Effect.map(SuccessDecoder, (scale) => n * scale)),
  encode: SchemaGetter.passthrough()
}))
export const encodedSuccess = Schema.Number.pipe(Schema.decodeTo(Schema.Number, {
  decode: SchemaGetter.passthrough(),
  encode: SchemaGetter.transformOrFail((n) => Effect.map(SuccessEncoder, (scale) => n / scale))
}))
export const decodedError = Schema.String.pipe(Schema.decodeTo(Schema.String, {
  decode: SchemaGetter.transformOrFail((s) => Effect.map(ErrorDecoder, (prefix) => prefix + s)),
  encode: SchemaGetter.passthrough()
}))
export const encodedError = Schema.String.pipe(Schema.decodeTo(Schema.String, {
  decode: SchemaGetter.passthrough(),
  encode: SchemaGetter.transformOrFail((s) => Effect.map(ErrorEncoder, (prefix) => prefix + s))
}))
export const asymmetricSuccess = decodedSuccess.pipe(Schema.decodeTo(encodedSuccess))
export const asymmetricError = decodedError.pipe(Schema.decodeTo(encodedError))
export const decodeRpc = Rpc.make("Decode", { payload: {}, success: decodedSuccess })
export const encodeRpc = Rpc.make("Encode", { payload: {}, success: encodedSuccess })
export const decodeErrorRpc = Rpc.make("DecodeError", { payload: {}, error: decodedError })
export const encodeErrorRpc = Rpc.make("EncodeError", { payload: {}, error: encodedError })
export const asymmetricRpc = Rpc.make("Asymmetric", {
  payload: {},
  success: asymmetricSuccess,
  error: asymmetricError
})
export const streamRpc = Rpc.make("Stream", { payload: {}, success: asymmetricSuccess, stream: true })
export const plainRpc = Rpc.make("Plain", { payload: {}, success: Schema.Number })
export const decodeCodec = Reply.Reply(decodeRpc, RpcSerialization.json.codecFor)
export const encodeCodec = Reply.Reply(encodeRpc, RpcSerialization.json.codecFor)
export const decodeErrorCodec = Reply.Reply(decodeErrorRpc, RpcSerialization.json.codecFor)
export const encodeErrorCodec = Reply.Reply(encodeErrorRpc, RpcSerialization.json.codecFor)
export const asymmetricCodec = Reply.Reply(asymmetricRpc, RpcSerialization.json.codecFor)
export const streamCodec = Reply.Reply(streamRpc, RpcSerialization.json.codecFor)
export const plainCodec = Reply.Reply(plainRpc, RpcSerialization.json.codecFor)
export const requestId = Snowflake.Snowflake(1n)
export const id = Snowflake.Snowflake(2n)
export const wire: Reply.WithExitEncoded<number, string> = {
  _tag: "WithExit",
  requestId: "1",
  id: "2",
  exit: { _tag: "Success", value: 21 }
}
export const errorWire: Reply.WithExitEncoded<number, string> = {
  _tag: "WithExit",
  requestId: "1",
  id: "2",
  exit: { _tag: "Failure", cause: [{ _tag: "Fail", error: "boom" }] }
}
export const value = new Reply.WithExit<typeof encodeRpc>({ requestId, id, exit: Exit.succeed(42) })
export const errorValue = new Reply.WithExit<typeof encodeErrorRpc>({ requestId, id, exit: Exit.fail("boom") })
export const asymmetricValue = new Reply.WithExit<typeof asymmetricRpc>({ requestId, id, exit: Exit.succeed(42) })
export const asymmetricErrorValue = new Reply.WithExit<typeof asymmetricRpc>({ requestId, id, exit: Exit.fail("boom") })
export const services = Context.make(SuccessDecoder, 2).pipe(
  Context.add(SuccessEncoder, 2),
  Context.add(ErrorDecoder, "decoded:"),
  Context.add(ErrorEncoder, "encoded:")
)
