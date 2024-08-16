import * as Context from "effect/Context"
import * as Deferred from "effect/Deferred"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as MutableHashMap from "effect/MutableHashMap"
import * as MutableRef from "effect/MutableRef"
import * as Option from "effect/Option"
import * as Scope from "effect/Scope"

export class ResourceMap<K, A, E> {
  constructor(
    readonly lookup: (key: K, scope: Scope.Scope) => Effect.Effect<A, E>,
    readonly entries: MutableHashMap.MutableHashMap<K, {
      readonly scope: Scope.CloseableScope
      readonly deferred: Deferred.Deferred<A, E>
    }>,
    readonly isClosed: MutableRef.MutableRef<boolean>
  ) {}

  static make = Effect.fnUntraced(function*<K, A, E, R>(lookup: (key: K) => Effect.Effect<A, E, R>) {
    const scope = yield* Effect.scope
    const context = yield* Effect.context<R>()
    const isClosed = MutableRef.make(false)

    const entries = MutableHashMap.empty<K, {
      scope: Scope.CloseableScope
      deferred: Deferred.Deferred<A, E>
    }>()

    yield* Scope.addFinalizerExit(
      scope,
      (exit) => {
        MutableRef.set(isClosed, true)
        return Effect.forEach(entries, ([key, { scope }]) => {
          MutableHashMap.remove(entries, key)
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
      const existing = MutableHashMap.get(this.entries, key)
      if (Option.isSome(existing)) {
        return Deferred.await(existing.value.deferred)
      }
      const scope = Effect.runSync(Scope.make())
      const deferred = Deferred.unsafeMake<A, E>(fiber.id())
      MutableHashMap.set(this.entries, key, { scope, deferred })
      return Effect.onExit(this.lookup(key, scope), (exit) => {
        if (exit._tag === "Success") {
          return Deferred.done(deferred, exit)
        }
        MutableHashMap.remove(this.entries, key)
        return Deferred.done(deferred, exit)
      })
    })
  }

  remove(key: K): Effect.Effect<void> {
    return Effect.suspend(() => {
      const entry = MutableHashMap.get(this.entries, key)
      if (Option.isNone(entry)) {
        return Effect.void
      }
      MutableHashMap.remove(this.entries, key)
      return Scope.close(entry.value.scope, Exit.void)
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
