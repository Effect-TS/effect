/**
 * Stores event-log entries and replication state.
 *
 * `EventJournal` records committed entries, exposes them for replay, publishes
 * local changes, and tracks the remote metadata needed to exchange entries with
 * other journals. Higher-level event-log schemas and handlers use this service
 * to rebuild projections, sync offline clients, import remote changes, and
 * coordinate writes per store. This module also defines journal errors, entry
 * and remote identifiers, schemas, and in-memory or IndexedDB-backed journal
 * layers.
 *
 * @stability unstable
 * @since 4.0.0
 */
import * as Arr from "../Array.ts"
import type { Brand } from "../Brand.ts"
import * as Context from "../Context.ts"
import * as Data from "../Data.ts"
import * as DateTime from "../DateTime.ts"
import * as Effect from "../Effect.ts"
import * as SchemaBinary from "../encoding/SchemaBinary.ts"
import { constVoid } from "../Function.ts"
import * as Uuid from "../internal/uuid.ts"
import * as Layer from "../Layer.ts"
import type { Option } from "../Option.ts"
import * as Order from "../Order.ts"
import * as PubSub from "../PubSub.ts"
import * as Schema from "../Schema.ts"
import type * as SchemaAST from "../SchemaAST.ts"
import type { Scope } from "../Scope.ts"
import * as Semaphore from "../Semaphore.ts"
import type { StoreId } from "./EventLogMessage.ts"
import { ConflictIndex } from "./internal/conflicts.ts"

/**
 * Context service for storing and replaying event journal entries.
 *
 * **Details**
 *
 * The service writes local entries, imports entries from remote journals, exposes
 * a stream of local changes, and provides per-store locking.
 *
 * @stability unstable
 * @category services
 * @since 4.0.0
 */
export class EventJournal extends Context.Service<EventJournal, {
  /**
   * Read all the entries in the journal.
   */
  readonly entries: Effect.Effect<ReadonlyArray<Entry>, EventJournalError>

  /**
   * Write an event to the journal, performing an effect before committing the
   * event.
   */
  readonly write: <A, E, R>(options: {
    readonly event: string
    readonly primaryKey: string
    readonly payload: Uint8Array
    readonly effect: (entry: Entry) => Effect.Effect<A, E, R>
  }) => Effect.Effect<A, EventJournalError | E, R>

  /**
   * Write several events to the journal, performing an effect before
   * committing them.
   *
   * **Details**
   *
   * `effect` runs once with every entry, in input order and with ascending
   * ids. The entries are committed together and then published to `changes`
   * only after it succeeds. If it fails, nothing is committed or published.
   */
  readonly writeMany: <A, E, R>(options: {
    readonly entries: Arr.NonEmptyReadonlyArray<{
      readonly event: string
      readonly primaryKey: string
      readonly payload: Uint8Array
    }>
    readonly effect: (entries: Arr.NonEmptyReadonlyArray<Entry>) => Effect.Effect<A, E, R>
  }) => Effect.Effect<A, EventJournalError | E, R>

  /**
   * Write events from a remote source to the journal.
   *
   * **Details**
   *
   * `effect` runs once with every new entry in compaction order, each paired
   * with the stored entries for the same event and primary key that are
   * strictly newer than it. All conflicts are read before `effect` runs and
   * the batch is committed after it succeeds, with no journal I/O while it
   * runs. It is not called when the batch has no new entries. If `effect`
   * fails, no entry from the batch is committed.
   */
  readonly writeFromRemote: (
    options: {
      readonly remoteId: RemoteId
      readonly entries: ReadonlyArray<RemoteEntry>
      readonly compact?:
        | ((uncommitted: ReadonlyArray<RemoteEntry>) => Effect.Effect<ReadonlyArray<Entry>, EventJournalError>)
        | undefined
      readonly effect: (
        entries: ReadonlyArray<{
          readonly entry: Entry
          readonly conflicts: ReadonlyArray<Entry>
        }>
      ) => Effect.Effect<void, EventJournalError>
    }
  ) => Effect.Effect<{
    readonly duplicateEntries: ReadonlyArray<Entry>
  }, EventJournalError>

  /**
   * Run an effect with the uncommitted entries for a remote source.
   *
   * The effect is not run when there are no uncommitted entries, in which case
   * `Option.none()` is returned. Otherwise, its result is wrapped in
   * `Option.some()`.
   */
  readonly withRemoteUncommited: <A, E, R>(
    remoteId: RemoteId,
    f: (entries: Arr.NonEmptyReadonlyArray<Entry>) => Effect.Effect<A, E, R>
  ) => Effect.Effect<Option<A>, EventJournalError | E, R>

  /**
   * Retrieve the first unused sequence number for a remote source.
   */
  readonly nextRemoteSequence: (remoteId: RemoteId) => Effect.Effect<number, EventJournalError>

  /**
   * The entries added to the local journal.
   */
  readonly changes: Effect.Effect<PubSub.Subscription<Entry>, never, Scope>

  /**
   * Remove all data
   */
  readonly destroy: Effect.Effect<void, EventJournalError>

  /**
   * Run an effect with a lock on the journal.
   */
  readonly withLock: (storeId: StoreId) => <A, E, R>(effect: Effect.Effect<A, E, R>) => Effect.Effect<A, E, R>
}>()("effect/eventlog/EventJournal") {}

const TypeId = "effect/eventlog/EventJournal/EventJournalError" as const

/**
 * Error raised by event journal operations.
 *
 * **Details**
 *
 * The error records the journal method that failed and the underlying cause.
 *
 * @stability unstable
 * @category errors
 * @since 4.0.0
 */
export class EventJournalError extends Data.TaggedError("EventJournalError")<{
  readonly method: string
  readonly cause: unknown
}> {
  /**
   * Marks this value as an event journal error for runtime guards.
   *
   * @stability unstable
   * @since 4.0.0
   */
  readonly [TypeId] = TypeId
}

/**
 * Brand identifier used for `RemoteId` values.
 *
 * @stability unstable
 * @category type IDs
 * @since 4.0.0
 */
export type RemoteIdTypeId = "effect/eventlog/EventJournal/RemoteId"

/**
 * Runtime brand identifier used for `RemoteId` values.
 *
 * @stability unstable
 * @category type IDs
 * @since 4.0.0
 */
export const RemoteIdTypeId: RemoteIdTypeId = "effect/eventlog/EventJournal/RemoteId"

/**
 * Branded byte identifier for a remote event journal source.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export type RemoteId = Uint8Array & Brand<RemoteIdTypeId>

/**
 * Schema for branded remote event journal identifiers.
 *
 * @stability unstable
 * @category schemas
 * @since 4.0.0
 */
export const RemoteId = Schema.Uint8Array.pipe(Schema.brand(RemoteIdTypeId))

/**
 * Generates a new random `RemoteId`.
 *
 * **When to use**
 *
 * Use when generating a fresh event-log remote id internally and the UUID bytes
 * are trusted to satisfy the brand.
 *
 * **Gotchas**
 *
 * This is unsafe because the generated UUID bytes are cast to the brand without
 * schema validation.
 *
 * @stability unstable
 * @category unsafe
 * @since 4.0.0
 */
export const makeRemoteIdUnsafe = (): RemoteId => Uuid.v4Bytes() as RemoteId

/**
 * Runtime brand identifier used for `EntryId` values.
 *
 * @stability unstable
 * @category type IDs
 * @since 4.0.0
 */
export const EntryIdTypeId: EntryIdTypeId = "effect/eventlog/EventJournal/EntryId"

/**
 * Brand identifier used for `EntryId` values.
 *
 * @stability unstable
 * @category type IDs
 * @since 4.0.0
 */
export type EntryIdTypeId = "effect/eventlog/EventJournal/EntryId"

/**
 * Branded byte identifier for an event journal entry.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export type EntryId = Uint8Array<ArrayBuffer> & Brand<EntryIdTypeId>

/**
 * Schema for branded event journal entry identifiers.
 *
 * @stability unstable
 * @category schemas
 * @since 4.0.0
 */
export const EntryId = (Schema.Uint8Array as Schema.instanceOf<Uint8Array<ArrayBuffer>>).pipe(
  Schema.brand(EntryIdTypeId)
)

/**
 * Provides an Ordering instance for entry identifiers based on their raw UUID bytes.
 *
 * @stability unstable
 * @category ordering
 * @since 4.0.0
 */
export const EntryIdOrder = Order.make<EntryId>((a, b) => {
  for (let i = 0; i < 16; i++) {
    if (a[i] !== b[i]) {
      return (a[i] - b[i]) < 0 ? -1 : 1
    }
  }
  return 0
})

let lastEntryIdMillis = 0
let entryIdCounter = 0

/**
 * Generates a UUID v7 `EntryId`, optionally using the supplied millisecond
 * timestamp.
 *
 * **When to use**
 *
 * Use when generating an event-log entry id internally and the UUID v7 bytes
 * are trusted to satisfy the brand.
 *
 * **Details**
 *
 * Ids taken from the clock are strictly ascending within the current process.
 * Ids created in the same millisecond carry an incrementing 12-bit counter. If
 * the clock stalls or moves backwards, ids keep the last millisecond, and
 * after 4096 ids in one millisecond they move to the next one.
 *
 * **Gotchas**
 *
 * This is unsafe because the generated UUID bytes are cast to the brand without
 * schema validation.
 *
 * Ordering is only guaranteed within one process. Ids from different tabs or
 * devices in the same millisecond sort by their random bytes. Ids created with
 * an explicit `msecs` are not part of the sequence.
 *
 * @stability unstable
 * @category unsafe
 * @since 4.0.0
 */
export const makeEntryIdUnsafe = (options: { msecs?: number } = {}): EntryId => {
  if (options.msecs !== undefined) {
    return Uuid.v7Bytes(options.msecs) as EntryId
  }
  const now = DateTime.nowUnsafe().epochMilliseconds
  if (now > lastEntryIdMillis) {
    lastEntryIdMillis = now
    entryIdCounter = 0
  } else if (++entryIdCounter > 0xfff) {
    lastEntryIdMillis++
    entryIdCounter = 0
  }
  const bytes = Uuid.v7Bytes(lastEntryIdMillis)
  // The counter replaces the 12 random `rand_a` bits after the version.
  bytes[6] = 0x70 | (entryIdCounter >> 8)
  bytes[7] = entryIdCounter & 0xff
  return bytes as EntryId
}

/**
 * Extracts the millisecond timestamp encoded in a UUID v7 `EntryId`.
 *
 * @stability unstable
 * @category getters
 * @since 4.0.0
 */
export const entryIdMillis = (entryId: EntryId): number =>
  // Multiply instead of shifting: bitwise operators are signed 32-bit.
  ((((entryId[0] * 256 + entryId[1]) * 256 + entryId[2]) * 256 + entryId[3]) * 256 + entryId[4]) * 256 +
  entryId[5]

/**
 * Schema for a committed event journal entry.
 *
 * **Details**
 *
 * An entry records its ID, event tag, primary key, and SchemaBinary-encoded
 * payload, with helpers for array SchemaBinary encoding and creation timestamps.
 *
 * @stability unstable
 * @category schemas
 * @since 4.0.0
 */
export class Entry extends Schema.Class<Entry>("effect/eventlog/EventJournal/Entry")({
  id: EntryId,
  event: Schema.String,
  primaryKey: Schema.String,
  payload: Schema.Uint8Array
}) {
  /**
   * SchemaBinary codec for arrays of committed event journal entries.
   *
   * @stability unstable
   * @since 4.0.0
   */
  static arraySchemaBinary = Schema.Array(SchemaBinary.toCodec(Entry))

  /**
   * Encodes arrays of committed entries with the SchemaBinary entry codec.
   *
   * @stability unstable
   * @since 4.0.0
   */
  static encodeArray = Schema.encodeUnknownEffect(Entry.arraySchemaBinary)

  /**
   * Decodes arrays of committed entries with the SchemaBinary entry codec.
   *
   * @stability unstable
   * @since 4.0.0
   */
  static decodeArray = (
    input: unknown,
    options?: SchemaAST.ParseOptions
  ): Effect.Effect<Array<Entry>, Schema.SchemaError> =>
    Effect.map(decodeEntryFieldsArray(input, options), Arr.map(entryFromFields))

  /**
   * Ordering for committed entries by their event journal entry id.
   *
   * @stability unstable
   * @since 4.0.0
   */
  static Order = Order.make<Entry>((a, b) => EntryIdOrder(a.id, b.id))

  /**
   * String representation of the entry id.
   *
   * @stability unstable
   * @since 4.0.0
   */
  get idString(): string {
    return Uuid.stringify(this.id)
  }

  /**
   * Creation timestamp encoded in the UUID v7 entry id, in epoch milliseconds.
   *
   * @stability unstable
   * @since 4.0.0
   */
  get createdAtMillis(): number {
    return entryIdMillis(this.id)
  }

  /**
   * Creation timestamp encoded in the UUID v7 entry id, as a UTC date-time.
   *
   * @stability unstable
   * @since 4.0.0
   */
  get createdAt(): DateTime.Utc {
    return DateTime.makeUnsafe(this.createdAtMillis)
  }
}

/**
 * Schema for an event journal entry received from a remote source.
 *
 * **Details**
 *
 * It pairs the remote sequence number with the journal entry payload.
 *
 * @stability unstable
 * @category schemas
 * @since 4.0.0
 */
export class RemoteEntry extends Schema.Class<RemoteEntry>("effect/eventlog/EventJournal/RemoteEntry")({
  remoteSequence: Schema.Natural,
  entry: Entry
}) {}

// Decoding frames into the plain field structs and then constructing the
// classes from the already validated fields skips the per-instance class
// decode, which costs more than reading the frame. The wire format is the same.

/** @internal */
export const EntryFields = Schema.Struct(Entry.fields)

/** @internal */
export const entryFromFields = (fields: typeof EntryFields.Type): Entry => Schema.makeClassTrusted(Entry, fields)

const decodeEntryFieldsArray = Schema.decodeUnknownEffect(Schema.Array(SchemaBinary.toCodec(EntryFields)))

/** @internal */
export const makeEntries = (
  entries: Arr.NonEmptyReadonlyArray<
    { readonly event: string; readonly primaryKey: string; readonly payload: Uint8Array }
  >
): Arr.NonEmptyArray<Entry> =>
  Arr.map(entries, ({ event, payload, primaryKey }) =>
    new Entry({
      id: makeEntryIdUnsafe(),
      event,
      primaryKey,
      payload
    }, { disableChecks: true }))

/**
 * Creates an in-memory `EventJournal` service.
 *
 * **Gotchas**
 *
 * Entries, remote tracking state, and locks live only in the current process and
 * are lost when the service is discarded.
 *
 * @stability unstable
 * @category constructors
 * @since 4.0.0
 */
export const makeMemory: Effect.Effect<EventJournal["Service"]> = Effect.gen(function*() {
  const journal: Array<Entry> = []
  // Local writes append in commit order, so an import with a future timestamp
  // leaves the journal unordered until the next import re-sorts it. Remote
  // backlogs are subsequences of the journal, so one flag covers them too.
  let journalSorted = true
  const byId = new Map<string, Entry>()
  const remotes = new Map<string, { sequence: number; missing: Array<Entry> }>()
  const pubsub = yield* PubSub.unbounded<Entry>()
  const storeSemaphores = new Map<StoreId, Semaphore.Semaphore>()
  const withLock = (storeId: StoreId) => {
    let semaphore = storeSemaphores.get(storeId)
    if (!semaphore) {
      semaphore = Semaphore.makeUnsafe(1)
      storeSemaphores.set(storeId, semaphore)
    }
    return semaphore.withPermit
  }

  const ensureRemote = (remoteId: RemoteId) => {
    const remoteIdString = Uuid.stringify(remoteId)
    const remote = remotes.get(remoteIdString)
    if (remote) return remote
    const created = { sequence: 0, missing: journal.slice() }
    remotes.set(remoteIdString, created)
    return created
  }

  const writeMany: EventJournal["Service"]["writeMany"] = ({ effect, entries }) =>
    Effect.acquireUseRelease(
      Effect.sync(() => makeEntries(entries)),
      effect,
      (entries, exit) =>
        Effect.suspend(() => {
          if (exit._tag === "Failure") return Effect.void
          for (const entry of entries) {
            const last = journal[journal.length - 1]
            if (last !== undefined && last.createdAtMillis > entry.createdAtMillis) {
              journalSorted = false
            }
            journal.push(entry)
            byId.set(entry.idString, entry)
            remotes.forEach((remote) => {
              remote.missing.push(entry)
            })
          }
          return PubSub.publishAll(pubsub, entries)
        })
    )

  return EventJournal.of({
    entries: Effect.sync(() => journal.slice()),
    write: ({ effect, ...entry }) => writeMany({ entries: [entry], effect: (entries) => effect(entries[0]) }),
    writeMany,
    writeFromRemote: Effect.fnUntraced(function*(options) {
      const remote = ensureRemote(options.remoteId)
      const uncommittedRemotes: Array<RemoteEntry> = []
      const duplicateEntries: Array<Entry> = []
      for (const remoteEntry of options.entries) {
        if (byId.has(remoteEntry.entry.idString)) {
          duplicateEntries.push(remoteEntry.entry)
        } else {
          uncommittedRemotes.push(remoteEntry)
        }
      }

      const compacted = options.compact
        ? yield* options.compact(uncommittedRemotes)
        : uncommittedRemotes.map((remoteEntry) => remoteEntry.entry)

      if (compacted.length > 0) {
        const index = new ConflictIndex(compacted)
        // Only the newer suffix can conflict, unless local writes left the
        // journal unordered.
        let i = journalSorted ? journal.length : 0
        while (i > 0 && journal[i - 1].createdAtMillis > index.oldestMillis) i--
        for (; i < journal.length; i++) {
          index.add(journal[i])
        }
        yield* options.effect(index.toBatch())
      }
      for (const remoteEntry of uncommittedRemotes) {
        byId.set(remoteEntry.entry.idString, remoteEntry.entry)
      }
      // Sequences advance with the commit, so a failed batch is redelivered.
      for (const remoteEntry of options.entries) {
        if (remoteEntry.remoteSequence >= remote.sequence) {
          remote.sequence = remoteEntry.remoteSequence + 1
        }
      }
      const imported = uncommittedRemotes.map((remoteEntry) => remoteEntry.entry).sort(byCreatedAt)
      insertOrdered(journal, journalSorted, imported)
      remotes.forEach((target) => {
        if (target !== remote) {
          insertOrdered(target.missing, journalSorted, imported)
        } else if (!journalSorted) {
          target.missing.sort(byCreatedAt)
        }
      })
      journalSorted = true
      return {
        duplicateEntries
      }
    }),
    withRemoteUncommited: (remoteId, f) =>
      Effect.acquireUseRelease(
        Effect.sync(() => ensureRemote(remoteId).missing.slice()),
        (entries) => Arr.isReadonlyArrayNonEmpty(entries) ? Effect.asSome(f(entries)) : Effect.succeedNone,
        (entries, exit) =>
          Effect.sync(() => {
            if (exit._tag === "Failure") return
            const last = entries[entries.length - 1]
            if (!last) return
            const remote = ensureRemote(remoteId)
            for (let i = remote.missing.length - 1; i >= 0; i--) {
              if (remote.missing[i].id === last.id) {
                remote.missing = remote.missing.slice(i + 1)
                break
              }
            }
          })
      ),
    nextRemoteSequence: (remoteId) => Effect.sync(() => ensureRemote(remoteId).sequence),
    changes: PubSub.subscribe(pubsub),
    destroy: Effect.sync(() => {
      journal.length = 0
      journalSorted = true
      byId.clear()
      remotes.clear()
    }),
    withLock
  })
})

const byCreatedAt = (a: Entry, b: Entry) => a.createdAtMillis - b.createdAtMillis

// Same result as appending `additions` and stable-sorting by creation time:
// existing entries stay ahead of additions that share their timestamp.
const insertOrdered = (entries: Array<Entry>, sorted: boolean, additions: ReadonlyArray<Entry>): void => {
  let i = entries.length - 1
  for (let n = 0; n < additions.length; n++) {
    entries.push(additions[n])
  }
  if (!sorted) {
    entries.sort(byCreatedAt)
    return
  }
  // Merge from the back, so additions newer than the whole array cost O(additions).
  let j = additions.length - 1
  let k = entries.length - 1
  while (j >= 0) {
    if (i >= 0 && entries[i].createdAtMillis > additions[j].createdAtMillis) {
      entries[k--] = entries[i--]
    } else {
      entries[k--] = additions[j--]
    }
  }
}

/**
 * Layer that provides an in-memory `EventJournal`.
 *
 * **Gotchas**
 *
 * All journal data is stored in process memory and is not persisted across layer
 * lifetimes.
 *
 * @stability unstable
 * @category layers
 * @since 4.0.0
 */
export const layerMemory: Layer.Layer<EventJournal> = Layer.effect(EventJournal, makeMemory)

/**
 * Creates an `EventJournal` backed by IndexedDB.
 *
 * **Details**
 *
 * The journal stores entries and remote replication metadata in the configured
 * browser database, publishes local changes, and requires `Scope` so the database
 * connection can be closed when the scope ends.
 *
 * @stability unstable
 * @category constructors
 * @since 4.0.0
 */
export const makeIndexedDb = (options?: {
  readonly database?: string
}): Effect.Effect<EventJournal["Service"], EventJournalError, Scope> =>
  Effect.gen(function*() {
    const database = options?.database ?? "effect_event_journal"
    const openRequest = indexedDB.open(database, 2)
    openRequest.onupgradeneeded = (event) => {
      const db = openRequest.result

      if (event.oldVersion < 1) {
        const entries = db.createObjectStore("entries", { keyPath: "id" })
        entries.createIndex("id", "id", { unique: true })
        entries.createIndex("event", "event")

        const remotes = db.createObjectStore("remotes", { keyPath: ["remoteId", "entryId"] })
        remotes.createIndex("id", ["remoteId", "entryId"], { unique: true })
        remotes.createIndex("sequence", ["remoteId", "sequence"], { unique: true })

        const remoteEntryId = db.createObjectStore("remoteEntryId", { keyPath: ["remoteId"] })
        remoteEntryId.createIndex("id", "remoteId", { unique: true })
      }

      // Entry ids order creation, not insertion, so uploads checkpoint an
      // insertion sequence instead. Backfill it from the existing entries.
      const sequence = db.createObjectStore("entrySequence", { autoIncrement: true })
      const cursorRequest = openRequest.transaction!.objectStore("entries").openKeyCursor()
      cursorRequest.onsuccess = () => {
        const cursor = cursorRequest.result
        if (!cursor) return
        sequence.add(cursor.primaryKey)
        cursor.continue()
      }
    }

    const db = yield* Effect.acquireRelease(
      idbReq("open", () => openRequest),
      (db) => Effect.sync(() => db.close())
    )

    const pubsub = yield* PubSub.unbounded<Entry>()

    const writeMany: EventJournal["Service"]["writeMany"] = ({ effect, entries }) =>
      Effect.uninterruptibleMask((restore) => {
        const committed = makeEntries(entries)
        return restore(effect(committed)).pipe(
          Effect.tap(Effect.callback<void, EventJournalError>((resume) => {
            const tx = db.transaction(["entries", "entrySequence"], "readwrite")
            const store = tx.objectStore("entries")
            const sequence = tx.objectStore("entrySequence")
            for (const entry of committed) {
              store.put(encodeEntryIdb(entry))
              sequence.add(entry.id as IDBValidKey)
            }
            onTransactionDone(tx, "writeMany", resume, constVoid)
          })),
          Effect.tap(PubSub.publishAll(pubsub, committed))
        )
      })

    return EventJournal.of({
      entries: idbReq("entries", () =>
        db.transaction("entries", "readonly")
          .objectStore("entries")
          .index("id")
          .getAll()).pipe(
          Effect.flatMap((_) =>
            decodeEntryIdbArray(_).pipe(
              Effect.mapError((cause) => new EventJournalError({ method: "entries", cause }))
            )
          )
        ),
      write: ({ effect, ...entry }) => writeMany({ entries: [entry], effect: (entries) => effect(entries[0]) }),
      writeMany,
      writeFromRemote: Effect.fnUntraced(function*(options) {
        const uncommittedRemotes: Array<RemoteEntry> = []
        const duplicateEntries: Array<Entry> = []

        yield* Effect.callback<void, EventJournalError>((resume) => {
          const tx = db.transaction("entries", "readonly")
          const entries = tx.objectStore("entries")
          // Requests in a transaction complete in the order they were issued.
          for (const remoteEntry of options.entries) {
            const request = entries.getKey(remoteEntry.entry.id as IDBValidKey)
            request.onsuccess = () => {
              if (request.result !== undefined) {
                duplicateEntries.push(remoteEntry.entry)
              } else {
                uncommittedRemotes.push(remoteEntry)
              }
            }
          }
          onTransactionDone(tx, "writeFromRemote", resume, constVoid)
          return Effect.sync(() => tx.abort())
        })

        const compacted = options.compact
          ? yield* options.compact(uncommittedRemotes)
          : uncommittedRemotes.map((remoteEntry) => remoteEntry.entry)

        if (compacted.length > 0) {
          const index = new ConflictIndex(compacted)
          yield* Effect.callback<void, EventJournalError>((resume) => {
            const tx = db.transaction("entries", "readonly")
            const cursorRequest = tx.objectStore("entries").openCursor(
              IDBKeyRange.lowerBound(entryIdLowerBound(index.oldestMillis + 1) as IDBValidKey)
            )
            cursorRequest.onsuccess = () => {
              const cursor = cursorRequest.result
              if (!cursor) return
              // Decode only the entries that can conflict.
              const value = cursor.value as { readonly event: string; readonly primaryKey: string }
              if (index.wants(value.event, value.primaryKey)) {
                index.add(decodeEntryIdb(cursor.value))
              }
              cursor.continue()
            }
            onTransactionDone(tx, "writeFromRemote", resume, constVoid)
            return Effect.sync(() => tx.abort())
          })
          yield* options.effect(index.toBatch())
        }

        yield* Effect.callback<void, EventJournalError>((resume) => {
          const tx = db.transaction(["entries", "remotes", "entrySequence"], "readwrite")
          const entries = tx.objectStore("entries")
          const remotes = tx.objectStore("remotes")
          const sequence = tx.objectStore("entrySequence")
          for (const remoteEntry of uncommittedRemotes) {
            entries.add(encodeEntryIdb(remoteEntry.entry))
            sequence.add(remoteEntry.entry.id as IDBValidKey)
          }
          // Sequences advance with the commit, so a failed batch is redelivered.
          for (const remoteEntry of options.entries) {
            remotes.put({
              remoteId: options.remoteId,
              entryId: remoteEntry.entry.id,
              sequence: remoteEntry.remoteSequence
            })
          }
          onTransactionDone(tx, "writeFromRemote", resume, constVoid)
          return Effect.sync(() => tx.abort())
        })
        return {
          duplicateEntries
        }
      }),
      withRemoteUncommited: (remoteId, f) => {
        const remoteIdKey = remoteId as IDBValidKey
        return Effect.callback<{ readonly entries: Array<Entry>; readonly sequence: number }, EventJournalError>(
          (resume) => {
            const entries: Array<Entry> = []
            // The last insertion sequence visited, or 0 when nothing follows the checkpoint.
            let sequence = 0
            const tx = db.transaction(["entries", "remotes", "remoteEntryId", "entrySequence"], "readonly")
            const entriesStore = tx.objectStore("entries")
            const remotesStore = tx.objectStore("remotes")
            const checkpoint = tx.objectStore("remoteEntryId").get([remoteIdKey]) as IDBRequest<Checkpoint | undefined>
            checkpoint.onsuccess = () => {
              const cursorRequest = tx.objectStore("entrySequence").openCursor(
                IDBKeyRange.lowerBound(checkpoint.result?.sequence ?? 0, true)
              )
              cursorRequest.onsuccess = () => {
                const cursor = cursorRequest.result
                if (!cursor) return
                sequence = cursor.key as number
                const entryId = cursor.value as IDBValidKey
                const known = remotesStore.getKey([remoteIdKey, entryId])
                known.onsuccess = () => {
                  if (known.result !== undefined) return
                  const entry = entriesStore.get(entryId)
                  entry.onsuccess = () => {
                    entries.push(decodeEntryIdb(entry.result))
                  }
                }
                cursor.continue()
              }
            }
            onTransactionDone(tx, "withRemoteUncommited", resume, () => ({ entries, sequence }))
            return Effect.sync(() => tx.abort())
          }
        ).pipe(
          Effect.flatMap(({ entries, sequence }) => {
            if (sequence === 0) return Effect.succeedNone
            entries.sort(byEntryId)
            return Effect.uninterruptibleMask((restore) =>
              restore(Arr.isReadonlyArrayNonEmpty(entries) ? Effect.asSome(f(entries)) : Effect.succeedNone).pipe(
                Effect.tap(Effect.callback<void, EventJournalError>((resume) => {
                  // Uploads can complete out of order; the checkpoint only moves forward.
                  const tx = db.transaction("remoteEntryId", "readwrite")
                  const store = tx.objectStore("remoteEntryId")
                  const checkpoint = store.get([remoteIdKey]) as IDBRequest<Checkpoint | undefined>
                  checkpoint.onsuccess = () => {
                    if ((checkpoint.result?.sequence ?? 0) < sequence) store.put({ remoteId, sequence })
                  }
                  onTransactionDone(tx, "withRemoteUncommited", resume, constVoid)
                }))
              )
            )
          })
        )
      },
      nextRemoteSequence: (remoteId) =>
        Effect.callback<number, EventJournalError>((resume) => {
          const tx = db.transaction("remotes", "readonly")
          let sequence = 0
          const remoteIdKey = remoteId as IDBValidKey
          const cursorRequest = tx.objectStore("remotes").index("sequence").openCursor(
            IDBKeyRange.bound([remoteIdKey, 0], [remoteIdKey, Infinity]),
            "prev"
          )
          cursorRequest.onsuccess = () => {
            const cursor = cursorRequest.result
            if (!cursor) return
            sequence = cursor.value.sequence + 1
          }
          onTransactionDone(tx, "nextRemoteSequence", resume, () => sequence)
          return Effect.sync(() => tx.abort())
        }),
      changes: PubSub.subscribe(pubsub),
      destroy: Effect.sync(() => {
        indexedDB.deleteDatabase(database)
      }),
      withLock: yield* makeBrowserWithLock(database)
    })
  })

const makeBrowserWithLock = Effect.fnUntraced(function*(key: string) {
  if (typeof navigator !== "undefined" && "locks" in navigator) {
    return (storeId: StoreId) => <A, E, R>(self: Effect.Effect<A, E, R>) =>
      Effect.callback<A, E, R>((resume, signal) => {
        navigator.locks.request(`${key}/${storeId}`, { signal }, () =>
          new Promise<void>((resolve) => {
            resume(Effect.onExit(self, () => {
              resolve()
              return Effect.void
            }))
          })).catch((defect) => resume(Effect.die(defect)))
      })
  }
  const semaphores = new Map<StoreId, Semaphore.Semaphore>()
  return (storeId: StoreId) => {
    let semaphore = semaphores.get(storeId)
    if (!semaphore) {
      semaphore = Semaphore.makeUnsafe(1)
      semaphores.set(storeId, semaphore)
    }
    return semaphore.withPermit
  }
})

// Upload progress for a remote. Rows written before database version 2 hold
// an `entryId` instead; it cannot account for later imports of older entries,
// so it is ignored.
interface Checkpoint {
  readonly sequence?: number
}

const byEntryId = (a: Entry, b: Entry) => indexedDB.cmp(a.id as IDBValidKey, b.id as IDBValidKey)

// The smallest entry id created in the given millisecond.
const entryIdLowerBound = (millis: number): Uint8Array => {
  const bytes = new Uint8Array(16)
  for (let i = 5; i >= 0; i--) {
    bytes[i] = millis % 256
    millis = Math.floor(millis / 256)
  }
  return bytes
}

const decodeEntryIdb = Schema.decodeSync(Entry)
const encodeEntryIdb = Schema.encodeSync(Entry)
const EntryIdbArray = Schema.Array(Entry)
const decodeEntryIdbArray = Schema.decodeUnknownEffect(EntryIdbArray)

/**
 * Provides `EventJournal` using the IndexedDB-backed implementation created by
 * `makeIndexedDb`.
 *
 * @stability unstable
 * @category layers
 * @since 4.0.0
 */
export const layerIndexedDb = (options?: {
  readonly database?: string
}): Layer.Layer<EventJournal, EventJournalError> =>
  Layer.effect(
    EventJournal,
    makeIndexedDb(options)
  )

// Resumes when the transaction commits, and fails if it errors or aborts. An
// abort, such as a failed commit, does not always dispatch an error first.
const onTransactionDone = <A>(
  tx: IDBTransaction,
  method: string,
  resume: (effect: Effect.Effect<A, EventJournalError>) => void,
  onComplete: () => A
): void => {
  tx.oncomplete = () => resume(Effect.succeed(onComplete()))
  tx.onerror = tx.onabort = () => resume(Effect.fail(new EventJournalError({ method, cause: tx.error })))
}

const idbReq = <T>(method: string, evaluate: () => IDBRequest<T>) =>
  Effect.callback<T, EventJournalError>((resume) => {
    const request = evaluate()
    if (request.readyState === "done") {
      resume(Effect.succeed(request.result))
      return
    }
    request.onsuccess = () => resume(Effect.succeed(request.result))
    request.onerror = () => resume(Effect.fail(new EventJournalError({ method, cause: request.error })))
  })
