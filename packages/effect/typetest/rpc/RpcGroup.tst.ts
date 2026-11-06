import type { Cause } from "effect"
import { Context, Deferred, Effect, Queue, Schema, Stream } from "effect"
import type * as Layer from "effect/Layer"
import * as Rpc from "effect/rpc/Rpc"
import * as RpcGroup from "effect/rpc/RpcGroup"
import * as RpcMiddleware from "effect/rpc/RpcMiddleware"
import { describe, expect, it } from "tstyche"

class Db extends Context.Service<Db, {
  readonly value: string
}>()("Db") {}

class Metrics extends Context.Service<Metrics, {
  readonly value: string
}>()("Metrics") {}

const GetUser = Rpc.make("GetUser", { success: Schema.String })
const UpdateUser = Rpc.make("UpdateUser", { success: Schema.String })
const Group = RpcGroup.make(GetUser, UpdateUser)

class NotFound extends Schema.TaggedError<NotFound>()("NotFound", {}) {}
class Unauthorized extends Schema.TaggedError<Unauthorized>()("Unauthorized", {}) {}
class Unknown extends Schema.TaggedError<Unknown>()("Unknown", {}) {}
class ClientFailure extends Schema.TaggedError<ClientFailure>()("ClientFailure", {}) {}

class Auth extends RpcMiddleware.Service<Auth, {
  clientError: ClientFailure
}>()("Auth", {
  error: Unauthorized
}) {}

const AuthGroup = RpcGroup.make(
  Rpc.make("Get", { success: Schema.String, error: NotFound }),
  Rpc.make("Events", { success: Schema.String, stream: true })
).middleware(Auth)

describe("RpcGroup", () => {
  it("toLayer includes handler dependencies in layer services", () => {
    const layer = Group.toLayer({
      GetUser: () => Db.use((db) => Effect.succeed(db.value)),
      UpdateUser: () => Db.use((db) => Effect.succeed(db.value))
    })

    type HasExpectedServices = [Layer.Services<typeof layer>] extends [Db] ?
      ([Db] extends [Layer.Services<typeof layer>] ? true : false) :
      false

    expect<HasExpectedServices>().type.toBe<true>()
  })

  it("toLayer includes handler dependencies from effect-built handlers", () => {
    const layer = Group.toLayer(Effect.succeed({
      GetUser: () => Db.use((db) => Effect.succeed(db.value)),
      UpdateUser: () => Db.use((db) => Effect.succeed(db.value))
    }))

    type HasExpectedServices = [Layer.Services<typeof layer>] extends [Db] ?
      ([Db] extends [Layer.Services<typeof layer>] ? true : false) :
      false

    expect<HasExpectedServices>().type.toBe<true>()
  })

  it("toLayerHandler includes handler dependencies in layer services", () => {
    const layer = Group.toLayerHandler("GetUser", () => Metrics.use((metrics) => Effect.succeed(metrics.value)))

    type HasExpectedServices = [Layer.Services<typeof layer>] extends [Metrics] ?
      ([Metrics] extends [Layer.Services<typeof layer>] ? true : false) :
      false

    expect<HasExpectedServices>().type.toBe<true>()
  })

  it("omit removes an rpc", () => {
    const group = Group.omit("GetUser")
    type Tags = RpcGroup.Rpcs<typeof group>["_tag"]
    expect<Tags>().type.toBe<"UpdateUser">()
  })

  describe("handler errors", () => {
    const events = Stream.make("a")

    it("toLayer accepts handlers failing with middleware errors", () => {
      expect(AuthGroup.toLayer).type.toBeCallableWith({
        Get: () => Effect.fail(new Unauthorized()),
        Events: () => Stream.fail(new Unauthorized())
      })
      expect(AuthGroup.toLayer).type.toBeCallableWith({
        Get: () => Effect.fail(new NotFound()),
        Events: () => Queue.unbounded<string, Unauthorized | Cause.Done>()
      })
    })

    it("toLayer rejects handlers failing with undeclared errors", () => {
      expect(AuthGroup.toLayer).type.not.toBeCallableWith({
        Get: () => Effect.fail(new Unknown()),
        Events: () => events
      })
      expect(AuthGroup.toLayer).type.not.toBeCallableWith({
        Get: () => Effect.succeed("a"),
        Events: () => Stream.fail(new Unknown())
      })
    })

    it("toLayer rejects handlers failing with middleware client errors", () => {
      expect(AuthGroup.toLayer).type.not.toBeCallableWith({
        Get: () => Effect.fail(new ClientFailure()),
        Events: () => events
      })
    })

    it("toLayer rejects middleware errors for rpcs without that middleware", () => {
      const Plain = RpcGroup.make(Rpc.make("Get", { success: Schema.String, error: NotFound }))
      expect(Plain.toLayer).type.not.toBeCallableWith({
        Get: () => Effect.fail(new Unauthorized())
      })
    })

    it("toLayer still accepts deferred responses with the rpc error", () => {
      expect(AuthGroup.toLayer).type.toBeCallableWith({
        Get: () => Deferred.make<string, NotFound>(),
        Events: () => events
      })
    })
  })
})
