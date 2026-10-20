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
import * as Data from "../Data.ts"
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
 * Storages that support remote compaction provide `compaction`. With an active
 * snapshot, `changes` serves snapshot batches by their virtual sequences for a
 * start sequence at or below the snapshot base, then the originals above it.
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
  readonly compaction?: StorageCompaction | undefined
}>()("effect/eventlog/EventLogServer/Storage") {}

/**
 * Storage primitives for encrypted remote compaction.
 *
 * **Details**
 *
 * The server owns policy and checks: the trigger threshold, lag, no-op
 * backoff, commit checks and virtual sequence assignment. Each primitive here
 * is atomic per store.
 *
 * A store always has one active activation. Before the first commit it is the
 * originals, with base `firstSequence - 1`. `begin` opens a stage pinned to the
 * active activation and to `through`. The stage claim expires `stageTtl` after
 * begin or the latest stored Part, and `begin` takes over an expired claim.
 * Stage-scoped primitives fail with `CompactionNotFound` once the stage has
 * expired, been withdrawn, committed (except `commit` itself) or belongs to
 * another store.
 *
 * `stagePart` stores one segment of encrypted snapshot batches. A segment that
 * is already stored answers `AlreadyStored` and stores nothing. A Part that
 * repeats an entry id staged earlier fails with `CompactionInvalidRequest` and
 * withdraws the stage. `commit` takes the virtual start sequence of every staged
 * batch in position order, and activates the staged set only if the pinned
 * activation is still active.
 *
 * `rollback` reactivates the previous generation under a new activation id and
 * bumps `rollbackEpoch`. A sweep on `Clock` prunes a generation, with the
 * originals it replaced, `grace` after it was superseded or withdrawn.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export interface StorageCompaction {
  readonly status: (publicKey: string, storeId: StoreId) => Effect.Effect<CompactionStoreStatus>
  readonly begin: (
    publicKey: string,
    storeId: StoreId,
    options: { readonly through: number }
  ) => Effect.Effect<CompactionBeginResult>
  /**
   * Batch headers in input order: the pinned batch set, then the originals in
   * `(base, through]`.
   */
  readonly inputHeaders: (
    publicKey: string,
    storeId: StoreId,
    stageId: string
  ) => Stream.Stream<CompactionBatchHeader, CompactionNotFound>
  /**
   * Input batches by their input sequence: snapshot batches at or below the
   * pinned base, originals above it.
   */
  readonly fetch: (
    publicKey: string,
    storeId: StoreId,
    stageId: string,
    sequences: ReadonlyArray<number>
  ) => Stream.Stream<EncryptedRemoteBatch, CompactionNotFound>
  readonly stagePart: (
    publicKey: string,
    storeId: StoreId,
    stageId: string,
    segment: number,
    batches: Arr.NonEmptyReadonlyArray<EncryptedBatch>
  ) => Effect.Effect<"Stored" | "AlreadyStored", CompactionInvalidRequest | CompactionNotFound>
  /**
   * Staged batch headers in position order (segment, then batch index).
   */
  readonly stagedHeaders: (
    publicKey: string,
    storeId: StoreId,
    stageId: string
  ) => Stream.Stream<{ readonly position: number; readonly entryIds: ReadonlyArray<EntryId> }, CompactionNotFound>
  /**
   * Answers a retried commit from the activation the stage created.
   */
  readonly commit: (
    publicKey: string,
    storeId: StoreId,
    stageId: string,
    virtualSequences: ReadonlyArray<number>
  ) => Effect.Effect<"Committed" | "Superseded", CompactionNotFound>
  readonly recordNoOp: (publicKey: string, storeId: StoreId, stageId: string) => Effect.Effect<void, CompactionNotFound>
  /**
   * Releases an open stage. A late abort is a no-op.
   */
  readonly abort: (publicKey: string, storeId: StoreId, stageId: string) => Effect.Effect<void>
  readonly withdraw: (publicKey: string, storeId: StoreId, stageId: string) => Effect.Effect<void>
  readonly rollback: (
    publicKey: string,
    storeId: StoreId,
    expectedActivationId: string
  ) => Effect.Effect<string, CompactionRollbackError>
  /**
   * Every activation of the store, oldest first.
   */
  readonly history: (publicKey: string, storeId: StoreId) => Effect.Effect<ReadonlyArray<CompactionActivation>>
}

/**
 * The compaction state of one store.
 *
 * **Details**
 *
 * `base` is `firstSequence - 1` while the originals are active. `lagHead` is
 * the highest last sequence in a storage-time hour that ended before
 * `now - lag`. `nextSweepAt` is the earliest time anything in the store can be
 * pruned.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export interface CompactionStoreStatus {
  readonly head: number
  readonly base: number
  readonly activeKeptCount: number
  readonly lagHead: number
  readonly rollbackEpoch: number
  readonly noOp: { readonly at: number; readonly count: number } | undefined
  readonly openStage: { readonly expiresAt: number } | undefined
  readonly nextSweepAt: number | undefined
}

/**
 * The result of opening a compaction stage.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export type CompactionBeginResult = {
  readonly _tag: "Started"
  readonly stageId: string
  readonly entryCount: number
  readonly batchCount: number
} | {
  readonly _tag: "Busy"
  readonly expiresAt: number
}

/**
 * The header of one compaction input batch.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export interface CompactionBatchHeader {
  readonly sequence: number
  readonly entryIds: ReadonlyArray<EntryId>
}

/**
 * One entry of a store's activation log.
 *
 * **Details**
 *
 * `keptCount` is `undefined` for the originals. `restorable` is `false` once
 * the generation's prune has started.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export interface CompactionActivation {
  readonly activationId: string
  readonly base: number
  readonly keptCount: number | undefined
  readonly active: boolean
  readonly supersededAt: number | undefined
  readonly restorable: boolean
}

/**
 * Error raised when a compaction stage has expired, was withdrawn or committed,
 * or is unknown to the store.
 *
 * @stability unstable
 * @category errors
 * @since 4.0.0
 */
export class CompactionNotFound extends Data.TaggedError("CompactionNotFound")<{
  readonly stageId: string
}> {}

/**
 * Error raised when a compaction Part fails validation.
 *
 * @stability unstable
 * @category errors
 * @since 4.0.0
 */
export class CompactionInvalidRequest extends Data.TaggedError("CompactionInvalidRequest")<{
  readonly stageId: string
  readonly message: string
}> {}

/**
 * Error raised when a rollback is refused.
 *
 * **Details**
 *
 * `NotActive` means the expected activation is not the active one,
 * `NoPrevious` that there is no earlier generation, and `PruneStarted` that
 * the previous generation has started to be pruned.
 *
 * @stability unstable
 * @category errors
 * @since 4.0.0
 */
export class CompactionRollbackError extends Data.TaggedError("CompactionRollbackError")<{
  readonly reason: "NotActive" | "NoPrevious" | "PruneStarted"
}> {}

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
