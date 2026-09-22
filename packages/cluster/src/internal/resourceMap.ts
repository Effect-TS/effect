import * as Context from "effect/Context"
import * as Deferred from "effect/Deferred"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as MutableHashMap from "effect/MutableHashMap"
import * as MutableRef from "effect/MutableRef"
import * as Scope from "effect/Scope"

export class ResourceMap<K, A, E> {
  constructor(
    readonly lookup: (key: K, scope: Scope.Scope) => Effect.Effect<A, E>,
    readonly entries: BackingMap<K, A, E>,
    readonly isClosed: MutableRef.MutableRef<boolean>
  ) {}

  static make = Effect.fnUntraced(function*<K, A, E, R>(lookup: (key: K) => Effect.Effect<A, E, R>, options?: {
    readonly referential?: boolean | undefined
  }) {
    const scope = yield* Effect.scope
    const context = yield* Effect.context<R>()
    const isClosed = MutableRef.make(false)

    const entries: BackingMap<K, A, E> = options?.referential
      ? { _tag: "Referential", map: new Map() }
      : { _tag: "Equal", map: MutableHashMap.empty() }

    yield* Scope.addFinalizerExit(
      scope,
      (exit) => {
        MutableRef.set(isClosed, true)
        return Effect.forEach(entries.map, ([key, { scope }]) => {
          backingDelete(entries, key)
          return Effect.exit(Scope.close(scope, exit))
        }, { concurrency: "unbounded", discard: true })
      }
    )

    return new ResourceMap(
      (key, scope) => Effect.provide(lookup(key), Context.add(context, Scope.Scope, scope)),
      entries,
      isClosed
    )
  })

  get(key: K): Effect.Effect<A, E> {
    return Effect.withFiberRuntime((fiber) => {
      if (MutableRef.get(this.isClosed)) {
        return Effect.interrupt
      }
      const existing = backingGet(this.entries, key)
      if (existing) {
        return Deferred.await(existing.deferred)
      }
      const scope = Effect.runSync(Scope.make())
      const deferred = Deferred.unsafeMake<A, E>(fiber.id())
      backingSet(this.entries, key, { scope, deferred })
      return Effect.onExit(this.lookup(key, scope), (exit) => {
        if (exit._tag === "Success") {
          return Deferred.done(deferred, exit)
        }
        backingDelete(this.entries, key)
        return Deferred.done(deferred, exit)
      })
    })
  }

  remove(key: K): Effect.Effect<void> {
    return Effect.suspend(() => {
      const entry = backingGet(this.entries, key)
      if (!entry) {
        return Effect.void
      }
      backingDelete(this.entries, key)
      return Scope.close(entry.scope, Exit.void)
    })
  }

  removeIgnore(key: K): Effect.Effect<void> {
    return Effect.catchAllCause(this.remove(key), (cause) =>
      Effect.annotateLogs(Effect.logDebug(cause), {
        module: "ResourceMap",
        method: "removeIgnore",
        key
      }))
  }
}

type BackingMap<K, A, E> = {
  readonly _tag: "Equal"
  readonly map: MutableHashMap.MutableHashMap<K, Entry<A, E>>
} | {
  readonly _tag: "Referential"
  readonly map: Map<K, Entry<A, E>>
}

type Entry<A, E> = {
  readonly scope: Scope.CloseableScope
  readonly deferred: Deferred.Deferred<A, E>
}

const backingGet = <K, A, E>(map: BackingMap<K, A, E>, key: K): Entry<A, E> | undefined => {
  if (map._tag === "Referential") {
    return map.map.get(key)
  }
  const entry = MutableHashMap.get(map.map, key)
  return entry._tag === "Some" ? entry.value : undefined
}

const backingSet = <K, A, E>(map: BackingMap<K, A, E>, key: K, entry: Entry<A, E>): void => {
  if (map._tag === "Referential") {
    map.map.set(key, entry)
  } else {
    MutableHashMap.set(map.map, key, entry)
  }
}

const backingDelete = <K, A, E>(map: BackingMap<K, A, E>, key: K): void => {
  if (map._tag === "Referential") {
    map.map.delete(key)
  } else {
    MutableHashMap.remove(map.map, key)
  }
}
