import { assert, describe, it } from "@effect/vitest"
import { Array, Context, Deferred, Effect, Fiber, Layer, Option, Queue, type Scope, Stream } from "effect"
import * as EventJournal from "effect/eventlog/EventJournal"
import * as EventLog from "effect/eventlog/EventLog"
import * as EventLogEncryption from "effect/eventlog/EventLogEncryption"
import * as EventLogMessage from "effect/eventlog/EventLogMessage"
import * as EventLogRemote from "effect/eventlog/EventLogRemote"
import * as EventLogServer from "effect/eventlog/EventLogServer"
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
      const acks = [{ entryId: entry.id, sequence: 5 }]
      request.resume(Effect.succeed(acks))
      assert.deepStrictEqual(yield* Fiber.join(writeFiber), acks)
    }).pipe(Effect.provide(EventLogEncryption.layerSubtle)))

  it.effect("pipelines at most four chunks and retains completion acks before a later empty response", () =>
    Effect.gen(function*() {
      const harness = yield* makeHarness(EventLogRemote.makeUnencrypted)
      const identity = yield* EventLog.makeIdentity
      const entry = makeEntry({ payloadSize: EventLogMessage.ChunkedMessage.chunkSize * 4 })
      const write = yield* harness.remote.write({
        identity,
        storeId: defaultStoreId,
        entries: [entry]
      }).pipe(Effect.forkChild)
      yield* authenticate({ harness, identity })

      const first = yield* harness.take
      assert(first._tag === "EventLog.WriteChunked")
      // A virtual deadline turns a sequential sender into an assertion failure,
      // rather than hanging the test while the first response is withheld.
      const takeChunk = Effect.gen(function*() {
        const pending = yield* harness.take.pipe(Effect.timeoutOption("1 second"), Effect.forkChild)
        yield* TestClock.adjust("1 second")
        const result = yield* Fiber.join(pending)
        assert(Option.isSome(result), "expected another chunk before acknowledging the first")
        assert(result.value._tag === "EventLog.WriteChunked")
        return result.value
      })
      const second = yield* takeChunk
      const third = yield* takeChunk
      const fourth = yield* takeChunk
      const pendingFifth = yield* harness.take.pipe(Effect.timeoutOption("1 second"), Effect.forkChild)
      yield* TestClock.adjust("1 second")
      assert.isTrue(Option.isNone(yield* Fiber.join(pendingFifth)), "expected the fifth chunk to wait for a response")

      second.resume(Effect.succeed([]))
      const fifth = yield* takeChunk
      const parts = [first, second, third, fourth, fifth].map((request) =>
        request.request as Rpc.Payload<typeof EventLogMessage.WriteChunkedRpc>
      )
      assert.deepStrictEqual(parts.map((part) => part.part), [[0, 5], [1, 5], [2, 5], [3, 5], [4, 5]])
      assert.isTrue(parts.every((part) => part.id === parts[0].id))

      // Part 0 completes the message; part 4 has a delayed empty reply.
      third.resume(Effect.succeed([]))
      fourth.resume(Effect.succeed([]))
      const acks = [{ entryId: entry.id, sequence: 5 }]
      first.resume(Effect.succeed(acks))
      yield* TestClock.adjust("1 second")
      fifth.resume(Effect.succeed([]))
      assert.deepStrictEqual(yield* Fiber.join(write), acks)
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

// One RPC server shared by connections with distinct client ids.
const makeServer = Effect.fnUntraced(function*(encrypted: boolean) {
  const handlers = yield* Layer.build(
    encrypted
      ? EventLogServerEncrypted.layerRpcHandlers.pipe(Layer.provide(EventLogServerEncrypted.layerStorageMemory))
      : EventLogServerUnencrypted.layerRpcHandlers.pipe(Layer.provide([
        EventLogServerUnencrypted.layerStorageMemory,
        EventLog.layerRegistry,
        EventLogServerUnencrypted.layerStoreMappingStatic({ storeId: defaultStoreId }),
        Layer.succeed(EventLogServerUnencrypted.EventLogServerAuthorization, {
          authorizeWrite: () => Effect.void,
          authorizeRead: () => Effect.void,
          authorizeIdentity: () => Effect.void
        })
      ]))
  )
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
    const remote = yield* (encrypted ? EventLogRemote.makeEncrypted : EventLogRemote.makeUnencrypted).pipe(
      Effect.provideService(EventLogRemote.EventLogRemoteClient, client),
      Effect.provide(EventLog.layerRegistry)
    )
    yield* remote.whenAuthenticated(Effect.void).pipe(Effect.provideService(EventLog.Identity, identity))
    const encodeWrite = Effect.fnUntraced(function*(entries: ReadonlyArray<EventJournal.Entry>) {
      const fields = { publicKey: identity.publicKey, storeId: defaultStoreId }
      return yield* encrypted
        ? new EventLogMessage.WriteEntries({
          ...fields,
          batches: yield* (yield* EventLogEncryption.EventLogEncryption).encrypt(identity, defaultStoreId, entries)
        }).encoded
        : new EventLogMessage.WriteEntriesUnencrypted({ ...fields, entries }).encoded
    })
    return {
      remote,
      writeBatches: (batches: ReadonlyArray<EventLogEncryption.EncryptedBatch>) =>
        new EventLogMessage.WriteEntries({
          publicKey: identity.publicKey,
          storeId: defaultStoreId,
          batches
        }).encoded.pipe(Effect.flatMap((data) => client["EventLog.WriteSingle"]({ data }))),
      writeSingle: (entries: ReadonlyArray<EventJournal.Entry>) =>
        encodeWrite(entries).pipe(
          Effect.flatMap((data) => client["EventLog.WriteSingle"]({ data }))
        ),
      // Reverse arrival order: index 0, not the highest index, completes the write.
      writeChunked: Effect.fnUntraced(function*(entries: ReadonlyArray<EventJournal.Entry>) {
        const data = yield* encodeWrite(entries)
        const parts = Array.reverse(EventLogMessage.ChunkedMessage.split(clientId, data))
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

describe("EventLogRemote write acknowledgements", () => {
  it.effect("keeps concurrent overlapping writes suppressed after the first write completes", () =>
    Effect.gen(function*() {
      const writes = new EventLogServer.ConnectionWrites()
      const options = { publicKey: "writer", storeId: defaultStoreId }
      type Item = { entryIds: ReadonlyArray<EventJournal.EntryId>; sequence: number }
      const input = yield* Queue.make<Item>()
      const output = yield* Queue.make<Item>()
      yield* writes.filter({
        ...options,
        entryIds: (item: Item) => item.entryIds,
        sequence: (item) => item.sequence
      }, Stream.fromQueue(input)).pipe(
        Stream.runForEach((item) => Queue.offer(output, item)),
        Effect.forkScoped
      )
      const marker = (sequence: number): Item => ({ entryIds: [EventJournal.makeEntryIdUnsafe()], sequence })
      yield* Queue.offer(input, marker(0))
      yield* Queue.take(output)

      const a = EventJournal.makeEntryIdUnsafe()
      const b = EventJournal.makeEntryIdUnsafe()
      const c = EventJournal.makeEntryIdUnsafe()
      const started = yield* Queue.make<void>()
      const firstDone = yield* Deferred.make<ReadonlyArray<EventLogMessage.WriteAck>>()
      const secondDone = yield* Deferred.make<ReadonlyArray<EventLogMessage.WriteAck>>()
      const first = yield* Effect.suspend(() =>
        writes.track(
          { ...options, entryIds: [a, b] },
          Queue.offer(started, undefined).pipe(Effect.andThen(Deferred.await(firstDone)))
        )
      ).pipe(Effect.forkScoped)
      const second = yield* Effect.suspend(() =>
        writes.track(
          { ...options, entryIds: [a, c] },
          Queue.offer(started, undefined).pipe(Effect.andThen(Deferred.await(secondDone)))
        )
      ).pipe(Effect.forkScoped)
      yield* Queue.takeN(started, 2)

      yield* Queue.offer(input, { entryIds: [a, b], sequence: 2 })
      const firstMarker = marker(3)
      yield* Queue.offer(input, firstMarker)
      assert.deepStrictEqual(yield* Queue.take(output), firstMarker)
      yield* Deferred.succeed(firstDone, [{ entryId: a, sequence: 1 }, { entryId: b, sequence: 2 }])
      yield* Fiber.join(first)

      yield* Queue.offer(input, { entryIds: [a, c], sequence: 5 })
      const secondMarker = marker(6)
      yield* Queue.offer(input, secondMarker)
      assert.deepStrictEqual(yield* Queue.take(output), secondMarker)
      yield* Deferred.succeed(secondDone, [{ entryId: a, sequence: 4 }, { entryId: c, sequence: 5 }])
      yield* Fiber.join(second)
    }))

  for (const encrypted of [true, false]) {
    it.effect(`${encrypted ? "encrypted" : "unencrypted"}: ordered duplicate acks, out-of-order chunk reassembly and connection-scoped echoes`, () =>
      Effect.gen(function*() {
        const server = yield* makeServer(encrypted)
        const identity = yield* EventLog.makeIdentity
        const writer = yield* server.connect(identity)
        const reader = yield* server.connect(identity)
        assert.strictEqual(writer.remote.firstSequence ?? 0, encrypted ? 0 : 1)
        const writerChanges = yield* writer.remote.changes({ identity, storeId: defaultStoreId, startSequence: 0 })
        const readerChanges = yield* reader.remote.changes({ identity, storeId: defaultStoreId, startSequence: 0 })
        // A third connection's entry makes both subscriptions live.
        const seed = makeEntry()
        yield* (yield* server.connect(identity)).writeSingle([seed])
        yield* Queue.take(writerChanges)
        yield* Queue.take(readerChanges)

        const a = makeEntry()
        const b = makeEntry({ payloadSize: EventLogMessage.ChunkedMessage.chunkSize })
        const acks = yield* writer.writeSingle([a, b])
        assert.deepStrictEqual(yield* writer.writeChunked([b, a]), [...acks].reverse())
        const delivered = yield* Queue.takeN(readerChanges, 2)
        assert.deepStrictEqual(delivered.map(({ entry }) => entry.idString), [a.idString, b.idString])
        assert.deepStrictEqual(
          acks,
          delivered.map(({ entry, remoteSequence }) => ({
            entryId: entry.id,
            sequence: remoteSequence
          }))
        )

        const marker = makeEntry()
        yield* reader.writeSingle([marker])
        assert.strictEqual((yield* Queue.take(writerChanges)).entry.idString, marker.idString)
        const replay = yield* (yield* server.connect(identity)).remote.changes({
          identity,
          storeId: defaultStoreId,
          startSequence: 0
        })
        assert.deepStrictEqual((yield* Queue.takeN(replay, 3)).map(({ entry }) => entry.idString), [
          seed.idString,
          a.idString,
          b.idString
        ])
      }).pipe(Effect.provide(EventLogEncryption.layerSubtle)))
  }

  it.effect("acknowledges and suppresses each occurrence in overlapping encrypted batches", () =>
    Effect.gen(function*() {
      const server = yield* makeServer(true)
      const identity = yield* EventLog.makeIdentity
      const writer = yield* server.connect(identity)
      const reader = yield* server.connect(identity)
      const writerChanges = yield* writer.remote.changes({ identity, storeId: defaultStoreId, startSequence: 0 })
      yield* reader.writeSingle([makeEntry()])
      yield* Queue.take(writerChanges)
      const readerChanges = yield* reader.remote.changes({ identity, storeId: defaultStoreId, startSequence: 1 })
      const encryption = yield* EventLogEncryption.EventLogEncryption
      const a = makeEntry()
      const b = makeEntry()
      const acks = yield* writer.writeBatches([
        ...yield* encryption.encrypt(identity, defaultStoreId, [a]),
        ...yield* encryption.encrypt(identity, defaultStoreId, [a, b])
      ])
      const delivered = yield* Queue.takeN(readerChanges, 3)
      const marker = makeEntry()
      yield* reader.writeSingle([marker])
      assert.deepStrictEqual({
        acks,
        nextForWriter: (yield* Queue.take(writerChanges)).entry.idString
      }, {
        acks: delivered.map(({ entry, remoteSequence }) => ({ entryId: entry.id, sequence: remoteSequence })),
        nextForWriter: marker.idString
      })
    }).pipe(Effect.provide(EventLogEncryption.layerSubtle)))
})
