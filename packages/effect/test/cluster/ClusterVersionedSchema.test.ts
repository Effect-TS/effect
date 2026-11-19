import { assert, describe, it } from "@effect/vitest"
import { Cause, Context, Effect, Exit, Fiber, Layer, Logger, Option, Queue, Schema, Stream } from "effect"
import {
  ClusterError,
  ClusterSchema,
  Entity,
  EntityAddress,
  EntityId,
  EntityType,
  Envelope,
  Message,
  MessageStorage,
  Reply,
  RunnerHealth,
  Runners,
  RunnerServer,
  RunnerStorage,
  Sharding,
  ShardingConfig,
  Snowflake
} from "effect/cluster"
import { Headers } from "effect/http"
import * as InternalVersionedSchema from "effect/internal/versionedSchema"
import { Rpc, type RpcSerialization, RpcServer, RpcTest } from "effect/rpc"
import { VersionedSchema } from "effect/schema"
import { TestClock } from "effect/testing"
import { ada, archived, Current, Next, Old, Org, orgEncoded } from "../schema/fixtures/versioned.ts"

const makePeople = <P extends Schema.Top>(person: P) =>
  Entity.make("People", [
    Rpc.make("Save", { payload: { id: Schema.String, person }, success: person }),
    Rpc.make("SaveVolatile", { payload: { id: Schema.String, person }, success: person }).annotate(
      ClusterSchema.Persisted,
      false
    ),
    Rpc.make("GetVolatile", { payload: { id: Schema.String }, success: person }).annotate(
      ClusterSchema.Persisted,
      false
    ),
    Rpc.make("List", { success: person, stream: true }),
    Rpc.make("ListTransactional", { success: person, stream: true }).annotate(ClusterSchema.WithTransaction, true),
    Rpc.make("ListVolatile", { success: person, stream: true }).annotate(ClusterSchema.Persisted, false),
    Rpc.make("EchoOrg", { payload: { org: Org }, success: Org }).annotate(ClusterSchema.Persisted, false)
  ]).annotateRpcs(ClusterSchema.Persisted, true)

// the entity as the runner's build declares it
const People = makePeople(Current.Person)

interface State {
  /** the `id` of each request a handler ran, in order */
  readonly handled: Array<string>
  /** the versions each handler saw */
  readonly versions: Array<Readonly<Record<string, number>>>
  readonly warnings: Array<string>
  finalized: number
}

const makeState = (): State => ({ handled: [], versions: [], warnings: [], finalized: 0 })

// the versions a handler is answering Address and Person at
const requestVersions = Effect.all({
  Address: VersionedSchema.requestVersion(Current.Address),
  Person: VersionedSchema.requestVersion(Current.Person)
})

const makeHandlers = (state: State) =>
  People.toLayer({
    Save: (request) =>
      Effect.map(requestVersions, (versions) => {
        state.handled.push(request.payload.id)
        state.versions.push(versions)
        return request.payload.person
      }),
    SaveVolatile: (request) =>
      Effect.map(requestVersions, (versions) => {
        state.handled.push(request.payload.id)
        state.versions.push(versions)
        return request.payload.person
      }),
    GetVolatile: (request) =>
      Effect.map(requestVersions, (versions) => {
        state.handled.push(request.payload.id)
        state.versions.push(versions)
        return request.payload.id === "archived" ? archived : ada
      }),
    List: () => peopleStream(state),
    ListTransactional: () => peopleStream(state),
    ListVolatile: () => peopleStream(state),
    EchoOrg: (request) => Effect.succeed(request.payload.org)
  })

const peopleStream = (state: State) =>
  Stream.concat(Stream.make(ada), Stream.make(archived)).pipe(
    Stream.concat(Stream.fromEffect(Effect.sync(() => {
      state.handled.push("after-unrepresentable")
      return ada
    }))),
    Stream.ensuring(Effect.sync(() => {
      state.finalized++
    }))
  )

const jsonCodec = Schema.toCodecJson as RpcSerialization.CodecFor

// the runner server's protocol, so tests can send it requests as another
// runner would, already encoded
const layerProtocol = Layer.effect(RpcServer.Protocol)(
  Effect.map(Queue.unbounded<number>(), (disconnects) =>
    RpcServer.Protocol.of({
      run: () => Effect.never,
      disconnects,
      send: () => Effect.void,
      end: () => Effect.void,
      clientIds: Effect.succeed(new Set()),
      initialMessage: Effect.succeedNone,
      supportsAck: false,
      supportsTransferables: false,
      supportsSpanPropagation: false,
      supportsNotifications: false,
      codecFor: jsonCodec
    }))
)

const makeRunner = (
  state: State,
  config?: Partial<ShardingConfig.ShardingConfig["Service"]>,
  transformStorage: (storage: MessageStorage.MessageStorage["Service"]) => MessageStorage.MessageStorage["Service"] = (
    storage
  ) => storage,
  transformRunnerStorage: (storage: RunnerStorage.RunnerStorage["Service"]) => RunnerStorage.RunnerStorage["Service"] =
    (
      storage
    ) => storage
) =>
  RunnerServer.layerHandlers.pipe(
    Layer.provide(layerProtocol),
    Layer.provideMerge(makeHandlers(state)),
    Layer.provideMerge(Sharding.layer),
    Layer.provideMerge(Snowflake.layerGenerator),
    Layer.updateService(RunnerStorage.RunnerStorage, transformRunnerStorage),
    Layer.provide(RunnerStorage.layerMemory),
    Layer.provide(RunnerHealth.layerNoop),
    Layer.provide(Runners.layerNoop),
    Layer.updateService(MessageStorage.MessageStorage, transformStorage),
    Layer.provideMerge(MessageStorage.layerMemory),
    Layer.provide(ShardingConfig.layer({
      entityMailboxCapacity: 10,
      entityTerminationTimeout: 0,
      entityMessagePollInterval: 5000,
      sendRetryInterval: 100,
      refreshAssignmentsInterval: 0,
      ...config
    })),
    Layer.provide(Logger.layer([
      Logger.make((options) => {
        if (options.logLevel === "Warn") state.warnings.push(String(options.message))
      })
    ]))
  )

// lets the runner's fibers run until `done` holds
const settle = Effect.fnUntraced(function*(done: () => boolean) {
  for (let i = 0; i < 100 && !done(); i++) yield* TestClock.adjust(10)
  assert.isTrue(done())
})

interface RequestOptions {
  readonly entityId: string
  readonly tag: string
  /** encoded by the sending build */
  readonly payload: unknown
  readonly versions: string
}

const addressOf = Effect.fnUntraced(function*(entityId: string) {
  const sharding = yield* Sharding.Sharding
  const id = EntityId.make(entityId)
  return EntityAddress.make({
    shardId: sharding.getShardId(id, People.getShardGroup(id)),
    entityType: EntityType.make(People.type),
    entityId: id
  })
})

// a request for `People` as a runner on another build sends it
const runnerRequest = Effect.fnUntraced(function*(options: RequestOptions) {
  const sharding = yield* Sharding.Sharding
  const request: Envelope.PartialRequest = {
    _tag: "Request",
    requestId: yield* sharding.getSnowflake,
    address: yield* addressOf(options.entityId),
    tag: options.tag,
    payload: options.payload,
    headers: Headers.fromInput({ [VersionedSchema.header]: options.versions })
  }
  return request
})

// a persisted request saved to storage by a runner on another build
const saveEncoded = Effect.fnUntraced(function*(options: RequestOptions) {
  const sharding = yield* Sharding.Sharding
  const driver = yield* MessageStorage.MemoryDriver
  const address = yield* addressOf(options.entityId)
  const envelope: Envelope.PartialRequestEncoded = {
    _tag: "Request",
    requestId: String(yield* sharding.getSnowflake),
    address: {
      shardId: { group: address.shardId.group, id: address.shardId.id },
      entityType: People.type,
      entityId: options.entityId
    },
    tag: options.tag,
    payload: options.payload,
    headers: { [VersionedSchema.header]: options.versions }
  }
  yield* driver.encoded.saveEnvelope({ envelope, primaryKey: null, deliverAt: null })
  return envelope.requestId
})

const storedReplies = (requestId: string) =>
  Effect.map(MessageStorage.MemoryDriver, (driver) => driver.requests.get(requestId)?.replies ?? [])

const decodeReply = (tag: string, reply: unknown) =>
  Schema.decodeUnknownSync(Reply.Reply(People.protocol.requests.get(tag)!, jsonCodec))(reply)

const errorOf = (reply: Reply.Reply<any>) => {
  assert.strictEqual(reply._tag, "WithExit")
  const exit = (reply as Reply.WithExit<any>).exit
  assert.isTrue(Exit.isFailure(exit))
  return Option.getOrThrow(Cause.findErrorOption((exit as Exit.Failure<unknown, unknown>).cause)) as any
}

const v1 = VersionedSchema.versions(Current.Address.version(1), Current.Person.version(1))
const oldAda = { name: "Ada", status: "active" as const, address: { street: "1 Main St" } }
const nextAda: typeof Next.Person.Type = { ...ada, phone: "555" }

describe("Cluster with versioned schemas", () => {
  it.effect("entity calls write their payload at the versions they speak, and are answered at them", () => {
    const state = makeState()
    return Effect.gen(function*() {
      // let the runner acquire its shards
      yield* TestClock.adjust(1)
      const driver = yield* MessageStorage.MemoryDriver
      const client = (yield* People.client)("ada")
      const received = yield* client.Save({ id: "ada", person: ada }).pipe(
        Effect.provideService(VersionedSchema.ClientVersions, v1)
      )

      assert.deepStrictEqual(state.versions, [v1])
      const [entry] = driver.requests.values()
      const payload = entry.envelope as Envelope.PartialRequestEncoded
      assert.deepStrictEqual((payload.payload as any).person, {
        _version: 1,
        name: "Ada",
        status: "active",
        address: { _version: 1, street: "1 Main St" }
      })
      const [reply] = entry.replies as Array<any>
      assert.deepStrictEqual(reply.exit.value, (payload.payload as any).person)
      assert.deepStrictEqual(received, Schema.decodeUnknownSync(Current.Person)(reply.exit.value))
    }).pipe(Effect.provide(makeRunner(state)))
  })

  it.effect("a request the chosen versions can't represent fails with Unrepresentable before it is sent", () => {
    const state = makeState()
    return Effect.gen(function*() {
      // let the runner acquire its shards
      yield* TestClock.adjust(1)
      const driver = yield* MessageStorage.MemoryDriver
      const client = (yield* People.client)("grace")
      for (const call of [client.Save, client.SaveVolatile]) {
        const error = yield* call({ id: "grace", person: archived }).pipe(
          Effect.provideService(
            VersionedSchema.ClientVersions,
            VersionedSchema.versions(Current.Address.version(2), Current.Person.version(2))
          ),
          Effect.flip
        )
        assert.strictEqual(error._tag, "Unrepresentable")
      }
      assert.deepStrictEqual(state.handled, [])
      assert.strictEqual(driver.requests.size, 0)
    }).pipe(Effect.provide(makeRunner(state)))
  })

  it.effect("a reply is written at the versions its sender speaks", () => {
    const state = makeState()
    return Effect.gen(function*() {
      // let the runner acquire its shards
      yield* TestClock.adjust(1)
      const runner = yield* RpcTest.makeClient(Runners.Rpcs)
      const request = yield* runnerRequest({
        entityId: "ada",
        tag: "SaveVolatile",
        payload: { id: "ada", person: Schema.encodeSync(Old.Person)(oldAda) },
        versions: "Address=1, Person=1"
      })
      const reply: any = yield* runner.Effect({ request, persisted: false })
      assert.deepStrictEqual(state.versions, [v1])
      assert.deepStrictEqual(reply.exit.value, {
        _version: 1,
        name: "Ada",
        status: "active",
        address: { _version: 1, street: "1 Main St" }
      })
    }).pipe(Effect.provide(makeRunner(state)))
  })

  it.effect("a reply its sender's versions can't represent fails with Unrepresentable", () => {
    const state = makeState()
    return Effect.gen(function*() {
      // let the runner acquire its shards
      yield* TestClock.adjust(1)
      const runner = yield* RpcTest.makeClient(Runners.Rpcs)
      const request = yield* runnerRequest({
        entityId: "grace",
        tag: "GetVolatile",
        payload: { id: "archived" },
        versions: "Address=1, Person=1"
      })
      const reply = yield* runner.Effect({ request, persisted: false })
      const error = errorOf(decodeReply("GetVolatile", reply))
      assert.strictEqual(error._tag, "Unrepresentable")
      assert.strictEqual(error.id, "Person")
    }).pipe(Effect.provide(makeRunner(state)))
  })

  it.effect("a reply holding a versioned type the search missed is a defect naming it", () => {
    const state = makeState()
    return Effect.gen(function*() {
      // let the runner acquire its shards
      yield* TestClock.adjust(1)
      const runner = yield* RpcTest.makeClient(Runners.Rpcs)
      const request = yield* runnerRequest({
        entityId: "org",
        tag: "EchoOrg",
        payload: { org: orgEncoded },
        versions: ""
      })
      const reply = decodeReply("EchoOrg", yield* runner.Effect({ request, persisted: false }))
      assert.strictEqual(reply._tag, "WithExit")
      const exit = (reply as Reply.WithExit<any>).exit
      assert.isTrue(Exit.isFailure(exit) && Cause.hasDies(exit.cause))
      assert.include(Cause.pretty((exit as Exit.Failure<unknown, unknown>).cause), "\"Badge\"")
    }).pipe(Effect.provide(makeRunner(state)))
  })

  it.effect("a volatile request written at versions the runner can't read fails with VersionUnsupported", () => {
    const state = makeState()
    return Effect.gen(function*() {
      // let the runner acquire its shards
      yield* TestClock.adjust(1)
      const runner = yield* RpcTest.makeClient(Runners.Rpcs)
      const request = yield* runnerRequest({
        entityId: "ada",
        tag: "SaveVolatile",
        payload: { id: "ada", person: Schema.encodeSync(Next.Person)(nextAda) },
        versions: "Address=2, Person=4"
      })
      const reply = yield* runner.Effect({ request, persisted: false })
      const error = errorOf(decodeReply("SaveVolatile", reply))
      assert.strictEqual(error._tag, "VersionUnsupported")
      assert.strictEqual(error.id, "Person")
      assert.strictEqual(error.requested, 4)
      assert.deepStrictEqual(error.supported, { Address: 2, Person: 3 })
      assert.deepStrictEqual(state.handled, [])
    }).pipe(Effect.provide(makeRunner(state)))
  })

  it.effect("a persisted request the runner can't read waits in storage, and its entity's later messages wait behind it", () => {
    const state = makeState()
    return Effect.gen(function*() {
      // let the runner acquire its shards
      yield* TestClock.adjust(1)
      const sharding = yield* Sharding.Sharding
      const newer = yield* saveEncoded({
        entityId: "ada",
        tag: "Save",
        payload: { id: "ada-1", person: Schema.encodeSync(Next.Person)(nextAda) },
        versions: "Address=2, Person=4"
      })
      const later = yield* saveEncoded({
        entityId: "ada",
        tag: "Save",
        payload: { id: "ada-2", person: Schema.encodeSync(Current.Person)(ada) },
        versions: "Address=2, Person=3"
      })
      yield* saveEncoded({
        entityId: "bob",
        tag: "Save",
        payload: { id: "bob-1", person: Schema.encodeSync(Current.Person)(ada) },
        versions: "Address=2, Person=3"
      })

      yield* sharding.pollStorage
      yield* settle(() => state.handled.includes("bob-1"))
      // later reads leave them waiting too, and warn once
      for (let i = 0; i < 3; i++) {
        yield* sharding.pollStorage
        yield* TestClock.adjust(10)
      }
      yield* TestClock.adjust("1 hour")

      assert.deepStrictEqual(state.handled, ["bob-1"])
      assert.deepStrictEqual(yield* storedReplies(newer), [])
      assert.deepStrictEqual(yield* storedReplies(later), [])
      assert.deepStrictEqual(state.warnings.filter((message) => message.includes("waits for a runner")), [
        "A persisted message waits for a runner that can read Person v4 (this runner reads up to v3)"
      ])
    }).pipe(Effect.provide(makeRunner(state)))
  })

  for (
    const scenario of [
      {
        name: "newer root version",
        payload: Schema.encodeSync(Next.Person)(nextAda),
        unsupported: { id: "Person", requested: 4 }
      },
      {
        name: "newer version inside JSON text",
        payload: { item: JSON.stringify(Schema.encodeSync(Next.Person)(nextAda)) },
        schema: Schema.Struct({ item: Schema.fromJsonString(Current.Person) }),
        unsupported: { id: "Person", requested: 4 }
      },
      {
        name: "newer nested version",
        payload: { ...Schema.encodeSync(Current.Person)(ada), address: { _version: 3, street: "1 Main St" } },
        unsupported: { id: "Address", requested: 3 }
      },
      {
        name: "malformed supported version",
        payload: { ...Schema.encodeSync(Current.Person)(ada), fullName: 42 },
        unsupported: undefined
      }
    ]
  ) {
    it.effect(`classifies a stored reply with a ${scenario.name}, including duplicate requests`, () => {
      const state = makeState()
      return Effect.gen(function*() {
        const storage = yield* MessageStorage.MessageStorage
        const driver = yield* MessageStorage.MemoryDriver
        const sharding = yield* Sharding.Sharding
        const requestId = yield* saveEncoded({
          entityId: "ada",
          tag: "Save",
          payload: { id: "ada", person: Schema.encodeSync(Next.Person)(nextAda) },
          versions: "Address=2, Person=4"
        })
        yield* driver.encoded.saveReply({
          _tag: "WithExit",
          id: String(yield* sharding.getSnowflake),
          requestId,
          exit: { _tag: "Success", value: scenario.payload }
        })
        const rpc = scenario.schema === undefined ?
          People.protocol.requests.get("Save")! :
          Rpc.make("Save", { payload: { id: Schema.String, person: Current.Person }, success: scenario.schema })
        const message = new Message.OutgoingRequest({
          envelope: Envelope.makeRequest<any>({
            requestId: Snowflake.Snowflake(requestId),
            address: yield* addressOf("ada"),
            tag: "Save",
            payload: { id: "ada", person: ada },
            headers: Headers.empty
          }),
          rpc,
          context: Context.empty() as any,
          annotations: Context.empty(),
          lastReceivedReply: Option.none(),
          respond: () => Effect.void
        })
        const [reply] = yield* storage.repliesFor([message])
        if (scenario.unsupported === undefined) {
          assert.strictEqual(reply._tag, "WithExit")
          const exit = (reply as Reply.WithExit<any>).exit
          assert.isTrue(Exit.isFailure(exit) && Cause.hasDies(exit.cause))
          assert.strictEqual((yield* Effect.flip(storage.saveRequest(message)))._tag, "MalformedMessage")
          return
        }
        const duplicate = yield* storage.saveRequest(message)
        assert.strictEqual(duplicate._tag, "Duplicate")
        if (duplicate._tag !== "Duplicate") return
        for (const stored of [reply, Option.getOrThrow(duplicate.lastReceivedReply)]) {
          const error = errorOf(stored)
          assert.strictEqual(error._tag, "VersionUnsupported")
          assert.strictEqual(error.id, scenario.unsupported.id)
          assert.strictEqual(error.requested, scenario.unsupported.requested)
        }
      }).pipe(Effect.provide(makeRunner(state)))
    })
  }

  it.effect("keeps an entity paused when a storage read fails and the polling loop restarts", () => {
    const state = makeState()
    let failNextRead = false
    return Effect.gen(function*() {
      yield* TestClock.adjust(1)
      const sharding = yield* Sharding.Sharding
      const newer = yield* saveEncoded({
        entityId: "ada",
        tag: "Save",
        payload: { id: "ada-1", person: Schema.encodeSync(Next.Person)(nextAda) },
        versions: "Address=2, Person=4"
      })
      yield* sharding.pollStorage
      yield* settle(() => state.warnings.some((message) => message.includes("waits for a runner")))

      failNextRead = true
      yield* sharding.pollStorage
      yield* settle(() => state.warnings.some((message) => message.includes("Could not read messages")))
      const later = yield* saveEncoded({
        entityId: "ada",
        tag: "Save",
        payload: { id: "ada-2", person: Schema.encodeSync(Current.Person)(ada) },
        versions: "Address=2, Person=3"
      })
      yield* saveEncoded({
        entityId: "bob",
        tag: "Save",
        payload: { id: "bob-1", person: Schema.encodeSync(Current.Person)(ada) },
        versions: "Address=2, Person=3"
      })
      yield* sharding.pollStorage
      yield* settle(() => state.handled.includes("bob-1"))
      assert.deepStrictEqual(state.handled, ["bob-1"])
      assert.deepStrictEqual(yield* storedReplies(newer), [])
      assert.deepStrictEqual(yield* storedReplies(later), [])
    }).pipe(Effect.provide(makeRunner(state, undefined, (storage) => ({
      ...storage,
      unprocessedMessages: (shards, options) =>
        Effect.suspend(() => {
          if (failNextRead) {
            failNextRead = false
            return Effect.fail(new ClusterError.PersistenceError({ cause: "storage unavailable" }))
          }
          return storage.unprocessedMessages(shards, options)
        })
    }))))
  })

  it.effect("moves new waiters for a paused entity to storage before its next read", () => {
    const state = makeState()
    let blockReads = false
    return Effect.gen(function*() {
      yield* TestClock.adjust(1)
      const storage = yield* MessageStorage.MessageStorage
      const sharding = yield* Sharding.Sharding
      yield* saveEncoded({
        entityId: "ada",
        tag: "Save",
        payload: { id: "ada-1", person: Schema.encodeSync(Next.Person)(nextAda) },
        versions: "Address=2, Person=4"
      })
      yield* sharding.pollStorage
      yield* settle(() => state.warnings.some((message) => message.includes("waits for a runner")))
      blockReads = true
      const requestId = yield* saveEncoded({
        entityId: "ada",
        tag: "Save",
        payload: { id: "ada-2", person: Schema.encodeSync(Current.Person)(ada) },
        versions: "Address=2, Person=3"
      })
      const message = new Message.IncomingRequest({
        envelope: {
          ...(yield* runnerRequest({ entityId: "ada", tag: "Save", payload: {}, versions: "" })),
          requestId: Snowflake.Snowflake(requestId)
        },
        codecFor: jsonCodec,
        lastSentReply: Option.none(),
        respond: () => Effect.void
      })
      const waiter = yield* storage.registerReplyHandler(message).pipe(Effect.forkChild({ startImmediately: true }))
      const notification = yield* sharding.notify(message, { waitUntilRead: true }).pipe(
        Effect.forkChild({ startImmediately: true })
      )
      yield* settle(() => waiter.pollUnsafe() !== undefined && notification.pollUnsafe() !== undefined)
      const exit = yield* Fiber.await(waiter)
      assert.isTrue(Exit.isFailure(exit))
      assert.strictEqual(
        Cause.findErrorOption((exit as Exit.Failure<any, any>).cause).pipe(Option.getOrThrow)._tag,
        "EntityNotAssignedToRunner"
      )
      assert.deepStrictEqual(state.handled, [])
    }).pipe(Effect.provide(makeRunner(state, undefined, (storage) => ({
      ...storage,
      unprocessedMessages: (shards, options) =>
        Effect.suspend(() => blockReads ? Effect.never : storage.unprocessedMessages(shards, options))
    }))))
  })

  it.effect("does not write a compatibility timeout after losing shard ownership", () => {
    const state = makeState()
    let ownershipLost = false
    let ownershipChecks = 0
    return Effect.gen(function*() {
      yield* TestClock.adjust(1)
      const sharding = yield* Sharding.Sharding
      const newer = yield* saveEncoded({
        entityId: "ada",
        tag: "Save",
        payload: { id: "ada-1", person: Schema.encodeSync(Next.Person)(nextAda) },
        versions: "Address=2, Person=4"
      })
      yield* sharding.pollStorage
      yield* settle(() => state.warnings.some((message) => message.includes("waits for a runner")))
      ownershipLost = true
      yield* TestClock.adjust(200)
      yield* sharding.pollStorage
      yield* settle(() => ownershipChecks > 0)
      assert.deepStrictEqual(yield* storedReplies(newer), [])
      assert.deepStrictEqual(state.handled, [])
    }).pipe(Effect.provide(makeRunner(
      state,
      {
        unknownVersionTimeout: 100,
        shardLockRefreshInterval: "10 seconds"
      },
      undefined,
      (storage) => ({
        ...storage,
        refresh: (address, shards) =>
          Effect.suspend(() => {
            if (ownershipLost) {
              ownershipChecks++
              return Effect.succeed([])
            }
            return storage.refresh(address, shards)
          })
      })
    )))
  })

  it.effect("notifies live waiters with the persisted Unrepresentable failure", () => {
    const state = makeState()
    return Effect.gen(function*() {
      const storage = yield* MessageStorage.MessageStorage
      const sharding = yield* Sharding.Sharding
      const requestId = yield* saveEncoded({
        entityId: "ada",
        tag: "Save",
        payload: { id: "ada", person: Schema.encodeSync(Current.Person)(ada) },
        versions: "Address=1, Person=1"
      })
      const rpc = Rpc.make("Reply", { success: Current.Person, stream: false })
      const notified: Array<Reply.Reply<any>> = []
      const waiter = yield* storage.registerReplyHandler(
        new Message.IncomingRequest({
          envelope: {
            ...(yield* runnerRequest({ entityId: "ada", tag: "Save", payload: {}, versions: "" })),
            requestId: Snowflake.Snowflake(requestId)
          },
          codecFor: jsonCodec,
          lastSentReply: Option.none(),
          respond: (reply) =>
            Effect.sync(() => {
              notified.push(reply.reply)
            })
        })
      ).pipe(Effect.forkChild({ startImmediately: true }))
      const ids = { id: yield* sharding.getSnowflake, requestId: Snowflake.Snowflake(requestId) }
      yield* storage.saveReply(
        new Reply.ReplyWithContext({
          rpc,
          context: InternalVersionedSchema.Selection.context(
            InternalVersionedSchema.selection(Rpc.getVersioning(rpc), v1)
          ) as any,
          reply: new Reply.WithExit<any>({ ...ids, exit: Exit.succeed(archived) })
        })
      )
      assert.lengthOf(notified, 1)
      assert.strictEqual(errorOf(notified[0])._tag, "Unrepresentable")
      yield* Fiber.join(waiter)
      const [stored] = yield* storedReplies(requestId)
      const decoded = Schema.decodeUnknownSync(Reply.Reply(rpc, jsonCodec))(stored)
      assert.deepStrictEqual(errorOf(notified[0]), errorOf(decoded))
    }).pipe(Effect.provide(makeRunner(state)))
  })

  for (const tag of ["List", "ListTransactional"] as const) {
    it.effect(`stops an unrepresentable ${tag} chunk and releases its entity permit`, () => {
      const state = makeState()
      return Effect.gen(function*() {
        yield* TestClock.adjust(1)
        const client = (yield* People.client)("ada")
        const received: Array<typeof ada> = []
        const stream = yield* client[tag]().pipe(
          Stream.runForEach((person) =>
            Effect.sync(() => {
              received.push(person)
            })
          ),
          Effect.provideService(VersionedSchema.ClientVersions, v1),
          Effect.forkChild({ startImmediately: true })
        )
        yield* settle(() => stream.pollUnsafe() !== undefined && state.finalized === 1)
        const exit = yield* Fiber.await(stream)
        assert.isTrue(Exit.isFailure(exit))
        assert.strictEqual(
          Option.getOrThrow(Cause.findErrorOption((exit as Exit.Failure<any, any>).cause))._tag,
          "Unrepresentable"
        )
        assert.deepStrictEqual(received, [
          Schema.decodeUnknownSync(Current.Person)(Schema.encodeSync(Old.Person)(oldAda))
        ])
        const driver = yield* MessageStorage.MemoryDriver
        const [entry] = driver.requests.values()
        assert.lengthOf(entry.replies.filter((reply) => reply._tag === "WithExit"), 1)
        const later = yield* client.Save({ id: "after-stream", person: ada }).pipe(
          Effect.forkChild({ startImmediately: true })
        )
        yield* settle(() => later.pollUnsafe() !== undefined)
        assert.deepStrictEqual(yield* Fiber.join(later), ada)
        assert.deepStrictEqual(state.handled, ["after-stream"])
      }).pipe(Effect.provide(makeRunner(state, { entityReplyPollInterval: 10 })))
    })
  }

  it.effect("fences a failed stream chunk before storing its terminal reply", () => {
    const state = makeState()
    let ownershipLost = false
    let ownershipChecks = 0
    return Effect.gen(function*() {
      yield* TestClock.adjust(1)
      const client = (yield* People.client)("ada")
      yield* client.List().pipe(
        Stream.runDrain,
        Effect.provideService(VersionedSchema.ClientVersions, v1),
        Effect.forkChild({ startImmediately: true })
      )
      yield* settle(() => state.finalized === 1 && ownershipChecks > 0)
      const driver = yield* MessageStorage.MemoryDriver
      const [entry] = driver.requests.values()
      assert.lengthOf(entry.replies.filter((reply) => reply._tag === "WithExit"), 0)
      assert.deepStrictEqual(state.handled, [])
    }).pipe(Effect.provide(makeRunner(
      state,
      { entityReplyPollInterval: 10, shardLockRefreshInterval: "10 seconds" },
      (storage) => ({
        ...storage,
        saveReply: (reply) =>
          storage.saveReply(reply).pipe(Effect.tap(() =>
            Effect.sync(() => {
              if (reply.reply._tag === "Chunk") ownershipLost = true
            })
          ))
      }),
      (storage) => ({
        ...storage,
        refresh: (address, shards) =>
          Effect.suspend(() => {
            if (!ownershipLost) return storage.refresh(address, shards)
            ownershipChecks++
            return Effect.succeed([])
          })
      })
    )))
  })

  it.effect("stops a volatile stream after a chunk fails to encode", () => {
    const state = makeState()
    return Effect.gen(function*() {
      yield* TestClock.adjust(1)
      const runner = yield* RpcTest.makeClient(Runners.Rpcs)
      const sharding = yield* Sharding.Sharding
      const request = yield* runnerRequest({
        entityId: "ada",
        tag: "ListVolatile",
        payload: null,
        versions: "Address=1, Person=1"
      })
      const received: Array<Reply.Reply<any>> = []
      const stream = yield* runner.Stream({ request, persisted: false }).pipe(
        Stream.runForEach((encoded) =>
          Effect.gen(function*() {
            const reply = decodeReply("ListVolatile", encoded)
            received.push(reply)
            if (reply._tag === "Chunk") {
              yield* runner.Envelope({
                persisted: false,
                envelope: new Envelope.AckChunk({
                  id: yield* sharding.getSnowflake,
                  address: request.address,
                  requestId: request.requestId,
                  replyId: reply.id
                })
              })
            }
          })
        ),
        Effect.forkChild({ startImmediately: true })
      )
      yield* settle(() => stream.pollUnsafe() !== undefined && state.finalized === 1)
      yield* Fiber.join(stream)
      assert.deepStrictEqual(received.map((reply) => reply._tag), ["Chunk", "WithExit"])
      assert.strictEqual(errorOf(received[1])._tag, "Unrepresentable")
      const later = yield* (yield* People.client)("ada").Save({ id: "after-stream", person: ada }).pipe(
        Effect.forkChild({ startImmediately: true })
      )
      yield* settle(() => later.pollUnsafe() !== undefined)
      assert.deepStrictEqual(yield* Fiber.join(later), ada)
      assert.deepStrictEqual(state.handled, ["after-stream"])
    }).pipe(Effect.provide(makeRunner(state, { entityReplyPollInterval: 10 })))
  })

  for (const operation of ["saveReply", "resetAddresses"] as const) {
    for (const timeout of ["1 minute", 0] as const) {
      it.effect(`keeps later messages paused when ${operation} fails with timeout ${timeout}`, () => {
        const state = makeState()
        let failStorage = true
        let attempts = 0
        return Effect.gen(function*() {
          yield* TestClock.adjust(1)
          const sharding = yield* Sharding.Sharding
          const newer = yield* saveEncoded({
            entityId: "ada",
            tag: "Save",
            payload: { id: "ada-1", person: Schema.encodeSync(Next.Person)(nextAda) },
            versions: "Address=2, Person=4"
          })
          yield* saveEncoded({
            entityId: "ada",
            tag: "Save",
            payload: { id: "ada-2", person: Schema.encodeSync(Current.Person)(ada) },
            versions: "Address=2, Person=3"
          })
          yield* sharding.pollStorage
          yield* TestClock.adjust("2 minutes")
          assert.isAbove(attempts, 0)
          assert.deepStrictEqual(state.handled, [])
          assert.lengthOf(yield* storedReplies(newer), operation === "saveReply" ? 0 : 1)
          failStorage = false
          yield* sharding.pollStorage
          yield* settle(() => state.handled.includes("ada-2"))
          const replies = yield* storedReplies(newer)
          assert.lengthOf(replies, 1)
          assert.strictEqual(errorOf(decodeReply("Save", replies[0]))._tag, "VersionUnsupported")
          assert.deepStrictEqual(state.handled, ["ada-2"])
        }).pipe(Effect.provide(makeRunner(state, { unknownVersionTimeout: timeout }, (storage) => ({
          ...storage,
          saveReply: (reply) => {
            if (operation === "saveReply" && reply.reply._tag === "WithExit" && Exit.isFailure(reply.reply.exit)) {
              attempts++
              if (failStorage) return Effect.fail(new ClusterError.PersistenceError({ cause: "storage unavailable" }))
            }
            return storage.saveReply(reply)
          },
          resetAddresses: (addresses) => {
            if (operation === "resetAddresses") {
              attempts++
              if (failStorage) return Effect.fail(new ClusterError.PersistenceError({ cause: "storage unavailable" }))
            }
            return storage.resetAddresses(addresses)
          }
        }))))
      })
    }
  }

  it.effect("a persisted request the runner can't read fails with VersionUnsupported after unknownVersionTimeout", () => {
    const state = makeState()
    return Effect.gen(function*() {
      // let the runner acquire its shards
      yield* TestClock.adjust(1)
      const sharding = yield* Sharding.Sharding
      const newer = yield* saveEncoded({
        entityId: "ada",
        tag: "Save",
        payload: { id: "ada-1", person: Schema.encodeSync(Next.Person)(nextAda) },
        versions: "Address=2, Person=4"
      })
      yield* saveEncoded({
        entityId: "ada",
        tag: "Save",
        payload: { id: "ada-2", person: Schema.encodeSync(Current.Person)(ada) },
        versions: "Address=2, Person=3"
      })

      yield* sharding.pollStorage
      yield* TestClock.adjust("30 seconds")
      assert.deepStrictEqual(yield* storedReplies(newer), [])
      assert.deepStrictEqual(state.handled, [])

      yield* TestClock.adjust("1 minute")
      yield* settle(() => state.handled.includes("ada-2"))
      const [reply] = yield* storedReplies(newer)
      const error = errorOf(decodeReply("Save", reply))
      assert.strictEqual(error._tag, "VersionUnsupported")
      assert.strictEqual(error.requested, 4)
      assert.deepStrictEqual(state.handled, ["ada-2"])
    }).pipe(Effect.provide(makeRunner(state, { unknownVersionTimeout: "1 minute" })))
  })
})
