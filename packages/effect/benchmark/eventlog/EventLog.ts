import { Context, Effect, Exit, Layer, Queue, Schema, Scope } from "effect"
import * as EventGroup from "effect/eventlog/EventGroup"
import * as EventJournal from "effect/eventlog/EventJournal"
import * as EventLog from "effect/eventlog/EventLog"
import * as EventLogEncryption from "effect/eventlog/EventLogEncryption"
import * as EventLogMessage from "effect/eventlog/EventLogMessage"
import * as EventLogRemote from "effect/eventlog/EventLogRemote"
import * as EventLogServerUnencrypted from "effect/eventlog/EventLogServerUnencrypted"
import * as RpcTest from "effect/rpc/RpcTest"
import { cpus } from "node:os"
import { Bench } from "tinybench"

const Group = EventGroup.empty.add({
  tag: "Put",
  primaryKey: (payload) => payload.key,
  payload: Schema.Struct({ key: Schema.String, value: Schema.Number, label: Schema.String })
})
const Put = Group.events.Put
const encodePayload = Schema.encodeUnknownSync(Put.payloadSchemaBinary)
const storeId = EventLogMessage.StoreId.make("bench")

const makeEntry = (msecs: number, key: string, value: number) =>
  new EventJournal.Entry({
    id: EventJournal.makeEntryIdUnsafe({ msecs }),
    event: "Put",
    primaryKey: key,
    payload: encodePayload({ key, value, label: `label-${value}` }) as Uint8Array
  }, { disableChecks: true })

const makeEntries = (count: number, options: { readonly startMillis: number; readonly keys: number }) =>
  Array.from({ length: count }, (_, i) => makeEntry(options.startMillis + i, `key-${i % options.keys}`, i))

const toRemoteEntries = (entries: ReadonlyArray<EventJournal.Entry>) =>
  entries.map((entry, i) => new EventJournal.RemoteEntry({ remoteSequence: i, entry }, { disableChecks: true }))

const median = (values: Array<number>) => {
  const sorted = values.slice().sort((a, b) => a - b)
  return sorted[Math.floor(sorted.length / 2)]
}

// Builds fresh state outside the timed region for every sample.
const sample = async <S>(options: {
  readonly samples: number
  readonly setup: () => Promise<S>
  readonly run: (state: S) => Promise<void>
  readonly teardown?: (state: S) => Promise<void>
}) => {
  const times: Array<number> = []
  for (let i = 0; i < options.samples + 1; i++) {
    const state = await options.setup()
    const start = performance.now()
    await options.run(state)
    const elapsed = performance.now() - start
    if (i > 0) times.push(elapsed) // the first sample is warmup
    await options.teardown?.(state)
  }
  return median(times)
}

const fmtMs = (ms: number) => ms.toFixed(ms < 10 ? 2 : 1)
const perSecond = (count: number, ms: number) => Math.round(count / (ms / 1000)).toLocaleString("en-US")

console.log(`${process.platform} ${process.arch}; ${cpus()[0]?.model ?? "unknown CPU"}; Node ${process.version}`)

// What-if mode: memoize `Entry.idString` per instance without touching the
// source, to estimate the gain from caching the id string.
if (process.env.EVENTLOG_BENCH_CACHED_ID === "1") {
  const descriptor = Object.getOwnPropertyDescriptor(EventJournal.Entry.prototype, "idString")!
  const cache = new WeakMap<object, string>()
  Object.defineProperty(EventJournal.Entry.prototype, "idString", {
    configurable: true,
    get(this: EventJournal.Entry) {
      let id = cache.get(this)
      if (id === undefined) {
        id = descriptor.get!.call(this) as string
        cache.set(this, id)
      }
      return id
    }
  })
  console.log("EVENTLOG_BENCH_CACHED_ID=1: Entry.idString is memoized per instance")
}

// ---------------------------------------------------------------------------
// 1. Entry id stringification
// ---------------------------------------------------------------------------

{
  const entries = makeEntries(1_000, { startMillis: 1_000, keys: 1_000 })
  const cached = entries.map((entry) => entry.idString)
  let sink: unknown
  const bench = new Bench({ time: 500 })
  bench.add("entry.idString x1000", () => {
    for (let i = 0; i < entries.length; i++) sink = entries[i].idString
  })
  bench.add("precomputed string x1000 (cache baseline)", () => {
    for (let i = 0; i < cached.length; i++) sink = cached[i]
  })
  const byId = new Map(cached.map((id) => [id, true]))
  bench.add("Map.has(entry.idString) x1000", () => {
    for (let i = 0; i < entries.length; i++) sink = byId.has(entries[i].idString)
  })
  bench.add("Map.has(precomputed) x1000", () => {
    for (let i = 0; i < cached.length; i++) sink = byId.has(cached[i])
  })
  await bench.run()
  void sink
  console.log("\n1. Entry id stringification")
  console.table(bench.tasks.map((task) => {
    const result = task.result
    if (result?.state !== "completed") return { task: task.name, state: result?.state ?? "missing result" }
    // latency is in ms per 1000 calls, so ms * 1000 is ns per call.
    return {
      task: task.name,
      "µs / 1000 calls": (result.latency.mean * 1000).toFixed(1),
      "ns / call": (result.latency.mean * 1000).toFixed(0)
    }
  }))
}

// ---------------------------------------------------------------------------
// 2. Unencrypted server write: conflict detection against stored history
// ---------------------------------------------------------------------------

// The client side is the public unencrypted `EventLogRemote`, so the session
// handshake goes through the real code path.
const makeServerRemote = (storage: EventLogServerUnencrypted.Storage["Service"]) =>
  Effect.gen(function*() {
    const serverRegistry = yield* EventLog.Registry.pipe(Effect.provide(EventLog.layerRegistry))
    serverRegistry.registerHandlerUnsafe({
      event: Put.tag,
      handler: { event: Put, context: Context.empty() as Context.Context<any>, handler: () => Effect.void }
    })
    const client = yield* RpcTest.makeClient(EventLogMessage.EventLogRemoteRpcs).pipe(
      Effect.provide(EventLogServerUnencrypted.layerRpcHandlers.pipe(
        Layer.provide(Layer.succeed(EventLogServerUnencrypted.Storage, storage)),
        Layer.provide(Layer.succeed(EventLog.Registry, serverRegistry)),
        Layer.provide(Layer.succeed(EventLogServerUnencrypted.StoreMapping, {
          resolve: ({ storeId }) => Effect.succeed(storeId),
          hasStore: () => Effect.succeed(true)
        })),
        Layer.provide(Layer.succeed(EventLogServerUnencrypted.EventLogServerAuthorization, {
          authorizeWrite: () => Effect.void,
          authorizeRead: () => Effect.void,
          authorizeIdentity: () => Effect.void
        }))
      ))
    )
    const remote = yield* EventLogRemote.makeUnencrypted.pipe(
      Effect.provideService(EventLogRemote.EventLogRemoteClient, client),
      Effect.provide(EventLog.layerRegistry)
    )
    const identity = yield* EventLog.makeIdentity
    // Authenticate outside the timed region.
    yield* remote.whenAuthenticated(Effect.void).pipe(Effect.provideService(EventLog.Identity, identity))
    return { remote, identity }
  }).pipe(Effect.provide(EventLogEncryption.layerSubtle))

const serverCases: ReadonlyArray<{ incoming: number; history: number }> = [
  { incoming: 100, history: 1_000 },
  { incoming: 100, history: 10_000 },
  { incoming: 1_000, history: 1_000 },
  { incoming: 1_000, history: 5_000 }
]

{
  const rows: Array<Record<string, string | number>> = []
  for (const { history, incoming } of serverCases) {
    const historyEntries = makeEntries(history, { startMillis: 1_000_000, keys: 500 })
    for (const placement of ["older than history", "newer than history"] as const) {
      const incomingEntries = () =>
        makeEntries(incoming, {
          startMillis: placement === "older than history" ? 1_000 : 10_000_000,
          keys: 500
        })
      const ms = await sample({
        samples: 3,
        setup: () =>
          Effect.runPromise(
            Effect.gen(function*() {
              const scope = Scope.makeUnsafe()
              const storage = yield* EventLogServerUnencrypted.makeStorageMemory.pipe(Scope.provide(scope))
              yield* storage.write(storeId, historyEntries)
              const { identity, remote } = yield* makeServerRemote(storage).pipe(Scope.provide(scope))
              return { remote, identity, entries: incomingEntries(), scope }
            })
          ),
        run: ({ entries, identity, remote }) => Effect.runPromise(remote.write({ identity, storeId, entries })),
        teardown: ({ scope }) => Effect.runPromise(Scope.close(scope, Exit.void))
      })
      console.error(`  server ${incoming}x${history} ${placement}: ${fmtMs(ms)} ms`)
      rows.push({
        incoming,
        history,
        placement,
        "median ms": fmtMs(ms),
        "entries/s": perSecond(incoming, ms)
      })
    }
  }
  console.log("\n2. Unencrypted EventLogRemote.write to the server (RpcTest, memory storage, no-op handler)")
  console.log("   'older' makes toConflicts scan the full history for every incoming entry.")
  console.table(rows)
}

// ---------------------------------------------------------------------------
// 3. Client replay throughput
// ---------------------------------------------------------------------------

const replaySizes = [1_000, 10_000, 50_000]

const decodeBench = async () => {
  const rows: Array<Record<string, string | number>> = []
  const encryption = await Effect.runPromise(EventLogEncryption.makeEncryptionSubtle(globalThis.crypto))
  const identity = await Effect.runPromise(encryption.generateIdentity)
  for (const size of replaySizes) {
    const entries = makeEntries(size, { startMillis: 1_000, keys: size })
    const remoteEntries = toRemoteEntries(entries)
    const unencrypted = await Effect.runPromise(
      ChangesRpcEncode.unencrypted(remoteEntries)
    )
    const encrypted = await Effect.runPromise(Effect.gen(function*() {
      const parts = yield* encryption.encrypt(identity, entries)
      return yield* ChangesRpcEncode.encrypted(parts.map((part, i) => ({
        sequence: i,
        entryId: entries[i].id,
        iv: part.iv,
        encryptedEntry: part.encryptedEntry
      })))
    }))
    const unencryptedMs = await sample({
      samples: 5,
      setup: async () => undefined,
      run: () => Effect.runPromise(Effect.asVoid(EventLogMessage.ChangesRpc.decodeUnencrypted(unencrypted)))
    })
    const frameMs = await sample({
      samples: 5,
      setup: async () => undefined,
      run: () => Effect.runPromise(Effect.asVoid(EventLogMessage.ChangesRpc.decodeEncrypted(encrypted)))
    })
    const decryptMs = await sample({
      samples: 5,
      setup: () => Effect.runPromise(EventLogMessage.ChangesRpc.decodeEncrypted(encrypted)),
      run: (parts) => Effect.runPromise(Effect.asVoid(encryption.decrypt(identity, parts)))
    })
    const aesOnlyMs = await sample({
      samples: 5,
      setup: async () => {
        // Same plaintexts as `encrypt`, under a standalone key.
        const key = await globalThis.crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, false, [
          "encrypt",
          "decrypt"
        ])
        const plaintexts = await Effect.runPromise(EventJournal.Entry.encodeArray(entries))
        const parts = await Promise.all(plaintexts.map(async (plaintext) => {
          const iv = globalThis.crypto.getRandomValues(new Uint8Array(12))
          const encryptedEntry = new Uint8Array(
            await globalThis.crypto.subtle.encrypt({ name: "AES-GCM", iv, tagLength: 128 }, key, plaintext.slice())
          )
          return { iv, encryptedEntry }
        }))
        return { parts, key }
      },
      run: async ({ key, parts }) => {
        await Promise.all(parts.map((part) =>
          globalThis.crypto.subtle.decrypt(
            { name: "AES-GCM", iv: part.iv, tagLength: 128 },
            key,
            part.encryptedEntry
          )
        ))
      }
    })
    rows.push({
      entries: size,
      "unencrypted frame decode ms": fmtMs(unencryptedMs),
      "encrypted frame decode ms": fmtMs(frameMs),
      "decrypt + Entry decode ms": fmtMs(decryptMs),
      "of which AES-GCM ms": fmtMs(aesOnlyMs),
      "frame KB (unenc / enc)": `${(unencrypted.byteLength / 1024).toFixed(0)} / ${
        (encrypted.byteLength / 1024).toFixed(0)
      }`
    })
  }
  console.log("\n3a. Change-frame decoding on the client")
  console.table(rows)
}

const ChangesRpcEncode = {
  unencrypted: (entries: ReadonlyArray<EventJournal.RemoteEntry>) =>
    EventLogMessage.ChangesRpc.encodeUnencrypted(entries as any).pipe(
      Effect.map((data) => data.slice()) // copy out of the shared encoder arena
    ),
  encrypted: (entries: ReadonlyArray<EventLogEncryption.EncryptedRemoteEntry>) =>
    EventLogMessage.ChangesRpc.encodeEncrypted(entries as any).pipe(
      Effect.map((data) => data.slice())
    )
}

// Drives the real EventLog runtime with a remote whose change queue already
// holds the whole backlog, so `runRemote` receives it as one batch, the same
// as a single backlog frame from the server.
const replayEndToEnd = async (options: {
  readonly size: number
  readonly conflicts: boolean
}) => {
  const remoteEntries = toRemoteEntries(
    makeEntries(options.size, { startMillis: 1_000, keys: options.conflicts ? 100 : options.size })
  )
  // Stored entries that are newer than the batch, on the same keys.
  const stored = options.conflicts ? makeEntries(1_000, { startMillis: 10_000_000, keys: 100 }) : []
  let replayed = 0
  let done!: () => void

  const HandlersLayer = EventLog.group(Group, (handlers) =>
    handlers.handle("Put", () =>
      Effect.sync(() => {
        if (++replayed === options.size) done()
      })))

  return sample({
    samples: 5,
    setup: () =>
      Effect.runPromise(Effect.gen(function*() {
        replayed = 0
        const journal = yield* EventJournal.makeMemory
        if (stored.length > 0) {
          yield* journal.writeFromRemote({
            remoteId: EventJournal.makeRemoteIdUnsafe(),
            entries: toRemoteEntries(stored),
            effect: () => Effect.void
          })
        }
        const identity = yield* EventLog.makeIdentity.pipe(Effect.provide(EventLogEncryption.layerSubtle))
        return { journal, identity }
      })),
    run: ({ identity, journal }) =>
      Effect.runPromise(
        Effect.gen(function*() {
          const context = yield* Layer.build(
            EventLog.layer(EventLog.schema(Group), HandlersLayer).pipe(
              Layer.provide(Layer.succeed(EventJournal.EventJournal, journal)),
              Layer.provide(Layer.succeed(EventLog.Identity, identity))
            )
          )
          const registry = Context.get(context, EventLog.Registry)
          const finished = new Promise<void>((resolve) => {
            done = resolve
          })
          yield* registry.registerRemote(EventLogRemote.EventLogRemote.of({
            id: EventJournal.makeRemoteIdUnsafe(),
            changes: () =>
              Effect.gen(function*() {
                const queue = yield* Queue.make<EventJournal.RemoteEntry, EventLogRemote.EventLogRemoteError>()
                yield* Queue.offerAll(queue, remoteEntries)
                return queue
              }),
            write: () => Effect.void,
            whenAuthenticated: (effect) => effect
          }))
          yield* Effect.promise(() => finished)
        }).pipe(Effect.scoped)
      )
  })
}

const journalOnly = (size: number) => {
  const remoteEntries = toRemoteEntries(makeEntries(size, { startMillis: 1_000, keys: size }))
  return sample({
    samples: 5,
    setup: () => Effect.runPromise(EventJournal.makeMemory),
    run: (journal) =>
      Effect.runPromise(Effect.asVoid(journal.writeFromRemote({
        remoteId: EventJournal.makeRemoteIdUnsafe(),
        entries: remoteEntries,
        effect: () => Effect.void
      })))
  })
}

await decodeBench()

{
  const rows: Array<Record<string, string | number>> = []
  for (const size of replaySizes) {
    const journalMs = await journalOnly(size)
    const replayMs = await replayEndToEnd({ size, conflicts: false })
    const conflictMs = await replayEndToEnd({ size, conflicts: true })
    rows.push({
      entries: size,
      "journal.writeFromRemote only ms": fmtMs(journalMs),
      "EventLog replay ms": fmtMs(replayMs),
      "EventLog replay entries/s": perSecond(size, replayMs),
      "with conflicts ms": fmtMs(conflictMs),
      "with conflicts entries/s": perSecond(size, conflictMs)
    })
  }
  console.log("\n3b. EventLog remote replay (memory journal, no-op handler, one batch)")
  console.log("   'with conflicts': 100 keys, 1000 stored entries newer than the batch.")
  console.table(rows)
}
