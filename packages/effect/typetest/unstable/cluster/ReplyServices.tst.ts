import { Effect, Schema } from "effect"
import { Reply } from "effect/unstable/cluster"
import { Rpc, RpcSerialization } from "effect/unstable/rpc"
import { describe, expect, it } from "tstyche"
import * as F from "../../../test/cluster/ReplyServices.fixture.ts"

describe("Reply service directions", () => {
  it("fixture requirements survive before the wrapper", () => {
    expect<typeof F.decodedSuccess.DecodingServices>().type.toBe<F.SuccessDecoder>()
    expect<typeof F.decodedSuccess.EncodingServices>().type.toBe<never>()
    expect<typeof F.encodedSuccess.DecodingServices>().type.toBe<never>()
    expect<typeof F.encodedSuccess.EncodingServices>().type.toBe<F.SuccessEncoder>()
    expect<typeof F.decodedError.DecodingServices>().type.toBe<F.ErrorDecoder>()
    expect<typeof F.decodedError.EncodingServices>().type.toBe<never>()
    expect<typeof F.encodedError.DecodingServices>().type.toBe<never>()
    expect<typeof F.encodedError.EncodingServices>().type.toBe<F.ErrorEncoder>()
    expect<typeof F.asymmetricSuccess.DecodingServices>().type.toBe<F.SuccessDecoder>()
    expect<typeof F.asymmetricSuccess.EncodingServices>().type.toBe<F.SuccessEncoder>()
    expect<typeof F.asymmetricError.DecodingServices>().type.toBe<F.ErrorDecoder>()
    expect<typeof F.asymmetricError.EncodingServices>().type.toBe<F.ErrorEncoder>()
    expect<typeof F.asymmetricRpc.payloadSchema.DecodingServices>().type.toBe<never>()
    expect<typeof F.asymmetricRpc.payloadSchema.EncodingServices>().type.toBe<never>()
  })

  it("direct WithExit and codecFor preserve directions", () => {
    const direct = Reply.WithExit.schema(F.asymmetricRpc)
    const json = RpcSerialization.json.codecFor(direct)
    expect<typeof direct.DecodingServices>().type.toBe<F.SuccessDecoder | F.ErrorDecoder>()
    expect<typeof direct.EncodingServices>().type.toBe<F.SuccessEncoder | F.ErrorEncoder>()
    expect<typeof json.DecodingServices>().type.toBe<F.SuccessDecoder | F.ErrorDecoder>()
    expect<typeof json.EncodingServices>().type.toBe<F.SuccessEncoder | F.ErrorEncoder>()
    expect<Rpc.ServicesClient<typeof F.asymmetricRpc>>().type.toBe<F.SuccessDecoder | F.ErrorDecoder>()
    expect<Rpc.ServicesServer<typeof F.asymmetricRpc>>().type.toBe<F.SuccessEncoder | F.ErrorEncoder>()
  })

  it("decode-only success rejects an unprovided decoder and accepts the correct provision", () => {
    const operation = Schema.decodeEffect(F.decodeCodec)(F.wire)
    const provided = operation.pipe(Effect.provideService(F.SuccessDecoder, 2))
    expect(operation).type.not.toBeAssignableTo<Effect.Effect<Reply.Reply<typeof F.decodeRpc>, Schema.SchemaError>>()
    expect(Effect.runPromise).type.not.toBeCallableWith(operation)
    expect(Effect.runPromise).type.toBeCallableWith(provided)
    expect(Schema.decodeSync).type.not.toBeCallableWith(F.decodeCodec)
    expect(Schema.encodeSync).type.toBeCallableWith(F.decodeCodec)
  })

  it("encode-only success rejects an unprovided encoder and accepts the correct provision", () => {
    const operation = Schema.encodeEffect(F.encodeCodec)(F.value)
    const provided = operation.pipe(Effect.provideService(F.SuccessEncoder, 2))
    expect(operation).type.not.toBeAssignableTo<Effect.Effect<Reply.Encoded, Schema.SchemaError>>()
    expect(Effect.runPromise).type.not.toBeCallableWith(operation)
    expect(Effect.runPromise).type.toBeCallableWith(provided)
    expect(Schema.decodeSync).type.toBeCallableWith(F.encodeCodec)
    expect(Schema.encodeSync).type.not.toBeCallableWith(F.encodeCodec)
  })

  it("decode-only error keeps the error decoder at the public call site", () => {
    const operation = Schema.decodeEffect(F.decodeErrorCodec)(F.errorWire)
    const provided = operation.pipe(Effect.provideService(F.ErrorDecoder, "decoded:"))
    expect(operation).type.not.toBeAssignableTo<
      Effect.Effect<Reply.Reply<typeof F.decodeErrorRpc>, Schema.SchemaError>
    >()
    expect(Effect.runPromise).type.not.toBeCallableWith(operation)
    expect(Effect.runPromise).type.toBeCallableWith(provided)
    expect(Schema.decodeSync).type.not.toBeCallableWith(F.decodeErrorCodec)
    expect(Schema.encodeSync).type.toBeCallableWith(F.decodeErrorCodec)
  })

  it("encode-only error keeps the error encoder at the public call site", () => {
    const operation = Schema.encodeEffect(F.encodeErrorCodec)(F.errorValue)
    const provided = operation.pipe(Effect.provideService(F.ErrorEncoder, "encoded:"))
    expect(operation).type.not.toBeAssignableTo<Effect.Effect<Reply.Encoded, Schema.SchemaError>>()
    expect(Effect.runPromise).type.not.toBeCallableWith(operation)
    expect(Effect.runPromise).type.toBeCallableWith(provided)
    expect(Schema.decodeSync).type.toBeCallableWith(F.encodeErrorCodec)
    expect(Schema.encodeSync).type.not.toBeCallableWith(F.encodeErrorCodec)
  })

  it("asymmetric success and error accept only the appropriate provision", () => {
    const decode = Schema.decodeEffect(F.asymmetricCodec)(F.wire).pipe(
      Effect.provideService(F.SuccessDecoder, 2),
      Effect.provideService(F.ErrorDecoder, "decoded:")
    )
    const encode = Schema.encodeEffect(F.asymmetricCodec)(F.asymmetricValue).pipe(
      Effect.provideService(F.SuccessEncoder, 2),
      Effect.provideService(F.ErrorEncoder, "encoded:")
    )
    expect<typeof F.asymmetricCodec.DecodingServices>().type.toBe<F.SuccessDecoder | F.ErrorDecoder>()
    expect<typeof F.asymmetricCodec.EncodingServices>().type.toBe<F.SuccessEncoder | F.ErrorEncoder>()
    expect(Effect.runPromise).type.toBeCallableWith(decode)
    expect(Effect.runPromise).type.toBeCallableWith(encode)
  })

  it("stream chunks preserve success directions", () => {
    const direct = RpcSerialization.json.codecFor(Reply.Chunk.schema(F.streamRpc))
    expect<typeof direct.DecodingServices>().type.toBe<F.SuccessDecoder>()
    expect<typeof direct.EncodingServices>().type.toBe<F.SuccessEncoder>()
    expect<typeof F.streamCodec.DecodingServices>().type.toBe<F.SuccessDecoder>()
    expect<typeof F.streamCodec.EncodingServices>().type.toBe<F.SuccessEncoder>()
  })

  it("service-free replies stay service free", () => {
    expect<typeof F.plainCodec.DecodingServices>().type.toBe<never>()
    expect<typeof F.plainCodec.EncodingServices>().type.toBe<never>()
    expect(Schema.decodeSync).type.toBeCallableWith(F.plainCodec)
    expect(Schema.encodeSync).type.toBeCallableWith(F.plainCodec)
  })

  it("retains conservative payload requirements from the existing aliases", () => {
    const rpc = Rpc.make("Payload", { payload: { n: F.asymmetricSuccess }, success: Schema.Number })
    const codec = Reply.Reply(rpc, RpcSerialization.json.codecFor)
    expect<typeof codec.DecodingServices>().type.toBe<F.SuccessEncoder>()
    expect<typeof codec.EncodingServices>().type.toBe<F.SuccessDecoder>()
  })
})
