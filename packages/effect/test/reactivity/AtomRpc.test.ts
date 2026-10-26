import { assert, describe, expectTypeOf, it } from "@effect/vitest"
import { type Cause, Context, Deferred, Effect, Layer, Schema } from "effect"
import { AsyncResult, Atom, AtomRegistry, AtomRpc, Hydration, Reactivity } from "effect/reactivity"
import {
  Rpc,
  RpcClient,
  type RpcClientError,
  RpcGroup,
  RpcMiddleware,
  type RpcSerialization,
  RpcTest
} from "effect/rpc"

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

class ClientFailure extends Schema.Error<ClientFailure>("ClientFailure")({
  _tag: Schema.tag("ClientFailure")
}) {}

class ClientMiddleware extends RpcMiddleware.Service<ClientMiddleware, {
  clientError: ClientFailure
}>()("ClientMiddleware", {
  requiredForClient: true
}) {}

const ClientMiddlewareGroup = RpcGroup.make(
  Rpc.make("getUser", {
    success: Schema.String
  }).middleware(ClientMiddleware),
  Rpc.make("stream", {
    success: Schema.String,
    stream: true
  }).middleware(ClientMiddleware)
)

const makeClientMiddlewareProtocol = (
  middleware: RpcMiddleware.RpcMiddlewareClient<never, ClientFailure, never>
) =>
  Layer.mergeAll(
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
    RpcMiddleware.layerClient(ClientMiddleware, middleware)
  )

describe("AtomRpc", () => {
  it.effect("reuses fresh hydration and preserves reactivity, retention, and policy identity", () =>
    Effect.gen(function*() {
      let requests = 0
      const Client = AtomRpc.Service()("FreshClient", {
        group: Group,
        protocol: Layer.empty,
        makeEffect: Effect.succeed(
          ((_tag: string, payload: { readonly id: number }) =>
            Effect.sync(() => ({ id: payload.id, name: `user-${++requests}` }))) as any
        )
      })
      const options = {
        serializationKey: "1",
        staleTime: "1 minute",
        timeToLive: "5 minutes",
        reactivityKeys: ["users"]
      } as const
      const atom = Client.query("getUser", { id: 1 }, options)
      assert.strictEqual(atom, Client.query("getUser", { id: 1 }, { ...options, staleTime: 60_000 }))
      assert.notStrictEqual(atom, Client.query("getUser", { id: 1 }, { ...options, staleTime: undefined }))
      assert.notStrictEqual(atom, Client.query("getUser", { id: 1 }, { ...options, staleTime: 0 }))
      assert.notStrictEqual(atom, Client.query("getUser", { id: 1 }, { ...options, revalidateOnFocus: true }))
      const focus = Atom.make(0)
      const focused = Client.query("getUser", { id: 1 }, { ...options, revalidateOnFocus: true, focusSignal: focus })
      assert.strictEqual(
        focused,
        Client.query("getUser", { id: 1 }, { ...options, revalidateOnFocus: true, focusSignal: focus })
      )
      assert.notStrictEqual(
        focused,
        Client.query("getUser", { id: 1 }, { ...options, revalidateOnFocus: true, focusSignal: Atom.make(0) })
      )
      assert.strictEqual(atom.idleTTL, 300_000)
      assert(Atom.isSerializable(atom))

      const server = AtomRegistry.make()
      const client = AtomRegistry.make()
      yield* Effect.addFinalizer(() =>
        Effect.sync(() => {
          server.dispose()
          client.dispose()
        })
      )
      yield* AtomRegistry.mount(server, atom)
      const expected = { id: 1, name: "user-1" }
      assert.deepStrictEqual(yield* AtomRegistry.getResult(server, atom), expected)
      const seed = server.get(atom)
      Hydration.hydrate(client, Hydration.dehydrate(server))
      yield* AtomRegistry.mount(client, atom)
      yield* Effect.yieldNow
      assert.deepStrictEqual(client.get(atom), seed)
      assert.strictEqual(requests, 1)

      const services = yield* AtomRegistry.getResult(client, Client.runtime)
      Context.get(services, Reactivity.Reactivity).invalidateUnsafe(["users"])
      assert.deepStrictEqual(yield* AtomRegistry.getResult(client, atom), { id: 1, name: "user-2" })
      assert.strictEqual(requests, 2)
    }))

  it.effect.each([
    { mode: "legacy", staleTime: undefined, initialRequests: 1 },
    { mode: "freshness", staleTime: 0, initialRequests: 0 }
  ])(
    "$mode query handles a seed with an explicit zero freshness policy",
    ({ initialRequests, staleTime }) =>
      Effect.gen(function*() {
        let requests = 0
        const response = yield* Deferred.make<void>()
        const Client = AtomRpc.Service()("ZeroClient", {
          group: Group,
          protocol: Layer.empty,
          makeEffect: Effect.succeed(
            ((_tag: string, payload: { readonly id: number }) =>
              Effect.gen(function*() {
                const count = ++requests
                yield* Deferred.await(response)
                return { id: payload.id, name: `user-${count}` }
              })) as any
          )
        })
        const atom = Client.query("getUser", { id: 1 }, {
          serializationKey: "zero",
          ...(staleTime === undefined ? {} : { staleTime })
        })
        const seed = AsyncResult.success({ id: 1, name: "seed" })
        const registry = AtomRegistry.make({ initialValues: [Atom.initialValue(atom, seed)] })
        yield* Effect.addFinalizer(() => Effect.sync(() => registry.dispose()))
        yield* AtomRegistry.mount(registry, atom)
        assert.strictEqual(requests, initialRequests)
        assert.strictEqual(registry.get(atom), seed)
        yield* Deferred.succeed(response, undefined)
        yield* Effect.yieldNow
        yield* Effect.yieldNow
        assert.deepStrictEqual(yield* AtomRegistry.getResult(registry, atom), { id: 1, name: "user-1" })
        assert.strictEqual(requests, 1)
      })
  )

  it("rejects freshness for streaming RPCs even when called without static types", () => {
    const Client = AtomRpc.Service()("NonFiniteClient", {
      group: ClientMiddlewareGroup,
      protocol: Layer.empty,
      makeEffect: Effect.die("unused")
    })
    const query = Client.query as (...args: Array<any>) => unknown
    assert.throws(() => query("stream", undefined, { staleTime: 0 }), /non-streaming RPC/)
  })

  it.effect.each([
    { idA: "RpcA", tagA: "create", idB: "RpcB", tagB: "create" },
    { idA: "Tenant:User", tagA: "create", idB: "Tenant", tagB: "User:create" }
  ])("isolates mutations across services ($idA / $idB)", ({ idA, tagA, idB, tagB }) =>
    Effect.gen(function*() {
      const requests: Array<{ service: string; name: string }> = []
      const makeClient = (id: string, tag: string) => {
        const group = RpcGroup.make(
          Rpc.make(tag, {
            payload: Schema.Struct({ name: Schema.String }),
            success: Schema.String
          })
        )
        return AtomRpc.Service()(id, {
          group,
          protocol: group.toLayer({
            [tag]: ({ name }) =>
              Effect.sync(() => {
                requests.push({ service: id, name })
                return `${id} ok`
              })
          }),
          makeEffect: RpcTest.makeClient(group, { flatten: true })
        })
      }
      const RpcA = makeClient(idA, tagA)
      const RpcB = makeClient(idB, tagB)
      const createA = RpcA.mutation(tagA)
      const createB = RpcB.mutation(tagB)
      const registry = AtomRegistry.make()
      yield* Effect.addFinalizer(() => Effect.sync(() => registry.dispose()))
      yield* AtomRegistry.mount(registry, createA)
      yield* AtomRegistry.mount(registry, createB)

      registry.set(createA, { payload: { name: "alice" } })
      const resultA = yield* AtomRegistry.getResult(registry, createA, { suspendOnWaiting: true })
      registry.set(createB, { payload: { name: "bob" } })
      const resultB = yield* AtomRegistry.getResult(registry, createB, { suspendOnWaiting: true })

      assert.deepStrictEqual({ results: [resultA, resultB], requests }, {
        results: [`${idA} ok`, `${idB} ok`],
        requests: [
          { service: idA, name: "alice" },
          { service: idB, name: "bob" }
        ]
      })
    }))

  it("includes client middleware errors in atom failure types", () => {
    const Client = AtomRpc.Service()("MiddlewareClient", {
      group: ClientMiddlewareGroup,
      protocol: Layer.empty,
      makeEffect: Effect.die("unused")
    })

    const mutation = Client.mutation("getUser")
    const query = Client.query("getUser", undefined)
    const stream = Client.query("stream", undefined)

    expectTypeOf<Atom.Failure<typeof mutation>>().toEqualTypeOf<RpcClientError.RpcClientError | ClientFailure>()
    expectTypeOf<Atom.Failure<typeof query>>().toEqualTypeOf<RpcClientError.RpcClientError | ClientFailure>()
    expectTypeOf<Atom.Failure<typeof stream>>().toEqualTypeOf<
      RpcClientError.RpcClientError | ClientFailure | Cause.NoSuchElementError
    >()
  })

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
      assert.strictEqual(Client.query("getUser", { id: 2 }, { timeToLive: 0 }).idleTTL, 0)
      assert.strictEqual(Client.query("getUser", { id: 3 }, { timeToLive: 0n }).idleTTL, 0)
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
      const Client = AtomRpc.Service()("ClientWithMiddleware", {
        group: ClientMiddlewareGroup,
        protocol: makeClientMiddlewareProtocol(() => Effect.fail(new ClientFailure({})))
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
      assert.isUndefined(dehydrated.find((entry) => entry.key === "AtomRpc:getUser:failed"))
      assert.strictEqual(dehydrated.find((entry) => entry.key === "unaffected")?.value, 42)

      unmountUnaffected()
      unmountFailed()
    }))

  it.effect("settles promise dehydration when client middleware later fails", () =>
    Effect.gen(function*() {
      const failMiddleware = yield* Deferred.make<void>()
      const Client = AtomRpc.Service()("ClientWithDeferredMiddleware", {
        group: ClientMiddlewareGroup,
        protocol: makeClientMiddlewareProtocol(() =>
          Deferred.await(failMiddleware).pipe(
            Effect.andThen(Effect.fail(new ClientFailure({})))
          )
        )
      })
      const failedAtom = Client.query("getUser", undefined, {
        serializationKey: "deferred-failure"
      })
      const registry = AtomRegistry.make()
      const unmountFailed = registry.mount(failedAtom)

      assert(AsyncResult.isInitial(registry.get(failedAtom)))
      const dehydrated = Hydration.toValues(Hydration.dehydrate(registry, {
        encodeInitialAs: "promise"
      }))
      const resultPromise = dehydrated.find((entry) => entry.key === "AtomRpc:getUser:deferred-failure")
        ?.resultPromise
      assert.isDefined(resultPromise)

      let notifications = 0
      const unsubscribe = registry.subscribe(failedAtom, () => notifications++)
      const hydratedRegistry = AtomRegistry.make()
      Hydration.hydrate(hydratedRegistry, dehydrated)

      yield* Deferred.succeed(failMiddleware, undefined)
      yield* Effect.promise(() => resultPromise).pipe(Effect.timeout("1 second"))

      assert.strictEqual(notifications, 1)
      const unmountHydrated = hydratedRegistry.mount(failedAtom)

      unmountHydrated()
      unsubscribe()
      unmountFailed()
    }))
})
