import * as Context from "../../Context.ts"
import * as Data from "../../Data.ts"
import * as Effect from "../../Effect.ts"
import { constFalse } from "../../Function.ts"
import type * as Option from "../../Option.ts"
import * as Semaphore from "../../Semaphore.ts"
import * as Stream from "../../Stream.ts"
import type { Entry } from "../EventJournal.ts"
import type { Registry } from "../EventLog.ts"

/**
 * Set while a compactor runs for a remote compaction. Library compactors then
 * decode strictly and forward every entry they cannot decode.
 */
export const RemoteMode = Context.Reference<boolean>("effect/eventlog/internal/remoteCompaction/RemoteMode", {
  defaultValue: constFalse
})

/** A second pass over the kept set dropped `entries`, so a compactor does not compose. */
export class IdempotenceError extends Data.TaggedError("IdempotenceError")<{
  readonly entries: ReadonlyArray<Entry>
}> {}

type Compactor = Registry["Service"]["compactors"] extends ReadonlyMap<string, infer A> ? A : never

/**
 * Folds the opted-in compactors over `entries`, given in input-sequence order
 * without repeated ids, `chunkSize` entries at a time. Returns the kept input
 * entries in input order.
 *
 * Fails with `IdempotenceError` when another pass over the kept set drops
 * more. A compactor defect fails the run.
 */
export const run = <E, R>(options: {
  readonly compactors: Registry["Service"]["compactors"]
  readonly entries: Stream.Stream<Entry, E, R>
  readonly chunkSize: number
}): Effect.Effect<ReadonlyArray<Entry>, E | IdempotenceError, R> => {
  const drop = Effect.fnUntraced(function*(entries: ReadonlyArray<Entry>) {
    const kept = new Set<Entry>()
    const calls = new Map<Compactor, Array<Entry>>()
    for (const entry of entries) {
      const compactor = options.compactors.get(entry.event)
      if (compactor === undefined || !compactor.remote) {
        kept.add(entry)
        continue
      }
      const input = calls.get(compactor)
      if (input === undefined) calls.set(compactor, [entry])
      else input.push(entry)
    }
    for (const [compactor, input] of calls) {
      const inputs = new Set(input)
      const forwarded = new Set<Entry>()
      let replaced = false
      yield* compactor.effect({
        entries: input,
        write: (entry) =>
          Effect.sync(() => {
            if (inputs.has(entry)) forwarded.add(entry)
            else replaced = true
          })
      }).pipe(Effect.provideService(RemoteMode, true))
      // Only forwarded input entries can be kept verbatim, so a call that
      // outputs anything else keeps its whole input.
      if (replaced) {
        yield* Effect.logWarning("A remote compactor wrote an entry it was not given, so its input is kept").pipe(
          Effect.annotateLogs({ events: [...compactor.events] })
        )
      }
      for (const entry of replaced ? input : forwarded) kept.add(entry)
    }
    return entries.filter((entry) => kept.has(entry))
  })

  return Effect.gen(function*() {
    let kept: ReadonlyArray<Entry> = []
    yield* options.entries.pipe(
      Stream.grouped(options.chunkSize),
      Stream.runForEach((chunk) =>
        Effect.map(drop([...kept, ...chunk]), (next) => {
          kept = next
        })
      )
    )
    const again = yield* drop(kept)
    if (again.length !== kept.length) {
      const survivors = new Set(again)
      return yield* new IdempotenceError({ entries: kept.filter((entry) => !survivors.has(entry)) })
    }
    return kept
  })
}

const deviceLocks = new WeakMap<object, Map<string, Semaphore.Semaphore>>()

/**
 * Runs `effect` holding the device lock `key`, or returns `None` without
 * running it when another run holds the lock. Browsers use Web Locks, as the
 * IndexedDB journal does, so tabs share the lock. Elsewhere the lock is shared
 * by everything using the same `journal`.
 */
export const withDeviceLock = (journal: object, key: string) =>
<A, E, R>(
  effect: Effect.Effect<A, E, R>
): Effect.Effect<Option.Option<A>, E, R> => {
  if (typeof navigator !== "undefined" && "locks" in navigator) {
    return Effect.callback<Option.Option<A>, E, R>((resume, signal) => {
      navigator.locks.request(key, { ifAvailable: true }, (lock) => {
        if (lock === null) return resume(Effect.succeedNone)
        // An interrupted caller never runs `effect`, so the lock is released now.
        if (signal.aborted) return
        return new Promise<void>((resolve) => {
          resume(Effect.onExit(Effect.asSome(effect), () => Effect.sync(resolve)))
        })
      }).catch((defect) => resume(Effect.die(defect)))
    })
  }
  let locks = deviceLocks.get(journal)
  if (locks === undefined) {
    locks = new Map()
    deviceLocks.set(journal, locks)
  }
  let semaphore = locks.get(key)
  if (semaphore === undefined) {
    semaphore = Semaphore.makeUnsafe(1)
    locks.set(key, semaphore)
  }
  return semaphore.withPermitsIfAvailable(1)(effect)
}
