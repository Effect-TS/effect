import { assert, describe, it } from "@effect/vitest"
import { Context, Effect, Fiber, Layer, Queue, Schema, type Scope } from "effect"
import * as EventGroup from "effect/eventlog/EventGroup"
import * as EventJournal from "effect/eventlog/EventJournal"
import * as EventLog from "effect/eventlog/EventLog"
import * as EventLogEncryption from "effect/eventlog/EventLogEncryption"
import * as EventLogMessage from "effect/eventlog/EventLogMessage"
import * as EventLogRemote from "effect/eventlog/EventLogRemote"
import * as EventLogServerEncrypted from "effect/eventlog/EventLogServerEncrypted"
import * as EventLogServerUnencrypted from "effect/eventlog/EventLogServerUnencrypted"
import * as EventLogSessionAuth from "effect/eventlog/EventLogSessionAuth"
import { makeGetIdentityRootSecretMaterial } from "effect/eventlog/internal/identityRootSecretDerivation"
import type * as Rpc from "effect/rpc/Rpc"
import * as RpcClient from "effect/rpc/RpcClient"
import type * as RpcGroup from "effect/rpc/RpcGroup"
import type { FromServer } from "effect/rpc/RpcMessage"
import * as RpcServer from "effect/rpc/RpcServer"
import * as RpcTest from "effect/rpc/RpcTest"
import { TestClock } from "effect/testing"

describe("EventLogRemote", () => {
  it.effect("retries wrapped Forbidden authentication errors", () =>
    Effect.gen(function*() {
      const harness = yield* makeHarness(EventLogRemote.makeUnencrypted)
      const identity = yield* EventLog.makeIdentity
      let authenticationAttempts = 0

      yield* Effect.forever(Effect.gen(function*() {
        const request = yield* harness.take
        if (request._tag === "EventLog.Hello") {
          request.resume(Effect.succeed(new EventLogMessage.HelloResponse({ remoteId, challenge })))
        } else if (request._tag === "EventLog.Authenticate") {
          authenticationAttempts++
          request.resume(
            authenticationAttempts === 1
              ? Effect.fail(
                new EventLogMessage.EventLogProtocolError({
                  requestTag: "Authenticate",
                  publicKey: undefined,
                  code: "Forbidden",
                  message: "Session auth challenge has expired"
                })
              )
              : Effect.void
          )
        } else if (request._tag === "EventLog.WriteSingle") {
          request.resume(Effect.void)
        }
      })).pipe(Effect.forkChild)

      yield* harness.remote.write({
        identity,
        storeId: defaultStoreId,
        entries: [makeEntry()]
      })

      assert.strictEqual(authenticationAttempts, 2)
    }).pipe(Effect.provide(EventLogEncryption.layerSubtle)))

  it.effect("makeUnencrypted authenticates before writing plaintext entries", () =>
    Effect.gen(function*() {
      const harness = yield* makeHarness(EventLogRemote.makeUnencrypted)
      const identity = yield* EventLog.makeIdentity
      const entry = makeEntry()

      const writeFiber = yield* harness.remote.write({
        identity,
        storeId: defaultStoreId,
        entries: [entry]
      }).pipe(Effect.forkChild)
      yield* authenticate({ harness, identity })

      const request = yield* harness.take
      assert(request._tag === "EventLog.WriteSingle")
      const payload = request.request as Rpc.Payload<typeof EventLogMessage.WriteSingleRpc>
      const decoded = yield* EventLogMessage.WriteEntriesUnencrypted.decode(payload.data)

      assert.strictEqual(decoded.publicKey, identity.publicKey)
      assert.strictEqual(decoded.storeId, defaultStoreId)
      assert.strictEqual(decoded.entries.length, 1)
      assert.strictEqual(decoded.entries[0].idString, entry.idString)
      request.resume(Effect.void)

      yield* Fiber.join(writeFiber)
    }).pipe(Effect.provide(EventLogEncryption.layerSubtle)))

  it.effect("makeEncrypted authenticates before writing encrypted entries", () =>
    Effect.gen(function*() {
      const harness = yield* makeHarness(EventLogRemote.makeEncrypted)
      const identity = yield* EventLog.makeIdentity

      const writeFiber = yield* harness.remote.write({
        identity,
        storeId: defaultStoreId,
        entries: [makeEntry()]
      }).pipe(Effect.forkScoped)
      yield* authenticate({ harness, identity })

      const request = yield* harness.take
      assert(request._tag === "EventLog.WriteSingle")
      const payload = request.request as Rpc.Payload<typeof EventLogMessage.WriteSingleRpc>
      const decoded = yield* EventLogMessage.WriteEntries.decode(payload.data)

      assert.strictEqual(decoded.publicKey, identity.publicKey)
      assert.strictEqual(decoded.storeId, defaultStoreId)
      assert.strictEqual(decoded.batches.length, 1)
      assert.strictEqual(decoded.batches[0].entryIds.length, 1)

      request.resume(Effect.void)
      yield* Fiber.join(writeFiber)
    }).pipe(Effect.provide(EventLogEncryption.layerSubtle)))
})

class RemoteHarness extends Context.Service<RemoteHarness, {
  readonly remote: EventLogRemote.EventLogRemote["Service"]
  readonly take: Effect.Effect<{
    readonly _tag: Rpc.Tag<RpcGroup.Rpcs<typeof EventLogMessage.EventLogRemoteRpcs>>
    readonly request: Rpc.Payload<RpcGroup.Rpcs<typeof EventLogMessage.EventLogRemoteRpcs>>
    readonly resume: (response: Effect.Effect<unknown, unknown>) => void
  }>
}>()("RemoteHarness") {}

const makeHarness = Effect.fn(function*(
  makeClient: Effect.Effect<
    EventLogRemote.EventLogRemote["Service"],
    EventLogRemote.EventLogRemoteError,
    EventLogEncryption.EventLogEncryption | EventLogRemote.EventLogRemoteClient | EventLog.Registry | Scope.Scope
  >
): Effect.fn.Return<
  RemoteHarness["Service"],
  EventLogRemote.EventLogRemoteError,
  Scope.Scope
> {
  const requests = yield* Queue.make<{
    readonly _tag: Rpc.Tag<RpcGroup.Rpcs<typeof EventLogMessage.EventLogRemoteRpcs>>
    readonly request: Rpc.Payload<RpcGroup.Rpcs<typeof EventLogMessage.EventLogRemoteRpcs>>
    readonly resume: (response: Effect.Effect<unknown, unknown>) => void
  }>()

  const handleRequest = (tag: string) => <A, E>(request: any) =>
    Effect.callback<A, E>((resume) => {
      Queue.offerUnsafe(requests, {
        _tag: tag as any,
        request,
        resume: resume as any
      })
    })

  const client = yield* RpcTest.makeClient(EventLogMessage.EventLogRemoteRpcs).pipe(
    Effect.provide(EventLogMessage.EventLogRemoteRpcs.toLayer({
      "EventLog.Hello": handleRequest("EventLog.Hello"),
      "EventLog.Authenticate": handleRequest("EventLog.Authenticate"),
      "EventLog.WriteChunked": handleRequest("EventLog.WriteChunked"),
      "EventLog.WriteSingle": handleRequest("EventLog.WriteSingle"),
      "EventLog.Changes": handleRequest("EventLog.Changes")
    })),
    Effect.provideService(
      EventLogMessage.EventLogAuthentication,
      (effect) => Effect.provideService(effect, EventLog.Identity, {} as any)
    )
  )
  const remote = yield* makeClient.pipe(
    Effect.provideService(EventLogRemote.EventLogRemoteClient, client),
    Effect.provide([EventLogEncryption.layerSubtle, EventLog.layerRegistry]),
    Effect.forkChild
  )

  const hello = yield* Queue.take(requests)
  assert(hello._tag === "EventLog.Hello")
  hello.resume(Effect.succeed(
    new EventLogMessage.HelloResponse({
      remoteId,
      challenge
    })
  ))

  return RemoteHarness.of({
    remote: yield* Fiber.join(remote),
    take: Queue.take(requests)
  })
})

const makeEntry = (options?: {
  readonly primaryKey?: string | undefined
  readonly payloadSize?: number | undefined
}): EventJournal.Entry =>
  new EventJournal.Entry({
    id: EventJournal.makeEntryIdUnsafe(),
    event: "UserCreated",
    primaryKey: options?.primaryKey ?? "user-1",
    payload: new Uint8Array(options?.payloadSize ?? 4).fill(1)
  })

const defaultStoreId = EventLogMessage.StoreId.make("default")
const remoteId = EventJournal.makeRemoteIdUnsafe()
const challenge = new Uint8Array(16).fill(1)
const getIdentityRootSecretMaterial = makeGetIdentityRootSecretMaterial(globalThis.crypto)

const authenticate = Effect.fnUntraced(function*(options: {
  readonly harness: RemoteHarness["Service"]
  readonly identity: EventLog.Identity["Service"]
}) {
  const auth = yield* options.harness.take
  assert(auth._tag === "EventLog.Authenticate")
  const payload = auth.request as Rpc.Payload<typeof EventLogMessage.AuthenticateRpc>
  const rootSecretMaterial = yield* getIdentityRootSecretMaterial(options.identity)

  assert.strictEqual(payload.publicKey, options.identity.publicKey)
  assert.strictEqual(payload.algorithm, "Ed25519")
  assert.deepStrictEqual(payload.signingPublicKey, rootSecretMaterial.signingPublicKey)

  const verified = yield* EventLogSessionAuth.verifySessionAuthenticateRequest({
    remoteId,
    challenge,
    publicKey: payload.publicKey,
    signingPublicKey: payload.signingPublicKey,
    signature: payload.signature,
    algorithm: payload.algorithm
  })
  assert.isTrue(verified)
  auth.resume(Effect.void)
})

type Rpcs = RpcGroup.Rpcs<typeof EventLogMessage.EventLogRemoteRpcs>

interface ServerCase {
  readonly name: string
  readonly handlers: Layer.Layer<Rpc.ToHandler<Rpcs> | EventLogMessage.EventLogAuthentication>
  readonly makeRemote: Effect.Effect<
    EventLogRemote.EventLogRemote["Service"],
    EventLogRemote.EventLogRemoteError,
    Scope.Scope | EventLogRemote.EventLogRemoteClient | EventLogEncryption.EventLogEncryption | EventLog.Registry
  >
  readonly encodeWrite: (
    identity: EventLog.Identity["Service"],
    entries: ReadonlyArray<EventJournal.Entry>
  ) => Effect.Effect<Uint8Array<ArrayBuffer>, Schema.SchemaError, EventLogEncryption.EventLogEncryption>
}

const encryptedServer: ServerCase = {
  name: "encrypted",
  handlers: EventLogServerEncrypted.layerRpcHandlers.pipe(
    Layer.provide(EventLogServerEncrypted.layerStorageMemory)
  ),
  makeRemote: EventLogRemote.makeEncrypted,
  encodeWrite: Effect.fnUntraced(function*(identity, entries) {
    const encryption = yield* EventLogEncryption.EventLogEncryption
    const batches = yield* encryption.encrypt(identity, defaultStoreId, entries)
    return yield* new EventLogMessage.WriteEntries({
      publicKey: identity.publicKey,
      storeId: defaultStoreId,
      batches
    }).encoded
  })
}

const unencryptedServer: ServerCase = {
  name: "unencrypted",
  handlers: EventLogServerUnencrypted.layerRpcHandlers.pipe(
    Layer.provide([
      EventLogServerUnencrypted.layerStorageMemory,
      EventLog.layerRegistry,
      EventLogServerUnencrypted.layerStoreMappingStatic({ storeId: defaultStoreId }),
      Layer.succeed(EventLogServerUnencrypted.EventLogServerAuthorization, {
        authorizeWrite: () => Effect.void,
        authorizeRead: () => Effect.void,
        authorizeIdentity: () => Effect.void
      })
    ])
  ),
  makeRemote: EventLogRemote.makeUnencrypted,
  encodeWrite: (identity, entries) =>
    new EventLogMessage.WriteEntriesUnencrypted({
      publicKey: identity.publicKey,
      storeId: defaultStoreId,
      entries
    }).encoded
}

// One RPC server shared by several connections, each with its own client id.
const makeServer = Effect.fnUntraced(function*(serverCase: ServerCase) {
  const handlers = yield* Layer.build(serverCase.handlers)
  const connections = new Map<number, (response: FromServer<Rpcs>) => Effect.Effect<void>>()
  const server = yield* RpcServer.makeNoSerialization(EventLogMessage.EventLogRemoteRpcs, {
    onFromServer: (response) => connections.get(response.clientId)!(response)
  }).pipe(Effect.provide(handlers))
  let nextClientId = 0

  const connect = Effect.fnUntraced(function*(identity: EventLog.Identity["Service"]) {
    const clientId = nextClientId++
    const { client, write } = yield* RpcClient.makeNoSerialization(EventLogMessage.EventLogRemoteRpcs, {
      supportsAck: true,
      onFromClient: ({ message }) => server.write(clientId, message)
    })
    connections.set(clientId, write)
    const remote = yield* serverCase.makeRemote.pipe(
      Effect.provideService(EventLogRemote.EventLogRemoteClient, client),
      Effect.provide(EventLog.layerRegistry)
    )
    yield* remote.whenAuthenticated(Effect.void).pipe(Effect.provideService(EventLog.Identity, identity))
    return {
      remote,
      writeSingle: (entries: ReadonlyArray<EventJournal.Entry>) =>
        serverCase.encodeWrite(identity, entries).pipe(
          Effect.flatMap((data) => client["EventLog.WriteSingle"]({ data }))
        ),
      // Returns the response to the final part, which completes the write.
      writeChunked: Effect.fnUntraced(function*(entries: ReadonlyArray<EventJournal.Entry>) {
        const data = yield* serverCase.encodeWrite(identity, entries)
        const parts = EventLogMessage.ChunkedMessage.split(clientId, data)
        assert.isAbove(parts.length, 1)
        const responses = yield* Effect.forEach(parts, (part) => client["EventLog.WriteChunked"](part))
        // Earlier parts acknowledge nothing.
        assert.deepStrictEqual(responses.slice(0, -1), parts.slice(1).map(() => []))
        return responses[responses.length - 1]
      })
    }
  })

  return { connect }
})

const UserGroup = EventGroup.empty.add({
  tag: "UserCreated",
  primaryKey: (payload) => payload.id,
  payload: Schema.Struct({ id: Schema.String })
})
const schema = EventLog.schema(UserGroup)

const makeUserEntry = Effect.fnUntraced(function*(id: string) {
  return new EventJournal.Entry({
    id: EventJournal.makeEntryIdUnsafe(),
    event: "UserCreated",
    primaryKey: id,
    payload: yield* Schema.encodeUnknownEffect(UserGroup.events.UserCreated.payloadSchemaBinary)({ id })
  }, { disableChecks: true })
})

// A device whose first upload goes to the server. Later uploads signal `paused`
// and fail, so the test can observe the journal after the first upload has
// been fully handled.
const makeDevice = Effect.fnUntraced(function*(options: {
  readonly identity: EventLog.Identity["Service"]
  readonly journal: EventJournal.EventJournal["Service"]
  readonly remote: EventLogRemote.EventLogRemote["Service"]
}) {
  const handled = yield* Queue.unbounded<string>()
  const uploaded = yield* Queue.unbounded<void>()
  const paused = yield* Queue.unbounded<void>()
  const context = yield* Layer.build(
    EventLog.layer(
      schema,
      EventLog.group(
        UserGroup,
        (handlers) => handlers.handle("UserCreated", ({ payload }) => Queue.offer(handled, payload.id))
      )
        .pipe(Layer.provide(EventLog.layerRegistry))
    ).pipe(
      Layer.provide(Layer.succeed(EventJournal.EventJournal, options.journal)),
      Layer.provide(Layer.succeed(EventLog.Identity, options.identity))
    )
  )
  const log = yield* EventLog.EventLog.pipe(Effect.provide(context))
  const registry = yield* EventLog.Registry.pipe(Effect.provide(context))
  let uploads = 0
  const register = registry.registerRemote(EventLogRemote.EventLogRemote.of({
    ...options.remote,
    write: (write) =>
      uploads++ === 0
        ? options.remote.write(write).pipe(Effect.tap(() => Queue.offer(uploaded, undefined)))
        : Queue.offer(paused, undefined).pipe(
          Effect.andThen(Effect.fail(new EventLogRemote.EventLogRemoteError({ method: "write", cause: "paused" })))
        )
  }))
  return {
    handled,
    register,
    writeUser: (id: string) => log.write({ schema, event: "UserCreated", payload: { id } }),
    // Resolves once the first upload has been handled and a second one started.
    firstUploadHandled: Effect.gen(function*() {
      yield* Queue.take(uploaded)
      yield* log.write({ schema, event: "UserCreated", payload: { id: "barrier" } })
      yield* Queue.take(paused)
    })
  }
})

describe("EventLogRemote write acknowledgements", () => {
  for (const serverCase of [encryptedServer, unencryptedServer]) {
    it.effect(`${serverCase.name} server acknowledges writes and does not echo them to the writer`, () =>
      Effect.gen(function*() {
        const server = yield* makeServer(serverCase)
        const identity = yield* EventLog.makeIdentity
        const writer = yield* server.connect(identity)
        // Another device of the same identity.
        const reader = yield* server.connect(identity)
        const writerChanges = yield* writer.remote.changes({ identity, storeId: defaultStoreId, startSequence: 0 })
        const readerChanges = yield* reader.remote.changes({ identity, storeId: defaultStoreId, startSequence: 0 })
        // Both subscriptions are live once they deliver an entry from a third connection.
        const seeder = yield* server.connect(identity)
        const seed = makeEntry()
        yield* seeder.writeSingle([seed])
        yield* Queue.take(writerChanges)
        yield* Queue.take(readerChanges)

        const first = makeEntry()
        const sibling = makeEntry()
        const firstResponse = yield* writer.writeSingle([first, sibling])
        const second = makeEntry({ payloadSize: EventLogMessage.ChunkedMessage.chunkSize })
        // Retry the first batch alongside a new batch after a lost acknowledgement.
        const secondResponse = yield* writer.writeChunked([first, sibling, second])
        const delivered = yield* Queue.takeN(readerChanges, 3)
        // Re-store a batch containing both a known entry and a new one.
        const partial = makeEntry()
        yield* writer.writeSingle([sibling, partial])
        const partialDelivery = yield* Queue.takeN(readerChanges, serverCase.name === "encrypted" ? 2 : 1)
        assert.deepStrictEqual(
          partialDelivery.map(({ entry }) => entry.idString),
          serverCase.name === "encrypted" ? [sibling.idString, partial.idString] : [partial.idString]
        )
        const fromReader = makeEntry()
        yield* reader.writeSingle([fromReader])
        const nextForWriter = yield* Queue.take(writerChanges)
        // A fresh replay still includes the writer's entries.
        const replay = yield* (yield* server.connect(identity)).remote.changes({
          identity,
          storeId: defaultStoreId,
          startSequence: 0
        })

        assert.deepStrictEqual({
          delivered: delivered.map(({ entry }) => entry.idString),
          firstResponse,
          secondResponse,
          nextForWriter: nextForWriter.entry.idString,
          replay: (yield* Queue.takeN(replay, 4)).map(({ entry }) => entry.idString)
        }, {
          delivered: [first.idString, sibling.idString, second.idString],
          firstResponse: [
            { entryId: first.id, sequence: delivered[0].remoteSequence },
            { entryId: sibling.id, sequence: delivered[1].remoteSequence }
          ],
          secondResponse: [
            { entryId: first.id, sequence: delivered[0].remoteSequence },
            { entryId: sibling.id, sequence: delivered[1].remoteSequence },
            { entryId: second.id, sequence: delivered[2].remoteSequence }
          ],
          nextForWriter: fromReader.idString,
          replay: [seed.idString, first.idString, sibling.idString, second.idString]
        })
      }).pipe(Effect.provide(EventLogEncryption.layerSubtle)))
  }

  // The unencrypted server numbers from 1, so it relies on the first sequence
  // reported in the handshake.
  for (const serverCase of [encryptedServer, unencryptedServer]) {
    it.effect(`${serverCase.name} server: records an acknowledged upload without waiting for its echo`, () =>
      Effect.gen(function*() {
        const server = yield* makeServer(serverCase)
        const identity = yield* EventLog.makeIdentity
        const connection = yield* server.connect(identity)
        const journal = yield* EventJournal.makeMemory
        const device = yield* makeDevice({
          identity,
          journal,
          // The change stream stays silent, so only the acknowledgement can record the upload.
          remote: { ...connection.remote, changes: () => Queue.unbounded() }
        })

        yield* device.writeUser("user-1")
        yield* device.register
        yield* device.firstUploadHandled

        const observer = yield* server.connect(identity)
        const stored = yield* Queue.take(
          yield* observer.remote.changes({ identity, storeId: defaultStoreId, startSequence: 0 })
        )
        const next = yield* journal.nextRemoteSequence(connection.remote.id)
        // A reconnect resumes after the upload instead of downloading it again.
        const reconnected = yield* (yield* server.connect(identity)).remote.changes({
          identity,
          storeId: defaultStoreId,
          startSequence: next
        })
        const later = makeEntry()
        yield* observer.writeSingle([later])
        assert.deepStrictEqual({
          next,
          firstAfterReconnect: (yield* Queue.take(reconnected)).entry.idString
        }, {
          next: stored.remoteSequence + 1,
          firstAfterReconnect: later.idString
        })
      }).pipe(Effect.provide(EventLogEncryption.layerSubtle)))
  }

  it.effect("still downloads entries from other devices that precede an acknowledged upload", () =>
    Effect.gen(function*() {
      const server = yield* makeServer(encryptedServer)
      const identity = yield* EventLog.makeIdentity
      const otherDevice = yield* server.connect(identity)
      yield* otherDevice.writeSingle([yield* makeUserEntry("user-0")])

      const connection = yield* server.connect(identity)
      const offline = yield* Queue.unbounded<EventJournal.RemoteEntry, EventLogRemote.EventLogRemoteError>()
      let subscriptions = 0
      const device = yield* makeDevice({
        identity,
        journal: yield* EventJournal.makeMemory,
        remote: {
          ...connection.remote,
          // The first change stream delivers nothing before it disconnects.
          changes: (options) => subscriptions++ === 0 ? Effect.succeed(offline) : connection.remote.changes(options)
        }
      })

      yield* device.writeUser("user-1")
      yield* device.register
      yield* device.firstUploadHandled
      yield* Queue.fail(offline, new EventLogRemote.EventLogRemoteError({ method: "changes", cause: "offline" }))
      yield* TestClock.adjust("200 millis")

      assert.deepStrictEqual(yield* Queue.takeN(device.handled, 3), ["user-1", "barrier", "user-0"])
    }).pipe(Effect.provide(EventLogEncryption.layerSubtle)))
})
