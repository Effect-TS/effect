/**
 * @since 1.0.0
 */
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as FiberHandle from "effect/FiberHandle"
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
  const handlers = new Map<number, Set<() => void>>()

  const unsafeInvalidate = (keys: ReadonlyArray<unknown> | ReadonlyRecord<string, Array<unknown>>): void => {
    if (Array.isArray(keys)) {
      for (let i = 0; i < keys.length; i++) {
        const set = handlers.get(Hash.hash(keys[i]))
        if (set === undefined) continue
        for (const run of set) run()
      }
    } else {
      const record = keys as ReadonlyRecord<string, Array<unknown>>
      for (const key in record) {
        const keyHash = Hash.string(key)
        const hashes = idHashes(keyHash, record[key])
        for (let i = 0; i < hashes.length; i++) {
          const set = handlers.get(hashes[i])
          if (set === undefined) continue
          for (const run of set) run()
        }

        const set = handlers.get(keyHash)
        if (set !== undefined) {
          for (const run of set) run()
        }
      }
    }
  }

  const invalidate = (keys: ReadonlyArray<unknown> | ReadonlyRecord<string, Array<unknown>>): Effect.Effect<void> =>
    Effect.sync(() => unsafeInvalidate(keys))

  const mutation = <A, E, R>(
    keys: ReadonlyArray<unknown> | ReadonlyRecord<string, Array<unknown>>,
    effect: Effect.Effect<A, E, R>
  ): Effect.Effect<A, E, R> => Effect.ensuring(effect, invalidate(keys))

  const query = <A, E, R>(
    keys: ReadonlyArray<unknown> | ReadonlyRecord<string, Array<unknown>>,
    effect: Effect.Effect<A, E, R>
  ): Effect.Effect<Mailbox.ReadonlyMailbox<A, E>, never, R | Scope.Scope> =>
    Effect.gen(function*() {
      const resolvedKeys = Array.isArray(keys) ? keys.map(Hash.hash) : recordHashes(keys as any)
      const scope = yield* Effect.scope
      const results = yield* Mailbox.make<A, E>()
      const runFork = yield* FiberHandle.makeRuntime<R>()

      const run = () => {
        runFork(effect).addObserver((exit) => {
          if (exit._tag === "Failure") {
            results.unsafeDone(exit)
          } else {
            results.unsafeOffer(exit.value)
          }
        })
      }

      yield* Scope.addFinalizer(
        scope,
        Effect.sync(() => {
          for (let i = 0; i < resolvedKeys.length; i++) {
            const set = handlers.get(resolvedKeys[i])!
            set.delete(run)
            if (set.size === 0) {
              handlers.delete(resolvedKeys[i])
            }
          }
        })
      )
      for (let i = 0; i < resolvedKeys.length; i++) {
        let set = handlers.get(resolvedKeys[i])
        if (set === undefined) {
          set = new Set()
          handlers.set(resolvedKeys[i], set)
        }
        set.add(run)
      }

      run()

      return results as Mailbox.ReadonlyMailbox<A, E>
    })

  const stream = <A, E, R>(
    tables: ReadonlyArray<unknown> | ReadonlyRecord<string, Array<unknown>>,
    effect: Effect.Effect<A, E, R>
  ): Stream.Stream<A, E, Exclude<R, Scope.Scope>> =>
    query(tables, effect).pipe(
      Effect.map(Mailbox.toStream),
      Stream.unwrapScoped
    )

  return Reactivity.of({ mutation, query, stream, unsafeInvalidate, invalidate })
})

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
    readonly unsafeInvalidate: (keys: ReadonlyArray<unknown> | ReadonlyRecord<string, Array<unknown>>) => void
    readonly invalidate: (
      keys: ReadonlyArray<unknown> | ReadonlyRecord<string, Array<unknown>>
    ) => Effect.Effect<void>
    readonly mutation: <A, E, R>(
      keys: ReadonlyArray<unknown> | ReadonlyRecord<string, Array<unknown>>,
      effect: Effect.Effect<A, E, R>
    ) => Effect.Effect<A, E, R>
    readonly query: <A, E, R>(
      keys: ReadonlyArray<unknown> | ReadonlyRecord<string, Array<unknown>>,
      effect: Effect.Effect<A, E, R>
    ) => Effect.Effect<Mailbox.ReadonlyMailbox<A, E>, never, R | Scope.Scope>
    readonly stream: <A, E, R>(
      keys: ReadonlyArray<unknown> | ReadonlyRecord<string, Array<unknown>>,
      effect: Effect.Effect<A, E, R>
    ) => Stream.Stream<A, E, Exclude<R, Scope.Scope>>
  }
}

const idHashes = (keyHash: number, ids: ReadonlyArray<unknown>): ReadonlyArray<number> => {
  const hashes: Array<number> = new Array(ids.length)
  for (let i = 0; i < ids.length; i++) {
    hashes[i] = Hash.combine(keyHash)(Hash.hash(ids[i]))
  }
  return hashes
}

const recordHashes = (record: ReadonlyRecord<string, Array<unknown>>): ReadonlyArray<number> => {
  const hashes: Array<number> = []
  for (const key in record) {
    const keyHash = Hash.string(key)
    hashes.push(keyHash)
    for (const idHash of idHashes(keyHash, record[key])) {
      hashes.push(idHash)
    }
  }
  return hashes
}
