/**
 * @since 3.5.0
 */
import * as Context from "./Context.js"
import * as Effect from "./Effect.js"
import * as Exit from "./Exit.js"
import * as FiberRef from "./FiberRef.js"
import { dual } from "./Function.js"
import * as MutableHashMap from "./MutableHashMap.js"
import * as Option from "./Option.js"
import { type Pipeable, pipeArguments } from "./Pipeable.js"
import * as Scope from "./Scope.js"

/**
 * @since 3.5.0
 * @category type ids
 */
export const TypeId: unique symbol = Symbol.for("effect/RcMap")

/**
 * @since 3.5.0
 * @category type ids
 */
export type TypeId = typeof TypeId

/**
 * @since 3.5.0
 * @category models
 */
export interface RcMap<in out K, in out A, in out E> extends Pipeable {
  readonly [TypeId]: TypeId

  /** @internal */
  readonly lookup: (key: K) => Effect.Effect<A, E, Scope.Scope>
  /** @internal */
  readonly context: Context.Context<never>
  /** @internal */
  state: State<K, A>
  /** @internal */
  readonly semaphore: Effect.Semaphore
}

type State<K, A> = State.Open<K, A> | State.Closed

declare namespace State {
  interface Open<K, A> {
    readonly _tag: "Open"
    readonly map: MutableHashMap.MutableHashMap<K, Entry<A>>
  }
  interface Closed {
    readonly _tag: "Closed"
  }
  interface Entry<A> {
    readonly value: A
    readonly scope: Scope.CloseableScope
    refCount: number
  }
}

const RcMapProto = {
  [TypeId]: TypeId,
  pipe() {
    return pipeArguments(this, arguments)
  }
}

/**
 * An `RcMap` can contain multiple reference counted resources that can be indexed
 * by a key. The resources are lazily acquired on the first call to `get` and
 * released when the last reference is released.
 *
 * @since 3.5.0
 * @category models
 * @example
 * import { Effect, RcMap } from "effect"
 *
 * Effect.gen(function*() {
 *   const map = yield* RcMap.make((key: string) =>
 *     Effect.acquireRelease(
 *       Effect.succeed(`acquired ${key}`),
 *       () => Effect.log(`releasing ${key}`)
 *     )
 *   )
 *
 *   // Get "foo" from the map twice, which will only acquire it once.
 *   // It will then be released once the scope closes.
 *   yield* RcMap.get(map, "foo").pipe(
 *     Effect.andThen(RcMap.get(map, "foo")),
 *     Effect.scoped
 *   )
 * })
 */
export const make = <K, A, E, R>(
  lookup: (key: K) => Effect.Effect<A, E, R>
) =>
  Effect.acquireRelease(
    Effect.context<R>().pipe(
      Effect.map((context): RcMap<K, A, E> =>
        Object.assign(Object.create(RcMapProto), {
          lookup,
          context,
          state: {
            _tag: "Open",
            map: MutableHashMap.empty()
          },
          semaphore: Effect.unsafeMakeSemaphore(1)
        })
      )
    ),
    (self) =>
      Effect.suspend(() => {
        if (self.state._tag === "Closed") {
          return Effect.void
        }
        const map = self.state.map
        self.state = { _tag: "Closed" }
        return Effect.forEach(map, ([_key, entry]) => Scope.close(entry.scope, Exit.void), { discard: true }).pipe(
          Effect.tap(() => {
            MutableHashMap.clear(map)
          })
        )
      })
  )

/**
 * @since 3.5.0
 * @category combinators
 */
export const get: {
  <K>(key: K): <A, E>(self: RcMap<K, A, E>) => Effect.Effect<A, E, Scope.Scope>
  <K, A, E>(self: RcMap<K, A, E>, key: K): Effect.Effect<A, E, Scope.Scope>
} = dual(
  2,
  <K, A, E>(self: RcMap<K, A, E>, key: K): Effect.Effect<A, E, Scope.Scope> =>
    Effect.uninterruptibleMask((restore) =>
      Effect.suspend(() => {
        if (self.state._tag === "Closed") {
          return Effect.interrupt
        }
        const state = self.state
        const o = MutableHashMap.get(state.map, key)
        if (Option.isSome(o)) {
          o.value.refCount++
          return Effect.succeed(o.value)
        }
        const acquire = self.lookup(key)
        return Effect.flatMap(Scope.make(), (scope) =>
          Effect.map(
            restore(Effect.locally(
              acquire as Effect.Effect<A, E>,
              FiberRef.currentContext,
              Context.add(self.context, Scope.Scope, scope)
            )),
            (value) => {
              const entry: State.Entry<A> = {
                value,
                scope,
                refCount: 1
              }
              MutableHashMap.set(state.map, key, entry)
              return entry
            }
          ))
      }).pipe(
        self.semaphore.withPermits(1),
        Effect.bindTo("entry"),
        Effect.bind("scope", () => Effect.scope),
        Effect.flatMap(({ entry, scope }) =>
          Effect.as(
            Scope.addFinalizer(
              scope,
              self.semaphore.withPermits(1)(Effect.suspend(() => {
                entry.refCount--
                if (entry.refCount > 0) {
                  return Effect.void
                }
                if (self.state._tag === "Open") {
                  MutableHashMap.remove(self.state.map, key)
                }
                return Scope.close(entry.scope, Exit.void)
              }))
            ),
            entry.value
          )
        )
      )
    )
)
