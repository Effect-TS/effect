/**
 * @since 1.0.0
 */
import * as Context from "effect/Context"
import * as DateTime from "effect/DateTime"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Mailbox from "effect/Mailbox"
import * as PubSub from "effect/PubSub"
import type * as Queue from "effect/Queue"
import * as Schema from "effect/Schema"
import type { Scope } from "effect/Scope"
import * as Uuid from "uuid"
import * as MsgPack from "./MsgPack.js"

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
     * Read entries matching the given event names.
     */
    readonly forEvents: (options: {
      readonly events: ReadonlyArray<string>
      readonly before: DateTime.Utc
    }) => Effect.Effect<ReadonlyArray<Entry>, EventJournalError>

    /**
     * Write an event to the journal, performing an effect before committing the
     * event.
     */
    readonly write: <A, E, R>(options: {
      readonly id?: EntryId
      readonly event: string
      readonly primaryKey: string
      readonly payload: Uint8Array
      readonly effect: (entry: Entry) => Effect.Effect<A, E, R>
    }) => Effect.Effect<A, EventJournalError | E, R>

    /**
     * Write an array of entries to the journal.
     */
    readonly writeEntries: (entries: ReadonlyArray<Entry>) => Effect.Effect<void, EventJournalError>

    /**
     * Remove some entries from the journal
     */
    readonly remove: (ids: ReadonlyArray<EntryId>) => Effect.Effect<void, EventJournalError>

    /**
     * Write events from a remote source to the journal.
     *
     * The entries will be added to the `changes` mailbox, and any conflicts
     * will be included.
     */
    readonly writeFromRemote: (
      remoteId: RemoteId,
      entries: ReadonlyArray<RemoteEntry>
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
     * The entries from external sources that have not been committed.
     */
    readonly changesRemote: Mailbox.ReadonlyMailbox<{
      readonly entry: Entry
      readonly conflicts: ReadonlyArray<Entry>
    }>

    /**
     * The entries added to the local journal.
     */
    readonly changes: Effect.Effect<Queue.Dequeue<Entry>, never, Scope>

    /**
     * The entries added to the local journal.
     */
    readonly removals: Effect.Effect<Queue.Dequeue<EntryId>, never, Scope>

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
export const makeEntryId = (options?: {
  readonly timestamp?: number
  readonly payload?: Uint8Array
}): EntryId => {
  return Uuid.v7({
    msecs: options?.timestamp as any,
    random: options?.payload?.subarray(0, 16) as any
  }, new Uint8Array(16)) as EntryId
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
  const mailbox = yield* Mailbox.make<{
    readonly entry: Entry
    readonly conflicts: Array<Entry>
  }>()
  const pubsub = yield* PubSub.unbounded<Entry>()
  const pubsubRemoval = yield* PubSub.unbounded<EntryId>()

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
    forEvents(options) {
      return Effect.sync(() => {
        const beforeMillis = options.before.epochMillis
        return journal.filter((entry) => entry.createdAtMillis < beforeMillis && options.events.includes(entry.event))
      })
    },
    write({ effect, event, id, payload, primaryKey }) {
      return Effect.acquireUseRelease(
        Effect.sync(() =>
          new Entry({
            id: id ?? makeEntryId(),
            event,
            primaryKey,
            payload
          }, { disableValidation: true })
        ),
        effect,
        (entry, exit) =>
          Effect.suspend(() => {
            if (exit._tag === "Failure") return Effect.void
            journal.push(entry)
            byId.set(entry.idString, entry)
            remotes.forEach((remote) => {
              remote.missing.push(entry)
            })
            return pubsub.publish(entry)
          })
      )
    },
    writeEntries(entries) {
      return Effect.sync(() => {
        for (const entry of entries) {
          if (byId.has(entry.idString)) continue
          journal.push(entry)
          byId.set(entry.idString, entry)
          remotes.forEach((remote) => {
            remote.missing.push(entry)
          })
          pubsub.unsafeOffer(entry)
        }
      })
    },
    remove(ids) {
      return Effect.sync(() => {
        for (const id of ids) {
          const idString = Uuid.stringify(id)
          const entry = byId.get(idString)
          if (!entry) continue
          byId.delete(idString)
          const index = journal.indexOf(entry)
          if (index >= 0) {
            journal.splice(index, 1)
          }
          pubsubRemoval.unsafeOffer(entry.id)
        }
      })
    },
    writeFromRemote: (remoteId, remoteEntries) =>
      Effect.sync(() => {
        const remote = ensureRemote(remoteId)

        for (const remoteEntry of remoteEntries) {
          if (byId.has(remoteEntry.entry.idString)) continue

          const remoteEntryMillis = entryIdMillis(remoteEntry.entry.id)
          for (let i = journal.length - 1; i >= -1; i--) {
            const entry = journal[i]
            if (entry !== undefined && entry.createdAtMillis > remoteEntryMillis) {
              continue
            }
            journal.splice(i + 1, 0, remoteEntry.entry)

            const conflicts: Array<Entry> = []
            for (let j = i + 2; j < journal.length; j++) {
              const entry = journal[j]!
              if (entry.event === remoteEntry.entry.event && entry.primaryKey === remoteEntry.entry.primaryKey) {
                conflicts.push(entry)
              }
            }
            mailbox.unsafeOffer({ entry: remoteEntry.entry, conflicts })
            remote.sequence = remoteEntry.remoteSequence + 1
            break
          }
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
    changesRemote: mailbox,
    changes: PubSub.subscribe(pubsub),
    removals: PubSub.subscribe(pubsubRemoval),
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

    const mailbox = yield* Mailbox.make<{
      readonly entry: Entry
      readonly conflicts: Array<Entry>
    }>()
    const pubsub = yield* PubSub.unbounded<Entry>()
    const pubsubRemovals = yield* PubSub.unbounded<EntryId>()

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
      forEvents: ({ before, events }) =>
        Effect.async<ReadonlyArray<Entry>, EventJournalError>((resume) => {
          const tx = db.transaction("entries", "readonly")

          const entries: Array<Entry> = []
          tx.objectStore("entries").index("id").openCursor(null, "next").onsuccess = (event) => {
            const cursor = (event.target as any).result
            if (!cursor) return
            const timestamp = entryIdMillis(cursor.value.id)
            if (events.includes(cursor.value.event) && timestamp < before.epochMillis) {
              const entry = decodeEntryIdb(cursor.value)
              entries.push(entry)
            }
            cursor.continue()
          }

          tx.oncomplete = () => resume(Effect.succeed(entries))
          tx.onerror = () => resume(Effect.fail(new EventJournalError({ method: "forEvents", cause: tx.error })))
          return Effect.sync(() => tx.abort())
        }),
      write: ({ effect, event, id, payload, primaryKey }) =>
        Effect.uninterruptibleMask((restore) => {
          const entry = new Entry({
            id: id ?? makeEntryId(),
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
      writeEntries: (entries) =>
        Effect.async<void, EventJournalError>((resume) => {
          const tx = db.transaction("entries", "readwrite")
          const entriesStore = tx.objectStore("entries")
          for (const entry of entries) {
            entriesStore.put(encodeEntryIdb(entry)).onsuccess = () => {
              pubsub.unsafeOffer(entry)
            }
          }
          tx.oncomplete = () => {
            return resume(Effect.void)
          }
          tx.onerror = () => resume(Effect.fail(new EventJournalError({ method: "writeEntries", cause: tx.error })))
          return Effect.sync(() => tx.abort())
        }),
      remove: (ids) =>
        Effect.async<void, EventJournalError>((resume) => {
          const tx = db.transaction(["entries"], "readwrite")
          const entries = tx.objectStore("entries")
          for (const id of ids) {
            entries.get(id).onsuccess = (event) => {
              const entryEncoded = (event.target as any).result
              if (!entryEncoded) return
              const entry = decodeEntryIdb(entryEncoded)
              entries.delete(id)
              pubsubRemovals.unsafeOffer(entry.id)
            }
          }
          tx.oncomplete = () => resume(Effect.void)
          tx.onerror = () => resume(Effect.fail(new EventJournalError({ method: "remove", cause: tx.error })))
          return Effect.sync(() => tx.abort())
        }),
      writeFromRemote: (remoteId, remoteEntries) =>
        Effect.async<void, EventJournalError>((resume) => {
          const tx = db.transaction(["entries", "remotes"], "readwrite")
          const entries = tx.objectStore("entries")
          const remotes = tx.objectStore("remotes")
          const entriesWithConflicts: Array<{
            entry: Entry
            conflicts: Array<Entry>
          }> = []
          const iterator = remoteEntries[Symbol.iterator]()
          const handleNext = (state: IteratorResult<RemoteEntry, void>) => {
            if (state.done) return
            const remoteEntry = state.value
            const encodedEntry = encodeEntryIdb(state.value.entry)
            entries.get(encodedEntry.id).onsuccess = (event) => {
              handleNext(iterator.next())
              if ((event.target as any).result) return
              const item = {
                conflicts: [] as Array<Entry>,
                entry: remoteEntry.entry
              }
              entriesWithConflicts.push(item)
              entries.add(encodedEntry).onsuccess = () => {
                const cursorRequest = entries.index("id").openCursor(
                  IDBKeyRange.lowerBound(encodedEntry.id, true),
                  "next"
                )
                cursorRequest.onsuccess = () => {
                  const cursor = cursorRequest.result!
                  if (!cursor) return
                  const decodedEntry = decodeEntryIdb(cursor.value)
                  if (
                    decodedEntry.event === remoteEntry.entry.event &&
                    decodedEntry.primaryKey === remoteEntry.entry.primaryKey
                  ) {
                    item.conflicts.push(decodedEntry)
                  }
                  cursor.continue()
                }
              }
            }
            remotes.put({
              remoteId,
              entryId: remoteEntry.entry.id,
              sequence: remoteEntry.remoteSequence
            })
          }
          handleNext(iterator.next())
          tx.oncomplete = () => {
            mailbox.unsafeOfferAll(entriesWithConflicts)
            return resume(Effect.void)
          }
          tx.onerror = () => resume(Effect.fail(new EventJournalError({ method: "writeFromRemote", cause: tx.error })))
          return Effect.sync(() => tx.abort())
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
      changesRemote: mailbox,
      changes: PubSub.subscribe(pubsub),
      removals: PubSub.subscribe(pubsubRemovals),
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
