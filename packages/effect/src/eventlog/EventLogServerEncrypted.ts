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
import * as Cause from "../Cause.ts"
import * as Clock from "../Clock.ts"
import * as Context from "../Context.ts"
import * as Data from "../Data.ts"
import * as Duration from "../Duration.ts"
import * as Effect from "../Effect.ts"
import * as Equal from "../Equal.ts"
import * as Uuid from "../internal/uuid.ts"
import * as Latch from "../Latch.ts"
import * as Layer from "../Layer.ts"
import * as PubSub from "../PubSub.ts"
import * as Pull from "../Pull.ts"
import * as RcMap from "../RcMap.ts"
import type * as Rpc from "../rpc/Rpc.ts"
import type * as RpcGroup from "../rpc/RpcGroup.ts"
import * as RpcServer from "../rpc/RpcServer.ts"
import type * as Scope from "../Scope.ts"
import * as Stream from "../Stream.ts"
import { type EntryId, makeRemoteIdUnsafe, type RemoteId } from "./EventJournal.ts"
import type { EncryptedBatch, EncryptedRemoteBatch } from "./EventLogEncryption.ts"
import {
  ChangesRpc,
  ChunkedMessage,
  type CompactionInputHeader,
  CompactionInputRpc,
  CompactionPartRpc,
  CompactionStatus,
  type EventLogAuthentication,
  EventLogCompactionRpcs,
  EventLogProtocolError,
  EventLogRemoteRpcs,
  SingleMessage,
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
 * It also provides the `EventLogCompactionRpcs` handlers. When `Storage`
 * provides `compaction`, `HelloResponse.compaction` is set and the handlers
 * apply the compaction policy on top of the storage primitives. Otherwise they
 * fail with a `NotFound` error.
 *
 * @stability unstable
 * @category layers
 * @since 4.0.0
 */
export const layerRpcHandlers: Layer.Layer<
  | Rpc.ToHandler<RpcGroup.Rpcs<typeof EventLogRemoteRpcs>>
  | Rpc.ToHandler<RpcGroup.Rpcs<typeof EventLogCompactionRpcs>>
  | EventLogAuthentication,
  never,
  Storage
> = Layer.unwrap(Effect.gen(function*() {
  const storage = yield* Storage
  const remoteId = yield* storage.getId

  return Layer.merge(
    EventLogServer.layerRpcHandlers({
      remoteId,
      firstSequence: storage.firstSequence,
      compaction: storage.compaction !== undefined,
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
    }),
    layerCompactionRpcHandlers(storage)
  )
}))

// Acknowledges each entry occurrence in request order: at its position in the
// batch this write stored, or, for a skipped batch, where it was first stored
// if that is above the active compaction base.
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
    // An id first stored at or below the active base may have been dropped, so
    // acking it would move the client's cursor past kept entries.
    const base = storage.compaction === undefined
      ? -Infinity
      : (yield* storage.compaction.status(publicKey, storeId)).base
    for (const ack of yield* storage.entrySequences(publicKey, storeId, skipped)) {
      if (ack.sequence > base) firstStored.set(Uuid.stringify(ack.entryId), ack.sequence)
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

const layerCompactionRpcHandlers = (storage: Storage["Service"]) =>
  EventLogCompactionRpcs.toLayer(Effect.sync(() => {
    const compaction = storage.compaction
    const firstSequence = storage.firstSequence ?? 0
    let chunkedIdCounter = 0
    const toFrames = (data: Uint8Array<ArrayBuffer>): Arr.NonEmptyReadonlyArray<SingleMessage | ChunkedMessage> =>
      data.byteLength <= ChunkedMessage.chunkSize
        ? [new SingleMessage({ data })]
        : ChunkedMessage.split(chunkedIdCounter++, data)

    type Request = { readonly publicKey: string; readonly storeId: StoreId }
    const protocolError = (
      requestTag: string,
      request: Request,
      code: EventLogProtocolError["code"],
      message: string
    ) =>
      new EventLogProtocolError({ requestTag, publicKey: request.publicKey, storeId: request.storeId, code, message })
    const fromCompactionError =
      (requestTag: string, request: Request) => (error: CompactionNotFound | CompactionInvalidRequest) =>
        error._tag === "CompactionNotFound"
          ? protocolError(requestTag, request, "NotFound", "Compaction stage not found")
          : protocolError(requestTag, request, "InvalidRequest", error.message)

    // Checks the identity, then runs the request against the storage primitives.
    const withCompaction = <A>(
      requestTag: string,
      request: Request,
      client: Rpc.ServerClient,
      f: (compaction: StorageCompaction) => Effect.Effect<A, CompactionNotFound | CompactionInvalidRequest>
    ): Effect.Effect<A, EventLogProtocolError> => {
      if (!Context.getOrUndefined(client.annotations, EventLogServer.AuthenticatedIdentities)?.has(request.publicKey)) {
        return Effect.fail(protocolError(requestTag, request, "Forbidden", "Identity is not authenticated"))
      }
      if (compaction === undefined) {
        return Effect.fail(protocolError(requestTag, request, "NotFound", "Compaction is not supported"))
      }
      return Effect.mapError(f(compaction), fromCompactionError(requestTag, request))
    }
    const withCompactionStream = <A>(
      requestTag: string,
      request: Request,
      client: Rpc.ServerClient,
      f: (compaction: StorageCompaction) => Stream.Stream<A, CompactionNotFound>
    ): Stream.Stream<A, EventLogProtocolError> =>
      Stream.unwrap(
        withCompaction(
          requestTag,
          request,
          client,
          (compaction) => Effect.succeed(Stream.mapError(f(compaction), fromCompactionError(requestTag, request)))
        )
      )

    const getStatus = Effect.fnUntraced(function*(compaction: StorageCompaction, publicKey: string, storeId: StoreId) {
      const status = yield* compaction.status(publicKey, storeId)
      return { status, wanted: isCompactionWanted(status, compaction.config.thresholdFloor) }
    })

    return EventLogCompactionRpcs.of({
      "EventLog.CompactionStatus": (request, { client }) =>
        withCompaction("CompactionStatus", request, client, (compaction) =>
          Effect.map(getStatus(compaction, request.publicKey, request.storeId), ({ status, wanted }) =>
            new CompactionStatus({
              wanted,
              head: status.head,
              base: status.base >= firstSequence ? status.base : undefined,
              rollbackEpoch: status.rollbackEpoch
            }))),
      "EventLog.CompactionBegin": (request, { client }) =>
        withCompaction("CompactionBegin", request, client, (compaction) =>
          Effect.gen(function*() {
            const { status, wanted } = yield* getStatus(compaction, request.publicKey, request.storeId)
            if (!wanted) {
              return { _tag: "NotWanted" } as const
            }
            const through = status.lagHead
            const result = yield* compaction.begin(request.publicKey, request.storeId, { through })
            if (result._tag === "Busy") {
              const now = yield* Clock.currentTimeMillis
              return { _tag: "Busy", retryAfter: Math.max(0, result.expiresAt - now) } as const
            }
            return {
              _tag: "Started",
              stageId: result.stageId,
              through,
              entryCount: result.entryCount,
              batchCount: result.batchCount
            } as const
          })),
      "EventLog.CompactionInput": (request, { client }) =>
        withCompactionStream("CompactionInput", request, client, (compaction) =>
          compaction.inputHeaders(request.publicKey, request.storeId, request.stageId).pipe(
            Stream.mapArrayEffect((headers) =>
              Effect.map(
                Effect.orDie(
                  CompactionInputRpc.encodeHeaders(headers as Arr.NonEmptyReadonlyArray<CompactionInputHeader>)
                ),
                toFrames
              )
            )
          )),
      "EventLog.CompactionFetch": (request, { client }) =>
        withCompactionStream("CompactionFetch", request, client, (compaction) =>
          compaction.fetch(request.publicKey, request.storeId, request.stageId, request.batches).pipe(
            Stream.mapArrayEffect((batches) =>
              Effect.map(Effect.orDie(ChangesRpc.encodeEncrypted(batches)), toFrames)
            )
          )),
      "EventLog.CompactionPart": (request, { client }) =>
        withCompaction("CompactionPart", request, client, (compaction) =>
          Effect.gen(function*() {
            const { publicKey, stageId, storeId } = request
            const data = ChunkedMessage.join(getPendingSegments(client, stageId), request.chunk)
            if (data === undefined) {
              return
            }
            const batches = yield* CompactionPartRpc.decodeSegment(data).pipe(
              Effect.catch(() =>
                Effect.andThen(
                  compaction.withdraw(publicKey, storeId, stageId),
                  Effect.fail(new CompactionInvalidRequest({ stageId, message: "Invalid segment" }))
                )
              )
            )
            yield* compaction.stagePart(publicKey, storeId, stageId, request.chunk.id, batches)
          })),
      "EventLog.CompactionAbort": (request, { client }) =>
        withCompaction("CompactionAbort", request, client, (compaction) => {
          releasePendingSegments(client, request.stageId)
          return compaction.abort(request.publicKey, request.storeId, request.stageId)
        }),
      "EventLog.CompactionCommit": (request, { client }) =>
        withCompaction("CompactionCommit", request, client, (compaction) => {
          const { publicKey, stageId, storeId } = request
          releasePendingSegments(client, stageId)
          if (request.result._tag === "NoOp") {
            return Effect.as(compaction.recordNoOp(publicKey, storeId, stageId), "Committed" as const)
          }
          const segmentCount = request.result.segmentCount
          return checkSnapshot(compaction, publicKey, storeId, stageId, segmentCount).pipe(
            Effect.matchEffect({
              onFailure: (error): Effect.Effect<
                "Committed" | "Superseded",
                CompactionNotFound | CompactionInvalidRequest
              > =>
                error._tag === "CompactionInvalidRequest"
                  ? Effect.andThen(compaction.withdraw(publicKey, storeId, stageId), Effect.fail(error))
                  // The stage has left `open`, so this answers a retried commit
                  // from its first one, or fails with `CompactionNotFound`.
                  : compaction.commit(publicKey, storeId, stageId, []),
              onSuccess: (snapshot) =>
                compaction.commit(publicKey, storeId, stageId, snapshot.virtualSequences).pipe(
                  Effect.tap((result) =>
                    logCommit(compaction, { publicKey, storeId, result, ...snapshot })
                  )
                )
            })
          )
        })
    })
  }))

// Whether a store wants compacting: the input past the lag must reach the
// threshold, and after `k` consecutive no-ops the lag head must have moved the
// threshold times `2^(k-1)` past the latest one.
const isCompactionWanted = (status: CompactionStoreStatus, thresholdFloor: number): boolean => {
  const threshold = Math.max(status.activeKeptCount, thresholdFloor)
  const pending = status.lagHead - status.base
  if (pending <= 0 || pending < threshold) return false
  if (status.noOp === undefined) return true
  return status.lagHead - status.noOp.at >= threshold * 2 ** (status.noOp.count - 1)
}

// Checks a snapshot's staged batches against the stage's input in one pass
// over both, and assigns each batch its virtual start sequence. Kept ids must
// be a non-empty subset of the input, strictly ascending by input sequence,
// in segments 0 to segmentCount - 1.
const checkSnapshot = Effect.fnUntraced(function*(
  compaction: StorageCompaction,
  publicKey: string,
  storeId: StoreId,
  stageId: string,
  segmentCount: number
) {
  const invalid = (message: string) => Effect.fail(new CompactionInvalidRequest({ stageId, message }))
  const pullInput = yield* Stream.toPull(compaction.inputHeaders(publicKey, storeId, stageId))
  let headers: ReadonlyArray<CompactionBatchHeader> = []
  let headerIndex = 0
  let entryIndex = 0
  let inputCount = 0
  let lastInputSequence = -1
  const nextInput = Effect.gen(function*() {
    while (true) {
      const header = headers[headerIndex]
      if (header === undefined) {
        const chunk = yield* Pull.catchDone(pullInput, () => Effect.succeed(undefined))
        if (chunk === undefined) return undefined
        headers = chunk
        headerIndex = 0
        continue
      }
      if (entryIndex === header.entryIds.length) {
        headerIndex++
        entryIndex = 0
        continue
      }
      const sequence = header.sequence + entryIndex
      const id = Uuid.stringify(header.entryIds[entryIndex++])
      inputCount++
      lastInputSequence = sequence
      return { id, sequence }
    }
  })

  // The input sequence of each batch's last kept entry, and its size.
  const ends: Array<number> = []
  const sizes: Array<number> = []
  let segment = -1
  yield* Stream.runForEach(compaction.stagedHeaders(publicKey, storeId, stageId), (header) =>
    Effect.gen(function*() {
      const headerSegment = Math.floor(header.position / positionsPerSegment)
      if (headerSegment !== segment) {
        if (headerSegment !== segment + 1 || headerSegment >= segmentCount) {
          return yield* invalid("Unexpected segment")
        }
        segment = headerSegment
      }
      let last = -1
      for (const entryId of header.entryIds) {
        const id = Uuid.stringify(entryId)
        let input = yield* nextInput
        while (input !== undefined && input.id !== id) input = yield* nextInput
        if (input === undefined) return yield* invalid("Kept entry is not in the input, or is out of order")
        last = input.sequence
      }
      ends.push(last)
      sizes.push(header.entryIds.length)
    }))
  if (ends.length === 0) return yield* invalid("Snapshot is empty")
  if (segment !== segmentCount - 1) return yield* invalid("Missing segment")
  while ((yield* nextInput) !== undefined) {
    // Count the rest of the input and find where it ends.
  }

  // Each batch ends at its last kept entry's input sequence, and the final one
  // at the end of the input, so no batch starts below its entries' input.
  const virtualSequences = ends.map((end, i) => (i === ends.length - 1 ? lastInputSequence : end) - sizes[i] + 1)
  return {
    virtualSequences,
    through: lastInputSequence,
    inputCount,
    keptCount: sizes.reduce((count, size) => count + size, 0)
  }
}, Effect.scoped)

const logCommit = Effect.fnUntraced(function*(compaction: StorageCompaction, options: {
  readonly publicKey: string
  readonly storeId: StoreId
  readonly result: "Committed" | "Superseded"
  readonly through: number
  readonly inputCount: number
  readonly keptCount: number
}) {
  const activationId = options.result === "Committed"
    ? (yield* compaction.history(options.publicKey, options.storeId)).find((activation) => activation.active)
      ?.activationId
    : undefined
  yield* Effect.logInfo(
    options.result === "Committed" ? "Committed compaction snapshot" : "Compaction snapshot superseded"
  ).pipe(
    Effect.annotateLogs({
      service: "EventLogServerEncrypted",
      publicKey: options.publicKey,
      storeId: options.storeId,
      inputCount: options.inputCount,
      keptCount: options.keptCount,
      through: options.through,
      activationId
    })
  )
})

// Pieces of compaction segments not yet joined, by stage, for one connection.
class PendingSegments extends Context.Service<
  PendingSegments,
  Map<string, ReturnType<typeof ChunkedMessage.initialJoinState>>
>()("effect/eventlog/EventLogServerEncrypted/PendingSegments") {}

const getPendingSegments = (client: Rpc.ServerClient, stageId: string) => {
  let stages = Context.getOrUndefined(client.annotations, PendingSegments)
  if (stages === undefined) {
    stages = new Map()
    client.annotate(PendingSegments, stages)
  }
  let pending = stages.get(stageId)
  if (pending === undefined) {
    pending = ChunkedMessage.initialJoinState()
    stages.set(stageId, pending)
  }
  return pending
}

const releasePendingSegments = (client: Rpc.ServerClient, stageId: string) => {
  Context.getOrUndefined(client.annotations, PendingSegments)?.delete(stageId)
}

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
 * `Storage`. When `Storage` provides `compaction`, it also installs
 * `EventLogCompactionRpcs`.
 *
 * @see {@link layerRpcHandlers} for the encrypted handler layer without installing an RPC server protocol
 * @see {@link Storage} for the storage service required by this layer
 * @see {@link layerStorageMemory} for the process-local in-memory storage layer
 *
 * @stability unstable
 * @category layers
 * @since 4.0.0
 */
export const layer: Layer.Layer<never, never, RpcServer.Protocol | Storage> = Layer.unwrap(
  Effect.gen(function*() {
    const storage = yield* Storage
    return storage.compaction === undefined
      ? RpcServer.layer(EventLogRemoteRpcs)
      : RpcServer.layer(EventLogRemoteRpcs.merge(EventLogCompactionRpcs))
  })
).pipe(Layer.provide(layerRpcHandlers))

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
  readonly config: CompactionConfig
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
 * Tuning for encrypted remote compaction.
 *
 * **Details**
 *
 * `grace` is how long a superseded or withdrawn generation is kept before it
 * is pruned (default 30 days). `lag` is how old data must be, by storage time,
 * before it can be compacted (default 24 hours). `stageTtl` is how long a stage
 * claim lasts after its latest Part (default 10 minutes). `thresholdFloor` is
 * the smallest number of new entries that makes compaction wanted (default
 * 1,000). `sweepInterval` is how often pruning runs (default 1 hour).
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export interface CompactionOptions {
  readonly grace?: Duration.Input | undefined
  readonly lag?: Duration.Input | undefined
  readonly stageTtl?: Duration.Input | undefined
  readonly thresholdFloor?: number | undefined
  readonly sweepInterval?: Duration.Input | undefined
}

/**
 * Resolved compaction tuning, shared by a storage and the server using it.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export interface CompactionConfig {
  readonly grace: Duration.Duration
  readonly lag: Duration.Duration
  readonly stageTtl: Duration.Duration
  readonly thresholdFloor: number
  readonly sweepInterval: Duration.Duration
}

/**
 * Resolves compaction options against their defaults.
 *
 * **Details**
 *
 * Dies with an `IllegalArgumentError` unless `grace` is longer than both `lag`
 * and `stageTtl`, `stageTtl` and `sweepInterval` are positive, and
 * `thresholdFloor` is a non-negative integer.
 *
 * @stability unstable
 * @category constructors
 * @since 4.0.0
 */
export const makeCompactionConfig = (options?: CompactionOptions | undefined): Effect.Effect<CompactionConfig> =>
  Effect.suspend(() => {
    const config: CompactionConfig = {
      grace: Duration.fromInputUnsafe(options?.grace ?? "30 days"),
      lag: Duration.fromInputUnsafe(options?.lag ?? "24 hours"),
      stageTtl: Duration.fromInputUnsafe(options?.stageTtl ?? "10 minutes"),
      thresholdFloor: options?.thresholdFloor ?? 1000,
      sweepInterval: Duration.fromInputUnsafe(options?.sweepInterval ?? "1 hour")
    }
    if (
      !Duration.isGreaterThan(config.grace, config.lag) ||
      !Duration.isGreaterThan(config.grace, config.stageTtl)
    ) {
      return Effect.die(new Cause.IllegalArgumentError("Compaction grace must be longer than lag and stageTtl"))
    }
    if (!Duration.isGreaterThan(config.stageTtl, Duration.zero)) {
      return Effect.die(new Cause.IllegalArgumentError("Compaction stageTtl must be positive"))
    }
    if (!Duration.isGreaterThan(config.sweepInterval, Duration.zero)) {
      return Effect.die(new Cause.IllegalArgumentError("Compaction sweepInterval must be positive"))
    }
    if (!Number.isSafeInteger(config.thresholdFloor) || config.thresholdFloor < 0) {
      return Effect.die(new Cause.IllegalArgumentError("Compaction thresholdFloor must be a non-negative integer"))
    }
    return Effect.succeed(config)
  })

/**
 * Creates an in-memory encrypted server `Storage` with default compaction
 * tuning.
 *
 * **Details**
 *
 * Data, session authentication bindings, and streams are process-local and are
 * released with the surrounding scope.
 *
 * @see {@link makeStorageMemoryWith} to configure compaction
 *
 * @stability unstable
 * @category constructors
 * @since 4.0.0
 */
export const makeStorageMemory: Effect.Effect<Storage["Service"], never, Scope.Scope> = Effect.suspend(() =>
  makeStorageMemoryWith({})
)

/**
 * Creates an in-memory encrypted server `Storage`.
 *
 * **Details**
 *
 * Data, session authentication bindings, and streams are process-local and are
 * released with the surrounding scope. The storage always provides
 * `compaction`, and its sweep runs on `Clock` in the surrounding scope while
 * any store has something left to prune or a stage left to clean up.
 *
 * Dies when the compaction options are invalid (see {@link makeCompactionConfig}).
 *
 * @stability unstable
 * @category constructors
 * @since 4.0.0
 */
export const makeStorageMemoryWith = Effect.fnUntraced(function*(options: {
  readonly compaction?: CompactionOptions | undefined
}): Effect.fn.Return<Storage["Service"], never, Scope.Scope> {
  const config = yield* makeCompactionConfig(options.compaction)
  const graceMillis = Duration.toMillis(config.grace)
  const lagMillis = Duration.toMillis(config.lag)
  const stageTtlMillis = Duration.toMillis(config.stageTtl)
  const journals = new Map<string, MemoryJournal>()
  // Every stage that has not been cleaned up yet, across stores.
  const stages = new Map<string, MemoryStage>()
  const sessionAuthBindings = new Map<string, Uint8Array<ArrayBuffer>>()
  const remoteId = makeRemoteIdUnsafe()
  const ensureJournal = (scopeKey: string) => {
    let journal = journals.get(scopeKey)
    if (journal) return journal
    const originals: MemoryActivation = {
      id: Uuid.v4String(),
      set: undefined,
      base: -1,
      keptCount: undefined,
      previous: undefined,
      supersededAt: undefined,
      pruneStartedAt: undefined
    }
    journal = {
      knownIds: new Map(),
      batches: [],
      nextSequence: 0,
      buckets: new Map(),
      activations: [originals],
      active: originals,
      rollbackEpoch: 0,
      noOp: undefined,
      openStage: undefined,
      nextSweepAt: undefined,
      prunedThrough: -1
    }
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

  // Open while any store has something for the sweep to do, so an idle
  // storage never sleeps on the clock.
  const sweepPending = Latch.makeUnsafe(false)
  const schedulePrune = (journal: MemoryJournal, at: number) => {
    journal.nextSweepAt = journal.nextSweepAt === undefined ? at : Math.min(journal.nextSweepAt, at)
    sweepPending.openUnsafe()
  }
  const closeStage = (journal: MemoryJournal, stage: MemoryStage, state: MemoryStage["state"], now: number) => {
    stage.state = state
    stage.closedAt = now
    stage.segments.clear()
    stage.ids.clear()
    if (journal.openStage === stage) journal.openStage = undefined
  }
  const sweep = (now: number) => {
    for (const [stageId, stage] of stages) {
      const journal = journals.get(stage.scopeKey)!
      if (stage.state === "open" && stage.expiresAt <= now) closeStage(journal, stage, "expired", stage.expiresAt)
      // Closed stages linger for one stage TTL so a retried commit is answered.
      if (stage.closedAt !== undefined && stage.closedAt + stageTtlMillis <= now) stages.delete(stageId)
    }
    for (const journal of journals.values()) {
      if (journal.nextSweepAt !== undefined && journal.nextSweepAt <= now) prune(journal, now)
    }
    if (stages.size === 0 && Array.from(journals.values()).every((journal) => journal.nextSweepAt === undefined)) {
      sweepPending.closeUnsafe()
    }
  }
  // Keeps what the active generation and every generation still within grace
  // need, which is their batch sets and the originals above their bases.
  const prune = (journal: MemoryJournal, now: number) => {
    const kept = journal.activations.filter((activation) =>
      activation === journal.active ||
      (activation.pruneStartedAt === undefined && activation.supersededAt! + graceMillis > now)
    )
    const keptSets = new Set(kept.map((activation) => activation.set))
    for (const activation of journal.activations) {
      if (kept.includes(activation) || activation.pruneStartedAt !== undefined) continue
      activation.pruneStartedAt = now
      if (activation.set !== undefined && !keptSets.has(activation.set)) activation.set.batches = []
    }
    const keptBase = Math.min(...kept.map((activation) => activation.base))
    const first = journal.batches.findIndex((batch) => batch.sequence + batch.entryIds.length - 1 > keptBase)
    journal.batches.splice(0, first === -1 ? journal.batches.length : first)
    journal.prunedThrough = Math.max(journal.prunedThrough, keptBase)
    journal.nextSweepAt = undefined
    for (const activation of journal.activations) {
      if (activation !== journal.active && activation.pruneStartedAt === undefined) {
        schedulePrune(journal, activation.supersededAt! + graceMillis)
      }
    }
  }
  yield* Effect.forkScoped(
    Effect.forever(
      sweepPending.await.pipe(
        Effect.andThen(Effect.sleep(config.sweepInterval)),
        Effect.andThen(Clock.currentTimeMillis),
        Effect.flatMap((now) => Effect.sync(() => sweep(now)))
      )
    )
  )

  // The highest last sequence stored in an hour that ended before now - lag.
  const lagHead = (journal: MemoryJournal, now: number) => {
    let head = -1
    for (const [hour, lastSequence] of journal.buckets) {
      if ((hour + 1) * hourMillis <= now - lagMillis) head = Math.max(head, lastSequence)
    }
    return head
  }
  const recordBucket = (journal: MemoryJournal, now: number, lastSequence: number) => {
    const hour = Math.floor(now / hourMillis)
    const existing = journal.buckets.get(hour)
    if (existing !== undefined) {
      journal.buckets.set(hour, Math.max(existing, lastSequence))
      return
    }
    journal.buckets.set(hour, lastSequence)
    // Only the newest bucket past the lag matters for the lag head.
    const pastLag = Array.from(journal.buckets.keys()).filter((bucket) => (bucket + 1) * hourMillis <= now - lagMillis)
    const newest = Math.max(...pastLag)
    for (const bucket of pastLag) {
      if (bucket < newest) journal.buckets.delete(bucket)
    }
  }
  // The input of a stage: its pinned batch set, then originals in (base, through].
  const inputBatches = (journal: MemoryJournal, stage: MemoryStage): ReadonlyArray<EncryptedRemoteBatch> => [
    ...(stage.pinned.set?.batches ?? []),
    ...journal.batches.filter((batch) =>
      batch.sequence > stage.pinned.base && batch.sequence + batch.entryIds.length - 1 <= stage.through
    )
  ]
  const findStage = (publicKey: string, storeId: StoreId, stageId: string) => {
    const stage = stages.get(stageId)
    if (stage === undefined || stage.scopeKey !== makeEncryptedScopeKey({ publicKey, storeId })) return undefined
    return { stage, journal: journals.get(stage.scopeKey)! }
  }
  // A stage that Part, NoOp and Commit can act on.
  const findOpenStage = (publicKey: string, storeId: StoreId, stageId: string, now: number) => {
    const found = findStage(publicKey, storeId, stageId)
    if (found === undefined || found.stage.state !== "open") return undefined
    if (found.stage.expiresAt <= now) {
      closeStage(found.journal, found.stage, "expired", found.stage.expiresAt)
      return undefined
    }
    return found
  }
  // Call within the same execution-time block that captures the input rows.
  const findInputStage = (
    publicKey: string,
    storeId: StoreId,
    stageId: string,
    now: number
  ) => {
    const found = findOpenStage(publicKey, storeId, stageId, now)
    return found?.stage.pinned.pruneStartedAt === undefined ? found : undefined
  }

  const compaction: StorageCompaction = {
    config,
    status: (publicKey, storeId) =>
      Effect.map(Clock.currentTimeMillis, (now) => {
        const journal = ensureJournal(makeEncryptedScopeKey({ publicKey, storeId }))
        const openStage = journal.openStage
        return {
          head: journal.nextSequence - 1,
          base: journal.active.base,
          activeKeptCount: journal.active.keptCount ?? 0,
          lagHead: lagHead(journal, now),
          rollbackEpoch: journal.rollbackEpoch,
          noOp: journal.noOp,
          openStage: openStage !== undefined && openStage.expiresAt > now
            ? { expiresAt: openStage.expiresAt }
            : undefined,
          nextSweepAt: journal.nextSweepAt
        }
      }),
    begin: (publicKey, storeId, { through }) =>
      Effect.map(Clock.currentTimeMillis, (now): CompactionBeginResult => {
        const scopeKey = makeEncryptedScopeKey({ publicKey, storeId })
        const journal = ensureJournal(scopeKey)
        const open = journal.openStage
        if (open !== undefined) {
          if (open.expiresAt > now) return { _tag: "Busy", expiresAt: open.expiresAt }
          closeStage(journal, open, "expired", open.expiresAt)
        }
        const stage: MemoryStage = {
          id: Uuid.v4String(),
          scopeKey,
          state: "open",
          pinned: journal.active,
          through,
          expiresAt: now + stageTtlMillis,
          inputBytes: 0,
          stagedBytes: 0,
          segments: new Map(),
          ids: new Set(),
          result: undefined,
          closedAt: undefined
        }
        const input = inputBatches(journal, stage)
        stage.inputBytes = input.reduce((bytes, batch) => bytes + batch.encryptedBatch.byteLength, 0)
        stages.set(stage.id, stage)
        journal.openStage = stage
        sweepPending.openUnsafe()
        return {
          _tag: "Started",
          stageId: stage.id,
          entryCount: input.reduce((count, batch) => count + batch.entryIds.length, 0),
          batchCount: input.length
        }
      }),
    inputHeaders: (publicKey, storeId, stageId) =>
      Clock.currentTimeMillis.pipe(
        Effect.flatMap((now) => {
          const found = findInputStage(publicKey, storeId, stageId, now)
          if (found === undefined) return Effect.fail(new CompactionNotFound({ stageId }))
          const { journal, stage } = found
          return Effect.succeed(Stream.fromArray(
            inputBatches(journal, stage).map((batch): CompactionBatchHeader => ({
              sequence: batch.sequence,
              entryIds: batch.entryIds
            }))
          ))
        }),
        Stream.unwrap
      ),
    fetch: (publicKey, storeId, stageId, sequences) =>
      Clock.currentTimeMillis.pipe(
        Effect.flatMap((now) => {
          const found = findInputStage(publicKey, storeId, stageId, now)
          if (found === undefined) return Effect.fail(new CompactionNotFound({ stageId }))
          const { journal, stage } = found
          const fetched: Array<EncryptedRemoteBatch> = []
          for (const sequence of sequences) {
            const batch = sequence <= stage.pinned.base
              ? findBatch(stage.pinned.set?.batches ?? [], sequence)
              : sequence <= stage.through
              ? findBatch(journal.batches, sequence)
              : undefined
            if (batch !== undefined) fetched.push(batch)
          }
          return Effect.succeed(Stream.fromArray(fetched))
        }),
        Stream.unwrap
      ),
    stagePart: (publicKey, storeId, stageId, segment, batches) =>
      Effect.flatMap(Clock.currentTimeMillis, (now): ReturnType<StorageCompaction["stagePart"]> => {
        const found = findOpenStage(publicKey, storeId, stageId, now)
        if (found === undefined) return Effect.fail(new CompactionNotFound({ stageId }))
        const { journal, stage } = found
        if (stage.segments.has(segment)) return Effect.succeed("AlreadyStored" as const)
        const reject = (message: string) => {
          closeStage(journal, stage, "withdrawn", now)
          return Effect.fail(new CompactionInvalidRequest({ stageId, message }))
        }
        if (!Number.isSafeInteger(segment) || segment < 0 || segment >= maxSegments) {
          return reject("Invalid segment index")
        }
        if (batches.length > positionsPerSegment) return reject("Too many batches in a segment")
        const bytes = batches.reduce((bytes, batch) => bytes + batch.encryptedBatch.byteLength, 0)
        if (stage.stagedBytes + bytes > stage.inputBytes) return reject("Staged bytes exceed the input size")
        const ids = new Set<string>()
        for (const batch of batches) {
          for (const entryId of batch.entryIds) {
            const id = Uuid.stringify(entryId)
            if (stage.ids.has(id) || ids.has(id)) return reject("Repeated entry id")
            ids.add(id)
          }
        }
        for (const id of ids) stage.ids.add(id)
        stage.segments.set(segment, batches)
        stage.stagedBytes += bytes
        stage.expiresAt = now + stageTtlMillis
        return Effect.succeed("Stored" as const)
      }),
    stagedHeaders: (publicKey, storeId, stageId) =>
      Effect.flatMap(Clock.currentTimeMillis, (now) => {
        const found = findOpenStage(publicKey, storeId, stageId, now)
        if (found === undefined) {
          return Effect.fail(new CompactionNotFound({ stageId }))
        }
        return Effect.succeed(Stream.fromArray(
          stagedBatches(found.stage).map(({ batch, position }) => ({
            position,
            entryIds: batch.entryIds
          }))
        ))
      }).pipe(Stream.unwrap),
    commit: (publicKey, storeId, stageId, virtualSequences) =>
      Effect.flatMap(Clock.currentTimeMillis, (now) => {
        // A retried commit is answered from the stage's first one.
        const result = findStage(publicKey, storeId, stageId)?.stage.result
        if (result === "Committed" || result === "Superseded") return Effect.succeed(result)
        const found = findOpenStage(publicKey, storeId, stageId, now)
        if (found === undefined) return Effect.fail(new CompactionNotFound({ stageId }))
        const { journal, stage } = found
        if (stage.pinned !== journal.active) {
          stage.result = "Superseded"
          closeStage(journal, stage, "committed", now)
          return Effect.succeed("Superseded" as const)
        }
        const staged = stagedBatches(stage)
        if (staged.length !== virtualSequences.length) {
          return Effect.die(new Cause.IllegalArgumentError("Expected one virtual sequence per staged batch"))
        }
        const activation: MemoryActivation = {
          id: Uuid.v4String(),
          set: {
            batches: staged.map(({ batch }, i): EncryptedRemoteBatch => ({ ...batch, sequence: virtualSequences[i] }))
          },
          base: stage.through,
          keptCount: staged.reduce((count, { batch }) => count + batch.entryIds.length, 0),
          previous: journal.active,
          supersededAt: undefined,
          pruneStartedAt: undefined
        }
        journal.active.supersededAt = now
        journal.activations.push(activation)
        journal.active = activation
        journal.noOp = undefined
        schedulePrune(journal, now + graceMillis)
        stage.result = "Committed"
        closeStage(journal, stage, "committed", now)
        return Effect.succeed("Committed" as const)
      }),
    recordNoOp: (publicKey, storeId, stageId) =>
      Effect.flatMap(Clock.currentTimeMillis, (now) => {
        if (findStage(publicKey, storeId, stageId)?.stage.result === "NoOp") return Effect.void
        const found = findOpenStage(publicKey, storeId, stageId, now)
        if (found === undefined) return Effect.fail(new CompactionNotFound({ stageId }))
        const { journal, stage } = found
        // A rollback since begin cleared the no-op state, so a stale run leaves it.
        if (stage.pinned === journal.active) {
          journal.noOp = { at: stage.through, count: (journal.noOp?.count ?? 0) + 1 }
        }
        stage.result = "NoOp"
        closeStage(journal, stage, "committed", now)
        return Effect.void
      }),
    abort: (publicKey, storeId, stageId) => withdraw(publicKey, storeId, stageId),
    withdraw: (publicKey, storeId, stageId) => withdraw(publicKey, storeId, stageId),
    rollback: (publicKey, storeId, expectedActivationId) =>
      Effect.flatMap(Clock.currentTimeMillis, (now) => {
        const journal = ensureJournal(makeEncryptedScopeKey({ publicKey, storeId }))
        const withdrawn = journal.active
        if (withdrawn.id !== expectedActivationId) {
          return Effect.fail(new CompactionRollbackError({ reason: "NotActive" }))
        }
        const target = withdrawn.previous
        if (target === undefined) return Effect.fail(new CompactionRollbackError({ reason: "NoPrevious" }))
        if (target.pruneStartedAt !== undefined) {
          return Effect.fail(new CompactionRollbackError({ reason: "PruneStarted" }))
        }
        const activation: MemoryActivation = {
          ...target,
          id: Uuid.v4String(),
          supersededAt: undefined,
          pruneStartedAt: undefined
        }
        withdrawn.supersededAt = now
        journal.activations.push(activation)
        journal.active = activation
        journal.rollbackEpoch++
        journal.noOp = undefined
        schedulePrune(journal, now + graceMillis)
        return Effect.as(
          Effect.logInfo("Rolled back compaction snapshot").pipe(
            Effect.annotateLogs({
              service: "EventLogServerEncrypted",
              publicKey,
              storeId,
              keptCount: activation.keptCount,
              base: activation.base,
              activationId: activation.id,
              withdrawnActivationId: withdrawn.id
            })
          ),
          activation.id
        )
      }),
    history: (publicKey, storeId) =>
      Effect.sync(() => {
        const journal = ensureJournal(makeEncryptedScopeKey({ publicKey, storeId }))
        return journal.activations.map((activation): CompactionActivation => ({
          activationId: activation.id,
          base: activation.base,
          keptCount: activation.keptCount,
          active: activation === journal.active,
          supersededAt: activation === journal.active ? undefined : activation.supersededAt,
          restorable: activation.pruneStartedAt === undefined
        }))
      })
  }
  const withdraw = (publicKey: string, storeId: StoreId, stageId: string) =>
    Effect.map(Clock.currentTimeMillis, (now) => {
      const found = findStage(publicKey, storeId, stageId)
      if (found !== undefined && found.stage.state === "open") closeStage(found.journal, found.stage, "withdrawn", now)
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
      const now = yield* Clock.currentTimeMillis
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
      if (stored.length > 0) recordBucket(journal, now, journal.nextSequence - 1)
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
      const journal = ensureJournal(scopeKey)
      const { base, set } = journal.active
      const live = Stream.fromSubscription(subscription)
      // Below the base an active snapshot replaces the originals.
      if (set !== undefined && startSequence <= base) {
        if (set.batches.length === 0) {
          return Stream.die(new Error(`The active compaction snapshot of store ${storeId} has no batches`))
        }
        const tail = journal.batches.filter((batch) => batch.sequence > base)
        return Stream.fromArray([
          ...set.batches.filter((batch) => batch.sequence + batch.entryIds.length > startSequence),
          ...tail
        ]).pipe(Stream.concat(live))
      }
      const batches = journal.batches
      const first = batches.findIndex((batch) => batch.sequence + batch.entryIds.length > startSequence)
      return Stream.fromArray(first === -1 ? [] : batches.slice(first)).pipe(
        Stream.concat(live)
      )
    }, Stream.unwrap),
    compaction
  })
})

/**
 * Provides encrypted server `Storage` using the in-memory implementation with
 * default compaction tuning.
 *
 * @see {@link layerStorageMemoryWith} to configure compaction
 *
 * @stability unstable
 * @category layers
 * @since 4.0.0
 */
export const layerStorageMemory: Layer.Layer<Storage> = Layer.effect(Storage)(makeStorageMemory)

/**
 * Provides encrypted server `Storage` using the in-memory implementation.
 *
 * @stability unstable
 * @category layers
 * @since 4.0.0
 */
export const layerStorageMemoryWith = (options: {
  readonly compaction?: CompactionOptions | undefined
}): Layer.Layer<Storage> => Layer.effect(Storage)(makeStorageMemoryWith(options))

const hourMillis = 60 * 60 * 1000
// A staged batch's position packs its segment index and its index in the segment.
const positionsPerSegment = 2 ** 20
const maxSegments = Math.floor(Number.MAX_SAFE_INTEGER / positionsPerSegment)

interface MemoryActivation {
  readonly id: string
  // undefined while the originals are active.
  readonly set: { batches: ReadonlyArray<EncryptedRemoteBatch> } | undefined
  readonly base: number
  readonly keptCount: number | undefined
  readonly previous: MemoryActivation | undefined
  supersededAt: number | undefined
  pruneStartedAt: number | undefined
}

interface MemoryStage {
  readonly id: string
  readonly scopeKey: string
  state: "open" | "committed" | "withdrawn" | "expired"
  readonly pinned: MemoryActivation
  readonly through: number
  expiresAt: number
  inputBytes: number
  stagedBytes: number
  readonly segments: Map<number, ReadonlyArray<EncryptedBatch>>
  readonly ids: Set<string>
  result: "Committed" | "Superseded" | "NoOp" | undefined
  closedAt: number | undefined
}

interface MemoryJournal {
  // Entry id to the sequence it was first stored at. Never pruned.
  readonly knownIds: Map<string, number>
  // Originals, in sequence order.
  readonly batches: Array<EncryptedRemoteBatch>
  nextSequence: number
  // Storage-time hour to the highest last sequence stored in it.
  readonly buckets: Map<number, number>
  readonly activations: Array<MemoryActivation>
  active: MemoryActivation
  rollbackEpoch: number
  noOp: { readonly at: number; readonly count: number } | undefined
  openStage: MemoryStage | undefined
  nextSweepAt: number | undefined
  prunedThrough: number
}

const stagedBatches = (stage: MemoryStage) =>
  Array.from(stage.segments).sort(([a], [b]) => a - b).flatMap(([segment, batches]) =>
    batches.map((batch, i) => ({ batch, position: segment * positionsPerSegment + i }))
  )

const findBatch = (batches: ReadonlyArray<EncryptedRemoteBatch>, sequence: number) => {
  let low = 0
  let high = batches.length
  while (low < high) {
    const mid = (low + high) >>> 1
    if (batches[mid].sequence < sequence) low = mid + 1
    else high = mid
  }
  return batches[low]?.sequence === sequence ? batches[low] : undefined
}

const makeEncryptedScopeKey = ({ publicKey, storeId }: {
  readonly publicKey: string
  readonly storeId: StoreId
}): string => {
  return `${publicKey}/${storeId}`
}
