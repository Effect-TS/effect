/**
 * Serves encrypted event-log replication.
 *
 * Encrypted `EventLogRemote` clients use this module when they need a remote
 * synchronization endpoint that never sees plaintext events. The server stores
 * encrypted entries and replication metadata keyed by client public key and
 * store id, then streams encrypted changes back to clients for local
 * decryption. This module defines the RPC handlers, server layer, storage
 * contract, and in-memory storage layer for that encrypted server path.
 *
 * @stability unstable
 * @since 4.0.0
 */
import * as Arr from "../Array.ts"
import * as Context from "../Context.ts"
import * as Effect from "../Effect.ts"
import * as Uuid from "../internal/uuid.ts"
import * as Layer from "../Layer.ts"
import * as PubSub from "../PubSub.ts"
import * as RcMap from "../RcMap.ts"
import * as RpcServer from "../rpc/RpcServer.ts"
import type * as Scope from "../Scope.ts"
import * as Stream from "../Stream.ts"
import { makeRemoteIdUnsafe, type RemoteId } from "./EventJournal.ts"
import type { EncryptedBatch, EncryptedRemoteBatch } from "./EventLogEncryption.ts"
import { ChangesRpc, EventLogProtocolError, EventLogRemoteRpcs, type StoreId, WriteEntries } from "./EventLogMessage.ts"
import * as EventLogServer from "./EventLogServer.ts"

/**
 * Provides RPC handlers for the encrypted event-log server.
 *
 * **Details**
 *
 * Incoming encrypted batches are decoded and persisted through `Storage`;
 * change streams read encrypted batches from storage and encode them for the
 * remote protocol.
 *
 * @stability unstable
 * @category layers
 * @since 4.0.0
 */
export const layerRpcHandlers = Layer.unwrap(Effect.gen(function*() {
  const storage = yield* Storage
  const remoteId = yield* storage.getId

  return EventLogServer.layerRpcHandlers({
    remoteId,
    getOrCreateSessionAuthBinding: (publicKey, signingPublicKey) =>
      storage.getOrCreateSessionAuthBinding(publicKey, signingPublicKey),
    onWrite: Effect.fnUntraced(function*(data, authenticatedPublicKeys) {
      const request = yield* WriteEntries.decode(data).pipe(
        Effect.mapError((_) =>
          new EventLogProtocolError({
            requestTag: "WriteEntries",
            publicKey: undefined,
            code: "InternalServerError",
            message: "Decoding failure"
          })
        )
      )
      if (!authenticatedPublicKeys.has(request.publicKey)) {
        return yield* new EventLogProtocolError({
          requestTag: "WriteEntries",
          publicKey: request.publicKey,
          code: "Forbidden",
          message: "Identity is not authenticated"
        })
      }
      if (request.batches.length === 0) return
      return yield* storage.write(request.publicKey, request.storeId, request.batches).pipe(
        Effect.catchCause((_) =>
          Effect.fail(
            new EventLogProtocolError({
              requestTag: "WriteEntries",
              publicKey: request.publicKey,
              code: "InternalServerError",
              message: "Persistence failure"
            })
          )
        )
      )
    }),
    changes: ({ publicKey, storeId, startSequence }) =>
      storage.changes(publicKey, storeId, startSequence).pipe(
        Stream.mapArrayEffect((entries) => Effect.map(ChangesRpc.encodeEncrypted(entries), Arr.of))
      )
  })
}))

/**
 * Provides an encrypted event-log RPC server using `EventLogRemoteRpcs` and the
 * encrypted server RPC handlers.
 *
 * **When to use**
 *
 * Use when you need an encrypted event-log RPC server for encrypted
 * `EventLogRemote` replication over an existing `RpcServer.Protocol`.
 *
 * **Details**
 *
 * This layer installs `EventLogRemoteRpcs` on the provided RPC server protocol
 * and wires those RPCs to `layerRpcHandlers`. Encrypted batches, session
 * authentication bindings, remote ids, and change streams are delegated to
 * `Storage`.
 *
 * @see {@link layerRpcHandlers} for the encrypted handler layer without installing an RPC server protocol
 * @see {@link Storage} for the storage service required by this layer
 * @see {@link layerStorageMemory} for the process-local in-memory storage layer
 *
 * @stability unstable
 * @category layers
 * @since 4.0.0
 */
export const layer: Layer.Layer<never, never, RpcServer.Protocol | Storage> = RpcServer.layer(EventLogRemoteRpcs).pipe(
  Layer.provide(layerRpcHandlers)
)

/**
 * Defines the backing store service used by the encrypted event-log server.
 *
 * **When to use**
 *
 * Use to provide durable encrypted event-log persistence for an encrypted
 * event-log server layer.
 *
 * **Details**
 *
 * It provides the server remote id, stores session authentication bindings,
 * persists encrypted batches, and streams encrypted changes for a public key and
 * store id.
 *
 * A batch owns one remote sequence per entry, starting at its `sequence`.
 * `write` stores a batch unless every one of its entry ids is already stored,
 * which makes retried writes idempotent, and returns the batches it stored.
 * `changes` streams every batch whose last sequence is at or after
 * `startSequence`, followed by newly stored batches.
 *
 * @stability unstable
 * @category services
 * @since 4.0.0
 */
export class Storage extends Context.Service<Storage, {
  readonly getId: Effect.Effect<RemoteId>
  readonly getOrCreateSessionAuthBinding: (
    publicKey: string,
    signingPublicKey: Uint8Array<ArrayBuffer>
  ) => Effect.Effect<Uint8Array<ArrayBuffer>>
  readonly write: (
    publicKey: string,
    storeId: StoreId,
    batches: ReadonlyArray<EncryptedBatch>
  ) => Effect.Effect<ReadonlyArray<EncryptedRemoteBatch>>
  readonly changes: (
    publicKey: string,
    storeId: StoreId,
    startSequence: number
  ) => Stream.Stream<EncryptedRemoteBatch>
}>()("effect/eventlog/EventLogServer/Storage") {}

/**
 * Creates an in-memory encrypted server `Storage`.
 *
 * **Details**
 *
 * Data, session authentication bindings, and streams are process-local and are
 * released with the surrounding scope.
 *
 * @stability unstable
 * @category constructors
 * @since 4.0.0
 */
export const makeStorageMemory: Effect.Effect<Storage["Service"], never, Scope.Scope> = Effect.gen(function*() {
  const journals = new Map<string, {
    readonly knownIds: Set<string>
    readonly batches: Array<EncryptedRemoteBatch>
    nextSequence: number
  }>()
  const sessionAuthBindings = new Map<string, Uint8Array<ArrayBuffer>>()
  const remoteId = makeRemoteIdUnsafe()
  const ensureJournal = (scopeKey: string) => {
    let journal = journals.get(scopeKey)
    if (journal) return journal
    journal = { knownIds: new Set(), batches: [], nextSequence: 0 }
    journals.set(scopeKey, journal)
    return journal
  }
  const pubsubs = yield* RcMap.make({
    lookup: (_scopeKey: string) =>
      Effect.acquireRelease(
        PubSub.unbounded<EncryptedRemoteBatch>(),
        PubSub.shutdown
      ),
    idleTimeToLive: 60000
  })

  return Storage.of({
    getId: Effect.succeed(remoteId),
    getOrCreateSessionAuthBinding: (publicKey, signingPublicKey) =>
      Effect.sync(() => {
        let existing = sessionAuthBindings.get(publicKey)
        if (existing) return existing
        sessionAuthBindings.set(publicKey, signingPublicKey)
        return signingPublicKey
      }),
    write: Effect.fnUntraced(function*(publicKey, storeId, batches) {
      const scopeKey = makeEncryptedScopeKey({ publicKey, storeId })
      const pubsub = yield* RcMap.get(pubsubs, scopeKey)
      const journal = ensureJournal(scopeKey)
      const stored: Array<EncryptedRemoteBatch> = []
      for (const batch of batches) {
        const ids = batch.entryIds.map(Uuid.stringify)
        if (ids.every((id) => journal.knownIds.has(id))) continue
        for (const id of ids) journal.knownIds.add(id)
        const remoteBatch: EncryptedRemoteBatch = { sequence: journal.nextSequence, ...batch }
        journal.nextSequence += ids.length
        journal.batches.push(remoteBatch)
        stored.push(remoteBatch)
        PubSub.publishUnsafe(pubsub, remoteBatch)
      }
      return stored
    }, Effect.scoped),
    changes: Effect.fnUntraced(function*(publicKey, storeId, startSequence) {
      const scopeKey = makeEncryptedScopeKey({ publicKey, storeId })
      const pubsub = yield* RcMap.get(pubsubs, scopeKey)
      const subscription = yield* PubSub.subscribe(pubsub)
      const batches = ensureJournal(scopeKey).batches
      // Binary search for the first batch whose last sequence is at or after `startSequence`.
      let low = 0
      let high = batches.length
      while (low < high) {
        const mid = (low + high) >>> 1
        const batch = batches[mid]
        if (batch.sequence + batch.entryIds.length <= startSequence) low = mid + 1
        else high = mid
      }
      return Stream.fromArray(batches.slice(low)).pipe(
        Stream.concat(Stream.fromSubscription(subscription))
      )
    }, Stream.unwrap)
  })
})

/**
 * Provides encrypted server `Storage` using the in-memory implementation.
 *
 * @stability unstable
 * @category layers
 * @since 4.0.0
 */
export const layerStorageMemory: Layer.Layer<Storage> = Layer.effect(Storage)(makeStorageMemory)

const makeEncryptedScopeKey = ({ publicKey, storeId }: {
  readonly publicKey: string
  readonly storeId: StoreId
}): string => {
  return `${publicKey}/${storeId}`
}
