import { Context, Effect, Layer, Schema, SchemaGetter } from "effect"
import { Entity, EntityProxy, EntityProxyServer, type Sharding, TestRunner } from "effect/unstable/cluster"
import { HttpApi } from "effect/unstable/httpapi"
import { Rpc, RpcClient, RpcGroup } from "effect/unstable/rpc"
import { describe, expect, it } from "tstyche"

class PayloadEncoder extends Context.Service<PayloadEncoder, {}>()("PayloadEncoder") {}
class SuccessDecoder extends Context.Service<SuccessDecoder, {}>()("SuccessDecoder") {}
class ErrorDecoder extends Context.Service<ErrorDecoder, {}>()("ErrorDecoder") {}
class ServerCodec extends Context.Service<ServerCodec, {}>()("ServerCodec") {}

const payload = Schema.String.pipe(Schema.decodeTo(Schema.String, {
  decode: SchemaGetter.passthrough(),
  encode: SchemaGetter.transformOrFail((value: string) => Effect.as(PayloadEncoder, value))
}))
const success = Schema.String.pipe(Schema.decodeTo(Schema.String, {
  decode: SchemaGetter.transformOrFail((value: string) => Effect.as(SuccessDecoder, value)),
  encode: SchemaGetter.passthrough()
}))
const error = Schema.String.pipe(Schema.decodeTo(Schema.String, {
  decode: SchemaGetter.transformOrFail((value: string) => Effect.as(ErrorDecoder, value)),
  encode: SchemaGetter.passthrough()
}))
const serverOnly = Schema.String.pipe(Schema.decodeTo(Schema.String, {
  decode: SchemaGetter.transformOrFail((value: string) => Effect.as(ServerCodec, value)),
  encode: SchemaGetter.passthrough()
}))
const symmetric = Schema.String.pipe(Schema.decodeTo(Schema.String, {
  decode: SchemaGetter.transformOrFail((value: string) => Effect.as(ServerCodec, value)),
  encode: SchemaGetter.transformOrFail((value: string) => Effect.as(ServerCodec, value))
}))

const rpc = Rpc.make("Echo", { payload, success, error })
const entity = Entity.make("Asymmetric", [rpc])
const api = HttpApi.make("api").add(EntityProxy.toHttpApiGroup("entity", entity))
const rpcHandlers = EntityProxyServer.layerRpcHandlers(entity)
const httpHandlers = EntityProxyServer.layerHttpApi(api, "entity", entity)
const allCodecs = Layer.mergeAll(
  Layer.succeed(PayloadEncoder, {}),
  Layer.succeed(SuccessDecoder, {}),
  Layer.succeed(ErrorDecoder, {})
)
type ClientCodecs = PayloadEncoder | SuccessDecoder | ErrorDecoder

describe("EntityProxyServer codec services", () => {
  it("infers each real asymmetric schema direction before wrapping", () => {
    expect<typeof payload.DecodingServices>().type.toBe<never>()
    expect<typeof payload.EncodingServices>().type.toBe<PayloadEncoder>()
    expect<typeof success.DecodingServices>().type.toBe<SuccessDecoder>()
    expect<typeof success.EncodingServices>().type.toBe<never>()
    expect<typeof error.DecodingServices>().type.toBe<ErrorDecoder>()
    expect<typeof error.EncodingServices>().type.toBe<never>()
    expect<Rpc.ServicesClient<typeof rpc>>().type.toBe<ClientCodecs>()
    expect<Rpc.ServicesServer<typeof rpc>>().type.toBe<never>()
  })

  it("direct RpcClient and Entity.client already retain client services", () => {
    const direct = Effect.gen(function*() {
      const client = yield* RpcClient.make(RpcGroup.make(rpc))
      return yield* client.Echo("hello")
    })
    const clustered = Effect.gen(function*() {
      const client = yield* entity.client
      return yield* client("one").Echo("hello")
    }).pipe(Effect.provide(TestRunner.layer))
    expect<Extract<Effect.Services<typeof direct>, ClientCodecs>>().type.toBe<ClientCodecs>()
    expect<Effect.Services<typeof clustered>>().type.toBe<ClientCodecs>()
    expect(Effect.runPromise).type.not.toBeCallableWith(clustered)
    expect(Effect.runPromise).type.toBeCallableWith(clustered.pipe(Effect.provide(allCodecs)))
  })

  it("RPC handler layer requires all client codec directions", () => {
    expect<Layer.Services<typeof rpcHandlers>>().type.toBe<Sharding.Sharding | ClientCodecs>()
  })

  it("HTTP handler layer requires all client codec directions", () => {
    expect<Layer.Services<typeof httpHandlers>>().type.toBe<Sharding.Sharding | ClientCodecs>()
  })

  it("RPC layer composition rejects missing client provision", () => {
    const partial = rpcHandlers.pipe(Layer.provide(TestRunner.layer))
    const complete = partial.pipe(Layer.provide(allCodecs))
    expect<[Layer.Services<typeof partial>]>().type.toBe<[ClientCodecs]>()
    expect(Effect.runPromise).type.not.toBeCallableWith(Layer.launch(partial))
    expect<Layer.Services<typeof complete>>().type.toBe<never>()
    expect(Effect.runPromise).type.toBeCallableWith(Layer.launch(complete))
  })

  it("HTTP layer composition rejects missing client provision", () => {
    const partial = httpHandlers.pipe(Layer.provide(TestRunner.layer))
    const complete = partial.pipe(Layer.provide(allCodecs))
    expect<[Layer.Services<typeof partial>]>().type.toBe<[ClientCodecs]>()
    expect(Effect.runPromise).type.not.toBeCallableWith(Layer.launch(partial))
    expect<Layer.Services<typeof complete>>().type.toBe<never>()
    expect(Effect.runPromise).type.toBeCallableWith(Layer.launch(complete))
  })

  it("retains server-only requirements in both layers", () => {
    const serverRpc = Rpc.make("Echo", { payload: serverOnly, success: Schema.String })
    const server = Entity.make("ServerOnly", [serverRpc])
    const serverApi = HttpApi.make("server").add(EntityProxy.toHttpApiGroup("entity", server))
    const rpcLayer = EntityProxyServer.layerRpcHandlers(server)
    const httpLayer = EntityProxyServer.layerHttpApi(serverApi, "entity", server)
    expect<typeof serverOnly.DecodingServices>().type.toBe<ServerCodec>()
    expect<typeof serverOnly.EncodingServices>().type.toBe<never>()
    expect<Rpc.ServicesClient<typeof serverRpc>>().type.toBe<never>()
    expect<Layer.Services<typeof rpcLayer>>().type.toBe<Sharding.Sharding | ServerCodec>()
    expect<Layer.Services<typeof httpLayer>>().type.toBe<Sharding.Sharding | ServerCodec>()
  })

  it("symmetric codecs remain unchanged", () => {
    const both = Entity.make("Symmetric", [Rpc.make("Echo", { payload: symmetric, success: symmetric })])
    const bothApi = HttpApi.make("both").add(EntityProxy.toHttpApiGroup("entity", both))
    const rpcLayer = EntityProxyServer.layerRpcHandlers(both)
    const httpLayer = EntityProxyServer.layerHttpApi(bothApi, "entity", both)
    expect<typeof symmetric.DecodingServices>().type.toBe<ServerCodec>()
    expect<typeof symmetric.EncodingServices>().type.toBe<ServerCodec>()
    expect<Layer.Services<typeof rpcLayer>>().type.toBe<Sharding.Sharding | ServerCodec>()
    expect<Layer.Services<typeof httpLayer>>().type.toBe<Sharding.Sharding | ServerCodec>()
  })

  it("plain codecs need only Sharding", () => {
    const plain = Entity.make("Plain", [Rpc.make("Echo", { payload: Schema.String, success: Schema.String })])
    const plainApi = HttpApi.make("plain").add(EntityProxy.toHttpApiGroup("entity", plain))
    const rpcLayer = EntityProxyServer.layerRpcHandlers(plain)
    const httpLayer = EntityProxyServer.layerHttpApi(plainApi, "entity", plain)
    expect<Layer.Services<typeof rpcLayer>>().type.toBe<Sharding.Sharding>()
    expect<Layer.Services<typeof httpLayer>>().type.toBe<Sharding.Sharding>()
    expect(Effect.runPromise).type.toBeCallableWith(Layer.launch(rpcLayer.pipe(Layer.provide(TestRunner.layer))))
    expect(Effect.runPromise).type.toBeCallableWith(Layer.launch(httpLayer.pipe(Layer.provide(TestRunner.layer))))
  })
})
