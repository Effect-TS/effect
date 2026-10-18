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
import * as Equal from "../Equal.ts"
import * as Uuid from "../internal/uuid.ts"
import * as Layer from "../Layer.ts"
import * as PubSub from "../PubSub.ts"
import * as RcMap from "../RcMap.ts"
import * as RpcServer from "../rpc/RpcServer.ts"
import type * as Scope from "../Scope.ts"
import * as Stream from "../Stream.ts"
import { type EntryId, makeRemoteIdUnsafe, type RemoteId } from "./EventJournal.ts"
import type { EncryptedBatch, EncryptedRemoteBatch } from "./EventLogEncryption.ts"
import {
  ChangesRpc,
  EventLogProtocolError,
  EventLogRemoteRpcs,
  type StoreId,
  type WriteAck,
  WriteEntries
} from "./EventLogMessage.ts"
import * as EventLogServer from "./EventLogServer.ts"

/**
 * Provides RPC handlers for the encrypted event-log server.
 *
 * **Details**
 *
 * Decodes and persists writes through `Storage`, acknowledging their stored
 * sequences. Change streams encode stored batches, excluding this connection's
 * writes.
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
    firstSequence: storage.firstSequence,
    getOrCreateSessionAuthBinding: (publicKey, signingPublicKey) =>
      storage.getOrCreateSessionAuthBinding(publicKey, signingPublicKey),
    onWrite: Effect.fnUntraced(function*(data, authenticatedPublicKeys, writes) {
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
      if (request.batches.length === 0) return []
      const entryIds = request.batches.flatMap((batch) => batch.entryIds)
      return yield* storage.write(request.publicKey, request.storeId, request.batches).pipe(
        Effect.flatMap((stored) => toWriteAcks(storage, request.publicKey, request.storeId, request.batches, stored)),
        (write) => writes.track({ publicKey: request.publicKey, storeId: request.storeId, entryIds }, write),
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
    changes: ({ publicKey, startSequence, storeId, writes }) =>
      writes.filter(
        {
          publicKey,
          storeId,
          entryIds: (batch) => batch.entryIds,
          sequence: (batch) => batch.sequence + batch.entryIds.length - 1
        },
        storage.changes(publicKey, storeId, startSequence)
      ).pipe(
        Stream.mapArrayEffect((batches) => Effect.map(ChangesRpc.encodeEncrypted(batches), Arr.of))
      )
  })
}))

// Acknowledges each entry occurrence in request order: at its position in the
// batch this write stored, or, for a skipped batch, where it was first stored.
const toWriteAcks = Effect.fnUntraced(function*(
  storage: Storage["Service"],
  publicKey: string,
  storeId: StoreId,
  batches: ReadonlyArray<EncryptedBatch>,
  stored: ReadonlyArray<EncryptedRemoteBatch>
) {
  // Stored batches keep request order, and each batch has its own random iv.
  let next = 0
  const storedAt = batches.map((batch) => {
    if (stored[next] === undefined || !Equal.equals(stored[next].iv, batch.iv)) return undefined
    return stored[next++].sequence
  })
  const skipped = batches.flatMap((batch, i) => storedAt[i] === undefined ? batch.entryIds : [])
  const firstStored = new Map<string, number>()
  if (skipped.length > 0) {
    for (const ack of yield* storage.entrySequences(publicKey, storeId, skipped)) {
      firstStored.set(Uuid.stringify(ack.entryId), ack.sequence)
    }
  }
  const acks: Array<WriteAck> = []
  batches.forEach((batch, b) =>
    batch.entryIds.forEach((entryId, i) => {
      const sequence = storedAt[b] === undefined ? firstStored.get(Uuid.stringify(entryId)) : storedAt[b] + i
      if (sequence !== undefined) acks.push({ entryId, sequence })
    })
  )
  return acks
})

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
 * `entrySequences` returns the sequence each entry was first stored at, so
 * skipped batches can still be acknowledged. `changes` streams every batch
 * whose last sequence is at or after `startSequence`, followed by newly stored
 * batches.
 *
 * @stability unstable
 * @category services
 * @since 4.0.0
 */
export class Storage extends Context.Service<Storage, {
  readonly getId: Effect.Effect<RemoteId>
  /**
   * Lowest assigned sequence (default 0). Overestimating skips entries.
   */
  readonly firstSequence?: number | undefined
  readonly getOrCreateSessionAuthBinding: (
    publicKey: string,
    signingPublicKey: Uint8Array<ArrayBuffer>
  ) => Effect.Effect<Uint8Array<ArrayBuffer>>
  readonly write: (
    publicKey: string,
    storeId: StoreId,
    batches: ReadonlyArray<EncryptedBatch>
  ) => Effect.Effect<ReadonlyArray<EncryptedRemoteBatch>>
  readonly entrySequences: (
    publicKey: string,
    storeId: StoreId,
    entryIds: ReadonlyArray<EntryId>
  ) => Effect.Effect<ReadonlyArray<WriteAck>>
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
    // Entry id to the sequence it was first stored at.
    readonly knownIds: Map<string, number>
    readonly batches: Array<EncryptedRemoteBatch>
    nextSequence: number
  }>()
  const sessionAuthBindings = new Map<string, Uint8Array<ArrayBuffer>>()
  const remoteId = makeRemoteIdUnsafe()
  const ensureJournal = (scopeKey: string) => {
    let journal = journals.get(scopeKey)
    if (journal) return journal
    journal = { knownIds: new Map(), batches: [], nextSequence: 0 }
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
        ids.forEach((id, i) => {
          if (!journal.knownIds.has(id)) journal.knownIds.set(id, journal.nextSequence + i)
        })
        const remoteBatch: EncryptedRemoteBatch = { sequence: journal.nextSequence, ...batch }
        journal.nextSequence += ids.length
        journal.batches.push(remoteBatch)
        stored.push(remoteBatch)
        PubSub.publishUnsafe(pubsub, remoteBatch)
      }
      return stored
    }, Effect.scoped),
    entrySequences: (publicKey, storeId, entryIds) =>
      Effect.sync(() => {
        const knownIds = ensureJournal(makeEncryptedScopeKey({ publicKey, storeId })).knownIds
        const acks: Array<WriteAck> = []
        for (const entryId of entryIds) {
          const sequence = knownIds.get(Uuid.stringify(entryId))
          if (sequence !== undefined) acks.push({ entryId, sequence })
        }
        return acks
      }),
    changes: Effect.fnUntraced(function*(publicKey, storeId, startSequence) {
      const scopeKey = makeEncryptedScopeKey({ publicKey, storeId })
      const pubsub = yield* RcMap.get(pubsubs, scopeKey)
      const subscription = yield* PubSub.subscribe(pubsub)
      const batches = ensureJournal(scopeKey).batches
      const first = batches.findIndex((batch) => batch.sequence + batch.entryIds.length > startSequence)
      return Stream.fromArray(first === -1 ? [] : batches.slice(first)).pipe(
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
