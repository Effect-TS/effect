import { assert, describe, it } from "@effect/vitest"
import { Effect, Layer, Queue, Schema, type Scope } from "effect"
import * as EventGroup from "effect/eventlog/EventGroup"
import * as EventJournal from "effect/eventlog/EventJournal"
import * as EventLog from "effect/eventlog/EventLog"
import * as EventLogEncryption from "effect/eventlog/EventLogEncryption"
import * as EventLogMessage from "effect/eventlog/EventLogMessage"
import * as EventLogRemote from "effect/eventlog/EventLogRemote"
import * as EventLogServerEncrypted from "effect/eventlog/EventLogServerEncrypted"
import * as EventLogServerUnencrypted from "effect/eventlog/EventLogServerUnencrypted"
import type * as Rpc from "effect/rpc/Rpc"
import * as RpcClient from "effect/rpc/RpcClient"
import type * as RpcGroup from "effect/rpc/RpcGroup"
import type { FromServer } from "effect/rpc/RpcMessage"
import * as RpcServer from "effect/rpc/RpcServer"
import { TestClock } from "effect/testing"

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

const storeId = EventLogMessage.StoreId.make("default")

const encryptedServer: ServerCase = {
  name: "encrypted",
  handlers: EventLogServerEncrypted.layerRpcHandlers.pipe(
    Layer.provide(EventLogServerEncrypted.layerStorageMemory)
  ),
  makeRemote: EventLogRemote.makeEncrypted,
  encodeWrite: Effect.fnUntraced(function*(identity, entries) {
    const encryption = yield* EventLogEncryption.EventLogEncryption
    const encrypted = yield* encryption.encrypt(identity, entries)
    return yield* new EventLogMessage.WriteEntries({
      publicKey: identity.publicKey,
      storeId,
      encryptedEntries: encrypted.map(({ encryptedEntry, iv }, i) => ({
        entryId: entries[i].id,
        iv,
        encryptedEntry
      }))
    }).encoded
  })
}

const unencryptedServer: ServerCase = {
  name: "unencrypted",
  handlers: EventLogServerUnencrypted.layerRpcHandlers.pipe(
    Layer.provide([
      EventLogServerUnencrypted.layerStorageMemory,
      EventLog.layerRegistry,
      EventLogServerUnencrypted.layerStoreMappingStatic({ storeId }),
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
      storeId,
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
        return responses[responses.length - 1] as unknown
      })
    }
  })

  return { connect }
})

const toAcks = (response: unknown) =>
  Array.isArray(response)
    ? response.map(({ entryId, sequence }: { readonly entryId: Uint8Array; readonly sequence: number }) => ({
      entryId,
      sequence
    }))
    : response

const makeEntry = (payloadSize = 4) =>
  new EventJournal.Entry({
    id: EventJournal.makeEntryIdUnsafe(),
    event: "Opaque",
    primaryKey: "key",
    payload: new Uint8Array(payloadSize).fill(1)
  }, { disableChecks: true })

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

describe("EventLog write acknowledgements", () => {
  for (const serverCase of [encryptedServer, unencryptedServer]) {
    it.effect(`${serverCase.name} server acknowledges writes and does not echo them to the writer`, () =>
      Effect.gen(function*() {
        const server = yield* makeServer(serverCase)
        const identity = yield* EventLog.makeIdentity
        const writer = yield* server.connect(identity)
        // Another device of the same identity.
        const reader = yield* server.connect(identity)
        const writerChanges = yield* writer.remote.changes({ identity, storeId, startSequence: 0 })
        const readerChanges = yield* reader.remote.changes({ identity, storeId, startSequence: 0 })
        // Both subscriptions are live once they deliver an entry from a third connection.
        const seeder = yield* server.connect(identity)
        yield* seeder.writeSingle([makeEntry()])
        yield* Queue.take(writerChanges)
        yield* Queue.take(readerChanges)

        const first = makeEntry()
        const firstResponse = yield* writer.writeSingle([first])
        const second = makeEntry(EventLogMessage.ChunkedMessage.chunkSize)
        // `first` is sent again, as after a lost acknowledgement.
        const secondResponse = yield* writer.writeChunked([first, second])
        const delivered = yield* Queue.takeN(readerChanges, 2)
        const fromReader = makeEntry()
        yield* reader.writeSingle([fromReader])
        const nextForWriter = yield* Queue.take(writerChanges)

        assert.deepStrictEqual({
          delivered: delivered.map(({ entry }) => entry.idString),
          firstResponse: toAcks(firstResponse),
          secondResponse: toAcks(secondResponse),
          nextForWriter: nextForWriter.entry.idString
        }, {
          delivered: [first.idString, second.idString],
          firstResponse: [{ entryId: first.id, sequence: delivered[0].remoteSequence }],
          secondResponse: [
            { entryId: first.id, sequence: delivered[0].remoteSequence },
            { entryId: second.id, sequence: delivered[1].remoteSequence }
          ],
          nextForWriter: fromReader.idString
        })
      }).pipe(Effect.provide(EventLogEncryption.layerSubtle)))
  }

  it.effect("records an acknowledged upload without waiting for its echo", () =>
    Effect.gen(function*() {
      const server = yield* makeServer(encryptedServer)
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
      const stored = yield* Queue.take(yield* observer.remote.changes({ identity, storeId, startSequence: 0 }))
      assert.strictEqual(yield* journal.nextRemoteSequence(connection.remote.id), stored.remoteSequence + 1)
    }).pipe(Effect.provide(EventLogEncryption.layerSubtle)))

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
