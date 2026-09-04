import { assert, describe, it } from "@effect/vitest"
import { Effect, Layer, Schema } from "effect"
import { AsyncResult, Atom, AtomRegistry, AtomRpc, Hydration } from "effect/unstable/reactivity"
import { Rpc, RpcClient, RpcGroup, RpcMiddleware, type RpcSerialization } from "effect/unstable/rpc"

const Group = RpcGroup.make(
  Rpc.make("getUser", {
    payload: Schema.Struct({
      id: Schema.FiniteFromString
    }),
    success: Schema.Struct({
      id: Schema.Number,
      name: Schema.String
    })
  })
)

describe("AtomRpc", () => {
  it.effect("query creates a serializable atom with reactivity and retention", () =>
    Effect.gen(function*() {
      const Client = AtomRpc.Service()("Client", {
        group: Group,
        protocol: Layer.empty,
        makeEffect: Effect.succeed(
          ((tag: string, payload: { readonly id: number }) => {
            if (tag !== "getUser") {
              return Effect.die(`unexpected tag: ${tag}`)
            }
            return Effect.succeed({
              id: payload.id,
              name: `user-${payload.id}`
            })
          }) as any
        )
      })

      const atom = Client.query("getUser", { id: 1 }, {
        headers: {
          "x-id": "abc"
        },
        reactivityKeys: ["users"],
        timeToLive: "1 minute",
        serializationKey: "1"
      })

      assert.deepStrictEqual(
        {
          idleTTL: atom.idleTTL,
          serializable: Atom.isSerializable(atom)
        },
        {
          idleTTL: 60_000,
          serializable: true
        }
      )
      const keepAliveAtom = Client.query("getUser", { id: 2 }, {
        reactivityKeys: ["users"],
        timeToLive: "Infinity",
        serializationKey: "keep-alive"
      })
      assert.deepStrictEqual(
        {
          keepAlive: keepAliveAtom.keepAlive,
          serializable: Atom.isSerializable(keepAliveAtom)
        },
        {
          keepAlive: true,
          serializable: true
        }
      )
      if (!Atom.isSerializable(atom)) {
        assert.fail("expected query atom to be serializable")
      }
      const key = atom[Atom.SerializableTypeId].key

      const atomFromEncodedPayload = Client.query("getUser", { id: 1 }, {
        headers: {
          "x-id": "abc"
        },
        reactivityKeys: ["users"],
        timeToLive: "1 minute",
        serializationKey: "1"
      })
      assert(Atom.isSerializable(atomFromEncodedPayload), "expected query atom from encoded payload to be serializable")
      assert(atom === atomFromEncodedPayload)
      assert.strictEqual(atomFromEncodedPayload[Atom.SerializableTypeId].key, key)

      const registry = AtomRegistry.make()
      const unmount = registry.mount(atom)
      yield* Effect.yieldNow
      yield* Effect.yieldNow

      const dehydrated = Hydration.toValues(Hydration.dehydrate(registry))
      assert.lengthOf(dehydrated, 1)
      assert.strictEqual(dehydrated[0]!.key, key)

      unmount()
    }))

  it.effect("dehydrates the rest of the registry when client middleware fails", () =>
    Effect.gen(function*() {
      class ClientFailure extends Schema.Error<ClientFailure>("ClientFailure")({
        _tag: Schema.tag("ClientFailure")
      }) {}

      class ClientMiddleware extends RpcMiddleware.Service<ClientMiddleware, {
        clientError: ClientFailure
      }>()("ClientMiddleware", {
        requiredForClient: true
      }) {}

      const group = RpcGroup.make(
        Rpc.make("getUser", {
          success: Schema.String
        }).middleware(ClientMiddleware)
      )
      const protocol = Layer.mergeAll(
        Layer.effect(
          RpcClient.Protocol,
          RpcClient.Protocol.make(() =>
            Effect.succeed({
              send: () => Effect.die("unexpected request"),
              supportsAck: false,
              supportsTransferables: false,
              codecFor: Schema.toCodecJson as RpcSerialization.CodecFor
            })
          )
        ),
        RpcMiddleware.layerClient(
          ClientMiddleware,
          () => Effect.fail(new ClientFailure({}))
        )
      )
      const Client = AtomRpc.Service()("ClientWithMiddleware", {
        group,
        protocol
      })
      const failedAtom = Client.query("getUser", undefined, {
        serializationKey: "failed"
      })
      const unaffectedAtom = Atom.make(42).pipe(
        Atom.serializable({
          key: "unaffected",
          schema: Schema.Number
        })
      )
      const registry = AtomRegistry.make()
      const unmountFailed = registry.mount(failedAtom)
      const unmountUnaffected = registry.mount(unaffectedAtom)
      yield* Effect.yieldNow
      yield* Effect.yieldNow

      assert(AsyncResult.isFailure(registry.get(failedAtom)))
      const dehydrated = Hydration.toValues(Hydration.dehydrate(registry))
      assert.strictEqual(dehydrated.find((entry) => entry.key === "unaffected")?.value, 42)

      unmountUnaffected()
      unmountFailed()
    }))
})
