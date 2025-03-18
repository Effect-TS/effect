/**
 * @since 1.0.0
 */
import * as MsgPack from "@effect/platform/MsgPack"
import * as Context from "effect/Context"
import * as DateTime from "effect/DateTime"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as PubSub from "effect/PubSub"
import type * as Queue from "effect/Queue"
import * as Schema from "effect/Schema"
import type { Scope } from "effect/Scope"
import * as Uuid from "uuid"

/**
 * @since 1.0.0
 * @category tags
 */
export class EventJournal extends Context.Tag("@effect/experimental/EventJournal")<
  EventJournal,
  {
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
     * Write events from a remote source to the journal.
     */
    readonly writeFromRemote: (
      options: {
        readonly remoteId: RemoteId
        readonly entries: ReadonlyArray<RemoteEntry>
        readonly compact?:
          | ((uncommitted: ReadonlyArray<RemoteEntry>) => Effect.Effect<
            ReadonlyArray<[compacted: ReadonlyArray<Entry>, remoteEntries: ReadonlyArray<RemoteEntry>]>,
            EventJournalError
          >)
          | undefined
        readonly effect: (options: {
          readonly entry: Entry
          readonly conflicts: ReadonlyArray<Entry>
        }) => Effect.Effect<void, EventJournalError>
      }
    ) => Effect.Effect<void, EventJournalError>

    /**
     * Return the uncommitted entries for a remote source.
     */
    readonly withRemoteUncommited: <A, E, R>(
      remoteId: RemoteId,
      f: (entries: ReadonlyArray<Entry>) => Effect.Effect<A, E, R>
    ) => Effect.Effect<A, EventJournalError | E, R>

    /**
     * Retrieve the last known sequence number for a remote source.
     */
    readonly nextRemoteSequence: (remoteId: RemoteId) => Effect.Effect<number, EventJournalError>

    /**
     * The entries added to the local journal.
     */
    readonly changes: Effect.Effect<Queue.Dequeue<Entry>, never, Scope>

    /**
     * Remove all data
     */
    readonly destroy: Effect.Effect<void, EventJournalError>
  }
>() {}

/**
 * @since 1.0.0
 * @category errors
 */
export const ErrorTypeId: unique symbol = Symbol.for("@effect/experimental/EventJournal/ErrorId")

/**
 * @since 1.0.0
 * @category errors
 */
export type ErrorTypeId = typeof ErrorTypeId

/**
 * @since 1.0.0
 * @category errors
 */
export class EventJournalError
  extends Schema.TaggedClass<EventJournalError>("@effect/experimental/EventJournal/Error")("EventJournalError", {
    method: Schema.String,
    cause: Schema.Defect
  })
{
  /**
   * @since 1.0.0
   */
  readonly [ErrorTypeId]: ErrorTypeId = ErrorTypeId
}

/**
 * @since 1.0.0
 * @category remote
 */
export const RemoteIdTypeId: unique symbol = Symbol.for("@effect/experimental/EventJournal/RemoteId")

/**
 * @since 1.0.0
 * @category remote
 */
export const RemoteId = Schema.Uint8ArrayFromSelf.pipe(Schema.brand(RemoteIdTypeId))

/**
 * @since 1.0.0
 * @category remote
 */
export type RemoteId = typeof RemoteId.Type

/**
 * @since 1.0.0
 * @category remote
 */
export const makeRemoteId = (): RemoteId => Uuid.v4({}, new Uint8Array(16)) as RemoteId

/**
 * @since 1.0.0
 * @category entry
 */
export const EntryIdTypeId: unique symbol = Symbol.for("@effect/experimental/EventJournal/EntryId")

/**
 * @since 1.0.0
 * @category entry
 */
export const EntryId = Schema.Uint8ArrayFromSelf.pipe(Schema.brand(EntryIdTypeId))

/**
 * @since 1.0.0
 * @category entry
 */
export type EntryId = typeof EntryId.Type

/**
 * @since 1.0.0
 * @category entry
 */
export const makeEntryId = (options: { msecs?: number } = {}): EntryId => {
  return Uuid.v7(options, new Uint8Array(16)) as EntryId
}

/**
 * @since 1.0.0
 * @category entry
 */
export const entryIdMillis = (entryId: EntryId): number => {
  const bytes = new Uint8Array(8)
  bytes.set(entryId.subarray(0, 6), 2)
  return Number(new DataView(bytes.buffer).getBigUint64(0))
}

/**
 * @since 1.0.0
 * @category entry
 */
export class Entry extends Schema.Class<Entry>("@effect/experimental/EventJournal/Entry")({
  id: EntryId,
  event: Schema.String,
  primaryKey: Schema.String,
  payload: Schema.Uint8ArrayFromSelf
}) {
  /**
   * @since 1.0.0
   */
  static arrayMsgPack = Schema.Array(MsgPack.schema(Entry))

  /**
   * @since 1.0.0
   */
  static encodeArray = Schema.encode(Entry.arrayMsgPack)

  /**
   * @since 1.0.0
   */
  static decodeArray = Schema.decode(Entry.arrayMsgPack)

  /**
   * @since 1.0.0
   */
  get idString(): string {
    return Uuid.stringify(this.id)
  }

  /**
   * @since 1.0.0
   */
  get createdAtMillis(): number {
    return entryIdMillis(this.id)
  }

  /**
   * @since 1.0.0
   */
  get createdAt(): DateTime.Utc {
    return DateTime.unsafeMake(this.createdAtMillis)
  }
}

/**
 * @since 1.0.0
 * @category entry
 */
export class RemoteEntry extends Schema.Class<RemoteEntry>("@effect/experimental/EventJournal/RemoteEntry")({
  remoteSequence: Schema.Number,
  entry: Entry
}) {}

/**
 * @since 1.0.0
 * @category memory
 */
export const makeMemory: Effect.Effect<typeof EventJournal.Service> = Effect.gen(function*() {
  const journal: Array<Entry> = []
  const byId = new Map<string, Entry>()
  const remotes = new Map<string, { sequence: number; missing: Array<Entry> }>()
  const pubsub = yield* PubSub.unbounded<Entry>()

  const ensureRemote = (remoteId: RemoteId) => {
    const remoteIdString = Uuid.stringify(remoteId)
    let remote = remotes.get(remoteIdString)
    if (remote) return remote
    remote = { sequence: 0, missing: journal.slice() }
    remotes.set(remoteIdString, remote)
    return remote
  }

  return EventJournal.of({
    entries: Effect.sync(() => journal.slice()),
    write({ effect, event, payload, primaryKey }) {
      return Effect.acquireUseRelease(
        Effect.sync(() =>
          new Entry({
            id: makeEntryId(),
            event,
            primaryKey,
            payload
          }, { disableValidation: true })
        ),
        effect,
        (entry, exit) =>
          Effect.suspend(() => {
            if (exit._tag === "Failure" || byId.has(entry.idString)) return Effect.void
            journal.push(entry)
            byId.set(entry.idString, entry)
            remotes.forEach((remote) => {
              remote.missing.push(entry)
            })
            return pubsub.publish(entry)
          })
      )
    },
    writeFromRemote: (options) =>
      Effect.gen(function*() {
        const remote = ensureRemote(options.remoteId)
        const uncommittedRemotes: Array<RemoteEntry> = []
        const uncommitted: Array<Entry> = []
        for (const remoteEntry of options.entries) {
          if (byId.has(remoteEntry.entry.idString)) {
            if (remoteEntry.remoteSequence > remote.sequence) {
              remote.sequence = remoteEntry.remoteSequence
            }
            continue
          }
          uncommittedRemotes.push(remoteEntry)
          uncommitted.push(remoteEntry.entry)
        }

        const brackets = options.compact
          ? yield* options.compact(uncommittedRemotes)
          : [[uncommitted, uncommittedRemotes]] as const

        for (const [compacted, remoteEntries] of brackets) {
          for (const originEntry of compacted) {
            const entryMillis = entryIdMillis(originEntry.id)
            const conflicts: Array<Entry> = []
            for (let i = journal.length - 1; i >= -1; i--) {
              const entry = journal[i]
              if (entry !== undefined && entry.createdAtMillis > entryMillis) {
                continue
              }
              for (let j = i + 2; j < journal.length; j++) {
                const entry = journal[j]!
                if (entry.event === originEntry.event && entry.primaryKey === originEntry.primaryKey) {
                  conflicts.push(entry)
                }
              }
              yield* options.effect({ entry: originEntry, conflicts })
              break
            }
          }
          for (let j = 0; j < remoteEntries.length; j++) {
            const remoteEntry = remoteEntries[j]
            journal.push(remoteEntry.entry)
            if (remoteEntry.remoteSequence > remote.sequence) {
              remote.sequence = remoteEntry.remoteSequence
            }
          }
          journal.sort((a, b) => a.createdAtMillis - b.createdAtMillis)
        }
      }),
    withRemoteUncommited: (remoteId, f) =>
      Effect.acquireUseRelease(
        Effect.sync(() => ensureRemote(remoteId).missing.slice()),
        f,
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
      byId.clear()
      remotes.clear()
    })
  })
})

/**
 * @since 1.0.0
 * @category memory
 */
export const layerMemory: Layer.Layer<EventJournal> = Layer.effect(EventJournal, makeMemory)

/**
 * @since 1.0.0
 * @category indexed db
 */
export const makeIndexedDb = (options?: {
  readonly database?: string
}): Effect.Effect<typeof EventJournal.Service, EventJournalError, Scope> =>
  Effect.gen(function*() {
    const database = options?.database ?? "effect_event_journal"
    const openRequest = indexedDB.open(database, 1)
    openRequest.onupgradeneeded = () => {
      const db = openRequest.result

      const entries = db.createObjectStore("entries", { keyPath: "id" })
      entries.createIndex("id", "id", { unique: true })
      entries.createIndex("event", "event")

      const remotes = db.createObjectStore("remotes", { keyPath: ["remoteId", "entryId"] })
      remotes.createIndex("id", ["remoteId", "entryId"], { unique: true })
      remotes.createIndex("sequence", ["remoteId", "sequence"], { unique: true })

      const remoteEntryId = db.createObjectStore("remoteEntryId", { keyPath: ["remoteId"] })
      remoteEntryId.createIndex("id", "remoteId", { unique: true })
    }
    const db = yield* Effect.acquireRelease(
      idbReq("open", () => openRequest),
      (db) => Effect.sync(() => db.close())
    )

    const pubsub = yield* PubSub.unbounded<Entry>()

    return EventJournal.of({
      entries: idbReq(
        "entries",
        () =>
          db.transaction("entries", "readonly")
            .objectStore("entries")
            .index("id")
            .getAll()
      ).pipe(
        Effect.flatMap((_) =>
          decodeEntryIdbArray(_).pipe(
            Effect.mapError((cause) => new EventJournalError({ method: "entries", cause }))
          )
        )
      ),
      write: ({ effect, event, payload, primaryKey }) =>
        Effect.uninterruptibleMask((restore) => {
          const entry = new Entry({
            id: makeEntryId(),
            event,
            primaryKey,
            payload
          }, { disableValidation: true })
          return restore(effect(entry)).pipe(
            Effect.zipLeft(idbReq(
              "write",
              () =>
                db
                  .transaction("entries", "readwrite")
                  .objectStore("entries")
                  .put(encodeEntryIdb(entry))
            )),
            Effect.zipLeft(pubsub.publish(entry))
          )
        }),
      writeFromRemote: (options) =>
        Effect.gen(function*() {
          const uncommitted: Array<Entry> = []
          const uncommittedRemotes: Array<RemoteEntry> = []

          yield* Effect.async<void, EventJournalError>((resume) => {
            const tx = db.transaction(["entries", "remotes"], "readwrite")
            const entries = tx.objectStore("entries")
            const remotes = tx.objectStore("remotes")
            const iterator = options.entries[Symbol.iterator]()
            const handleNext = (state: IteratorResult<RemoteEntry, void>) => {
              if (state.done) return
              const remoteEntry = state.value
              const entry = remoteEntry.entry
              entries.get(entry.id).onsuccess = (event) => {
                if ((event.target as any).result) {
                  remotes.put({
                    remoteId: options.remoteId,
                    entryId: remoteEntry.entry.id,
                    sequence: remoteEntry.remoteSequence
                  })
                  handleNext(iterator.next())
                  return
                }
                uncommitted.push(entry)
                uncommittedRemotes.push(remoteEntry)
                handleNext(iterator.next())
              }
            }
            handleNext(iterator.next())
            tx.oncomplete = () => resume(Effect.void)
            tx.onerror = () =>
              resume(Effect.fail(new EventJournalError({ method: "writeFromRemote", cause: tx.error })))
            return Effect.sync(() => tx.abort())
          })

          const brackets = options.compact
            ? yield* options.compact(uncommittedRemotes)
            : [[uncommitted, uncommittedRemotes]] as const

          for (const [compacted, remoteEntries] of brackets) {
            for (const originEntry of compacted) {
              const conflicts: Array<Entry> = []
              yield* Effect.async<void, EventJournalError>((resume) => {
                const tx = db.transaction("entries", "readonly")
                const entries = tx.objectStore("entries")
                const cursorRequest = entries.index("id").openCursor(
                  IDBKeyRange.lowerBound(originEntry.id, true),
                  "next"
                )
                cursorRequest.onsuccess = () => {
                  const cursor = cursorRequest.result!
                  if (!cursor) return
                  const decodedEntry = decodeEntryIdb(cursor.value)
                  if (
                    decodedEntry.event === originEntry.event &&
                    decodedEntry.primaryKey === originEntry.primaryKey
                  ) {
                    conflicts.push(decodedEntry)
                  }
                  cursor.continue()
                }
                tx.oncomplete = () => resume(Effect.void)
                tx.onerror = () =>
                  resume(Effect.fail(new EventJournalError({ method: "writeFromRemote", cause: tx.error })))
                return Effect.sync(() => tx.abort())
              })

              yield* options.effect({ entry: originEntry, conflicts })
            }

            yield* Effect.async<void, EventJournalError>((resume) => {
              const tx = db.transaction(["entries", "remotes"], "readwrite")
              const entries = tx.objectStore("entries")
              const remotes = tx.objectStore("remotes")
              for (const remoteEntry of remoteEntries) {
                entries.add(encodeEntryIdb(remoteEntry.entry))
                remotes.put({
                  remoteId: options.remoteId,
                  entryId: remoteEntry.entry.id,
                  sequence: remoteEntry.remoteSequence
                })
              }
              tx.oncomplete = () => resume(Effect.void)
              tx.onerror = () =>
                resume(Effect.fail(new EventJournalError({ method: "writeFromRemote", cause: tx.error })))
              return Effect.sync(() => tx.abort())
            })
          }
        }),
      withRemoteUncommited: (remoteId, f) =>
        Effect.async<Array<Entry>, EventJournalError>((resume) => {
          const entries: Array<Entry> = []
          const tx = db.transaction(["entries", "remotes", "remoteEntryId"], "readwrite")

          const entriesStore = tx.objectStore("entries")
          const remotesStore = tx.objectStore("remotes")
          const remoteEntryIdStore = tx.objectStore("remoteEntryId")

          remoteEntryIdStore.get(remoteId).onsuccess = (event) => {
            const startEntryId = (event.target as any).result?.entryId
            const entryCursor = entriesStore.index("id").openCursor(
              startEntryId ? IDBKeyRange.lowerBound(startEntryId, true) : null,
              "next"
            )
            entryCursor.onsuccess = () => {
              const cursor = entryCursor.result
              if (!cursor) return
              const entry = decodeEntryIdb(cursor.value)
              remotesStore.get([remoteId, entry.id]).onsuccess = (event) => {
                if (!(event.target as any).result) entries.push(entry)
                cursor.continue()
              }
            }
          }

          tx.oncomplete = () => resume(Effect.succeed(entries))
          tx.onerror = () =>
            resume(Effect.fail(new EventJournalError({ method: "withRemoteUncommited", cause: tx.error })))
          return Effect.sync(() => tx.abort())
        }).pipe(
          Effect.flatMap((entries) => {
            if (entries.length === 0) return f(entries)
            const entryId = entries[entries.length - 1].id
            return Effect.uninterruptibleMask((restore) =>
              restore(f(entries)).pipe(
                Effect.zipLeft(idbReq("withRemoteUncommited", () =>
                  db.transaction("remoteEntryId", "readwrite").objectStore("remoteEntryId").put({
                    remoteId,
                    entryId
                  })))
              )
            )
          })
        ),
      nextRemoteSequence: (remoteId) =>
        Effect.async<number, EventJournalError>((resume) => {
          const tx = db.transaction("remotes", "readonly")
          let sequence = 0
          const cursorRequest = tx.objectStore("remotes").index("sequence").openCursor(
            IDBKeyRange.bound([remoteId, 0], [remoteId, Infinity]),
            "prev"
          )
          cursorRequest.onsuccess = () => {
            const cursor = cursorRequest.result
            if (!cursor) return
            sequence = cursor.value.sequence + 1
          }
          tx.oncomplete = () => resume(Effect.succeed(sequence))
          tx.onerror = () =>
            resume(Effect.fail(new EventJournalError({ method: "nextRemoteSequence", cause: tx.error })))
          return Effect.sync(() => tx.abort())
        }),
      changes: PubSub.subscribe(pubsub),
      destroy: Effect.sync(() => {
        indexedDB.deleteDatabase(database)
      })
    })
  })

const decodeEntryIdb = Schema.decodeSync(Entry)
const encodeEntryIdb = Schema.encodeSync(Entry)
const EntryIdbArray = Schema.Array(Entry)
const decodeEntryIdbArray = Schema.decodeUnknown(EntryIdbArray)

/**
 * @since 1.0.0
 * @category indexed db
 */
export const layerIndexedDb = (options?: {
  readonly database?: string
}): Layer.Layer<EventJournal, EventJournalError> =>
  Layer.scoped(
    EventJournal,
    makeIndexedDb(options)
  )

const idbReq = <T>(method: string, evaluate: () => IDBRequest<T>) =>
  Effect.async<T, EventJournalError>((resume) => {
    const request = evaluate()
    if (request.readyState === "done") {
      resume(Effect.succeed(request.result))
      return
    }
    request.onsuccess = () => resume(Effect.succeed(request.result))
    request.onerror = () => resume(Effect.fail(new EventJournalError({ method, cause: request.error })))
  })
