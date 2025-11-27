/**
 * @since 1.0.0
 */
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as FiberHandle from "effect/FiberHandle"
import { dual } from "effect/Function"
import * as Hash from "effect/Hash"
import * as Layer from "effect/Layer"
import * as Mailbox from "effect/Mailbox"
import type { ReadonlyRecord } from "effect/Record"
import * as Scope from "effect/Scope"
import * as Stream from "effect/Stream"

/**
 * @since 1.0.0
 * @category tags
 */
export class Reactivity extends Context.Tag("@effect/experimental/Reactivity")<
  Reactivity,
  Reactivity.Service
>() {}

/**
 * @since 1.0.0
 * @category constructors
 */
export const make = Effect.sync(() => {
  const handlers = new Map<number | string, Set<() => void>>()

  const unsafeInvalidate = (keys: ReadonlyArray<unknown> | ReadonlyRecord<string, ReadonlyArray<unknown>>): void => {
    if (Array.isArray(keys)) {
      for (let i = 0; i < keys.length; i++) {
        const set = handlers.get(stringOrHash(keys[i]))
        if (set === undefined) continue
        for (const run of set) run()
      }
    } else {
      const record = keys as ReadonlyRecord<string, Array<unknown>>
      for (const key in record) {
        const hashes = idHashes(key, record[key])
        for (let i = 0; i < hashes.length; i++) {
          const set = handlers.get(hashes[i])
          if (set === undefined) continue
          for (const run of set) run()
        }

        const set = handlers.get(key)
        if (set !== undefined) {
          for (const run of set) run()
        }
      }
    }
  }

  const invalidate = (
    keys: ReadonlyArray<unknown> | ReadonlyRecord<string, ReadonlyArray<unknown>>
  ): Effect.Effect<void> => Effect.sync(() => unsafeInvalidate(keys))

  const mutation = <A, E, R>(
    keys: ReadonlyArray<unknown> | ReadonlyRecord<string, ReadonlyArray<unknown>>,
    effect: Effect.Effect<A, E, R>
  ): Effect.Effect<A, E, R> => Effect.zipLeft(effect, invalidate(keys))

  const unsafeRegister = (
    keys: ReadonlyArray<unknown> | ReadonlyRecord<string, ReadonlyArray<unknown>>,
    handler: () => void
  ): () => void => {
    const resolvedKeys = Array.isArray(keys) ? keys.map(stringOrHash) : recordHashes(keys as any)
    for (let i = 0; i < resolvedKeys.length; i++) {
      let set = handlers.get(resolvedKeys[i])
      if (set === undefined) {
        set = new Set()
        handlers.set(resolvedKeys[i], set)
      }
      set.add(handler)
    }
    return () => {
      for (let i = 0; i < resolvedKeys.length; i++) {
        const set = handlers.get(resolvedKeys[i])!
        set.delete(handler)
        if (set.size === 0) {
          handlers.delete(resolvedKeys[i])
        }
      }
    }
  }

  const query = <A, E, R>(
    keys: ReadonlyArray<unknown> | ReadonlyRecord<string, ReadonlyArray<unknown>>,
    effect: Effect.Effect<A, E, R>
  ): Effect.Effect<Mailbox.ReadonlyMailbox<A, E>, never, R | Scope.Scope> =>
    Effect.gen(function*() {
      const scope = yield* Effect.scope
      const results = yield* Mailbox.make<A, E>()
      const runFork = yield* FiberHandle.makeRuntime<R>()

      let running = false
      let pending = false
      const handleExit = (exit: Exit.Exit<A, E>) => {
        if (exit._tag === "Failure") {
          results.unsafeDone(Exit.failCause(exit.cause))
        } else {
          results.unsafeOffer(exit.value)
        }
        if (pending) {
          pending = false
          runFork(effect).addObserver(handleExit)
        } else {
          running = false
        }
      }

      function run() {
        if (running) {
          pending = true
          return
        }
        running = true
        runFork(effect).addObserver(handleExit)
      }

      const cancel = unsafeRegister(keys, run)
      yield* Scope.addFinalizer(scope, Effect.sync(cancel))
      run()

      return results as Mailbox.ReadonlyMailbox<A, E>
    })

  const stream = <A, E, R>(
    tables: ReadonlyArray<unknown> | ReadonlyRecord<string, ReadonlyArray<unknown>>,
    effect: Effect.Effect<A, E, R>
  ): Stream.Stream<A, E, Exclude<R, Scope.Scope>> =>
    query(tables, effect).pipe(
      Effect.map(Mailbox.toStream),
      Stream.unwrapScoped
    )

  return Reactivity.of({ mutation, query, stream, unsafeInvalidate, invalidate, unsafeRegister })
})

/**
 * @since 1.0.0
 * @category accessors
 */
export const mutation: {
  (
    keys: ReadonlyArray<unknown> | ReadonlyRecord<string, ReadonlyArray<unknown>>
  ): <A, E, R>(effect: Effect.Effect<A, E, R>) => Effect.Effect<A, E, R | Reactivity>
  <A, E, R>(
    effect: Effect.Effect<A, E, R>,
    keys: ReadonlyArray<unknown> | ReadonlyRecord<string, ReadonlyArray<unknown>>
  ): Effect.Effect<A, E, R | Reactivity>
} = dual(2, <A, E, R>(
  effect: Effect.Effect<A, E, R>,
  keys: ReadonlyArray<unknown> | ReadonlyRecord<string, ReadonlyArray<unknown>>
): Effect.Effect<A, E, R | Reactivity> => Effect.flatMap(Reactivity, (r) => r.mutation(keys, effect)))

/**
 * @since 1.0.0
 * @category accessors
 */
export const query: {
  (
    keys: ReadonlyArray<unknown> | ReadonlyRecord<string, ReadonlyArray<unknown>>
  ): <A, E, R>(
    effect: Effect.Effect<A, E, R>
  ) => Effect.Effect<Mailbox.ReadonlyMailbox<A, E>, never, R | Scope.Scope | Reactivity>
  <A, E, R>(
    effect: Effect.Effect<A, E, R>,
    keys: ReadonlyArray<unknown> | ReadonlyRecord<string, ReadonlyArray<unknown>>
  ): Effect.Effect<Mailbox.ReadonlyMailbox<A, E>, never, R | Scope.Scope | Reactivity>
} = dual(2, <A, E, R>(
  effect: Effect.Effect<A, E, R>,
  keys: ReadonlyArray<unknown> | ReadonlyRecord<string, ReadonlyArray<unknown>>
): Effect.Effect<Mailbox.ReadonlyMailbox<A, E>, never, R | Scope.Scope | Reactivity> =>
  Effect.flatMap(Reactivity, (r) => r.query(keys, effect)))

/**
 * @since 1.0.0
 * @category accessors
 */
export const stream: {
  (
    keys: ReadonlyArray<unknown> | ReadonlyRecord<string, ReadonlyArray<unknown>>
  ): <A, E, R>(effect: Effect.Effect<A, E, R>) => Stream.Stream<A, E, Exclude<R, Scope.Scope> | Reactivity>
  <A, E, R>(
    effect: Effect.Effect<A, E, R>,
    keys: ReadonlyArray<unknown> | ReadonlyRecord<string, ReadonlyArray<unknown>>
  ): Stream.Stream<A, E, Exclude<R, Scope.Scope> | Reactivity>
} = dual(2, <A, E, R>(
  effect: Effect.Effect<A, E, R>,
  keys: ReadonlyArray<unknown> | ReadonlyRecord<string, ReadonlyArray<unknown>>
): Stream.Stream<A, E, Exclude<R, Scope.Scope> | Reactivity> =>
  Reactivity.pipe(
    Effect.flatMap((r) => r.query(keys, effect)),
    Effect.map(Mailbox.toStream),
    Stream.unwrapScoped
  ))

/**
 * @since 1.0.0
 * @category accessors
 */
export const invalidate = (
  keys: ReadonlyArray<unknown> | ReadonlyRecord<string, ReadonlyArray<unknown>>
): Effect.Effect<void, never, Reactivity> => Effect.flatMap(Reactivity, (r) => r.invalidate(keys))

/**
 * @since 1.0.0
 * @category layers
 */
export const layer: Layer.Layer<Reactivity> = Layer.scoped(Reactivity, make)

/**
 * @since 1.0.0
 * @category model
 */
export declare namespace Reactivity {
  /**
   * @since 1.0.0
   * @category model
   */
  export interface Service {
    readonly unsafeInvalidate: (keys: ReadonlyArray<unknown> | ReadonlyRecord<string, ReadonlyArray<unknown>>) => void
    readonly unsafeRegister: (
      keys: ReadonlyArray<unknown> | ReadonlyRecord<string, ReadonlyArray<unknown>>,
      handler: () => void
    ) => () => void
    readonly invalidate: (
      keys: ReadonlyArray<unknown> | ReadonlyRecord<string, ReadonlyArray<unknown>>
    ) => Effect.Effect<void>
    readonly mutation: <A, E, R>(
      keys: ReadonlyArray<unknown> | ReadonlyRecord<string, ReadonlyArray<unknown>>,
      effect: Effect.Effect<A, E, R>
    ) => Effect.Effect<A, E, R>
    readonly query: <A, E, R>(
      keys: ReadonlyArray<unknown> | ReadonlyRecord<string, ReadonlyArray<unknown>>,
      effect: Effect.Effect<A, E, R>
    ) => Effect.Effect<Mailbox.ReadonlyMailbox<A, E>, never, R | Scope.Scope>
    readonly stream: <A, E, R>(
      keys: ReadonlyArray<unknown> | ReadonlyRecord<string, ReadonlyArray<unknown>>,
      effect: Effect.Effect<A, E, R>
    ) => Stream.Stream<A, E, Exclude<R, Scope.Scope>>
  }
}

function stringOrHash(u: unknown): string | number {
  return typeof u === "string" ? u : Hash.hash(u)
}

const idHashes = (keyHash: number | string, ids: ReadonlyArray<unknown>): ReadonlyArray<string> => {
  const hashes: Array<string> = new Array(ids.length)
  for (let i = 0; i < ids.length; i++) {
    hashes[i] = `${keyHash}:${stringOrHash(ids[i])}`
  }
  return hashes
}

const recordHashes = (record: ReadonlyRecord<string, ReadonlyArray<unknown>>): ReadonlyArray<string> => {
  const hashes: Array<string> = []
  for (const key in record) {
    hashes.push(key)
    for (const idHash of idHashes(key, record[key])) {
      hashes.push(idHash)
    }
  }
  return hashes
}
