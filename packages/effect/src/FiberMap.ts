/**
 * @since 2.0.0
 */
import * as Effect from "effect/Effect"
import type * as Scope from "effect/Scope"
import type { NoSuchElementException } from "./Cause.js"
import * as Cause from "./Cause.js"
import * as Deferred from "./Deferred.js"
import * as Exit from "./Exit.js"
import * as Fiber from "./Fiber.js"
import * as FiberId from "./FiberId.js"
import * as FiberRef from "./FiberRef.js"
import { dual } from "./Function.js"
import * as Inspectable from "./Inspectable.js"
import type { FiberRuntime } from "./internal/fiberRuntime.js"
import * as Iterable from "./Iterable.js"
import * as MutableHashMap from "./MutableHashMap.js"
import * as Option from "./Option.js"
import { type Pipeable, pipeArguments } from "./Pipeable.js"
import * as Predicate from "./Predicate.js"
import * as Runtime from "./Runtime.js"

/**
 * @since 2.0.0
 * @categories type ids
 */
export const TypeId: unique symbol = Symbol.for("effect/FiberMap")

/**
 * @since 2.0.0
 * @categories type ids
 */
export type TypeId = typeof TypeId

/**
 * @since 2.0.0
 * @categories models
 */
export interface FiberMap<in out K, out A = unknown, out E = unknown>
  extends Pipeable, Inspectable.Inspectable, Iterable<[K, Fiber.RuntimeFiber<A, E>]>
{
  readonly [TypeId]: TypeId
  readonly deferred: Deferred.Deferred<void, unknown>
  /** @internal */
  state: {
    readonly _tag: "Open"
    readonly backing: MutableHashMap.MutableHashMap<K, Fiber.RuntimeFiber<A, E>>
  } | {
    readonly _tag: "Closed"
  }
}

/**
 * @since 2.0.0
 * @categories refinements
 */
export const isFiberMap = (u: unknown): u is FiberMap<unknown> => Predicate.hasProperty(u, TypeId)

const Proto = {
  [TypeId]: TypeId,
  [Symbol.iterator](this: FiberMap<unknown>) {
    if (this.state._tag === "Closed") {
      return Iterable.empty()
    }
    return this.state.backing[Symbol.iterator]()
  },
  toString(this: FiberMap<unknown>) {
    return Inspectable.format(this.toJSON())
  },
  toJSON(this: FiberMap<unknown>) {
    return {
      _id: "FiberMap",
      state: this.state
    }
  },
  [Inspectable.NodeInspectSymbol](this: FiberMap<unknown>) {
    return this.toJSON()
  },
  pipe() {
    return pipeArguments(this, arguments)
  }
}

const unsafeMake = <K, A = unknown, E = unknown>(
  backing: MutableHashMap.MutableHashMap<K, Fiber.RuntimeFiber<A, E>>,
  deferred: Deferred.Deferred<void, E>
): FiberMap<K, A, E> => {
  const self = Object.create(Proto)
  self.state = { _tag: "Open", backing }
  self.deferred = deferred
  return self
}

/**
 * A FiberMap can be used to store a collection of fibers, indexed by some key.
 * When the associated Scope is closed, all fibers in the map will be interrupted.
 *
 * You can add fibers to the map using `FiberMap.set` or `FiberMap.run`, and the fibers will
 * be automatically removed from the FiberMap when they complete.
 *
 * @example
 * import { Effect, FiberMap } from "effect"
 *
 * Effect.gen(function*(_) {
 *   const map = yield* _(FiberMap.make<string>())
 *
 *   // run some effects and add the fibers to the map
 *   yield* _(FiberMap.run(map, "fiber a", Effect.never))
 *   yield* _(FiberMap.run(map, "fiber b", Effect.never))
 *
 *   yield* _(Effect.sleep(1000))
 * }).pipe(
 *   Effect.scoped // The fibers will be interrupted when the scope is closed
 * )
 *
 * @since 2.0.0
 * @categories constructors
 */
export const make = <K, A = unknown, E = unknown>(): Effect.Effect<FiberMap<K, A, E>, never, Scope.Scope> =>
  Effect.acquireRelease(
    Effect.map(Deferred.make<void, E>(), (deferred) =>
      unsafeMake<K, A, E>(
        MutableHashMap.empty(),
        deferred
      )),
    (map) =>
      Effect.zipRight(
        clear(map),
        Effect.suspend(() => {
          map.state = { _tag: "Closed" }
          return Deferred.done(map.deferred, Exit.void)
        })
      )
  )

/**
 * Create an Effect run function that is backed by a FiberMap.
 *
 * @since 2.0.0
 * @categories constructors
 */
export const makeRuntime = <R, K, E = unknown, A = unknown>(): Effect.Effect<
  <XE extends E, XA extends A>(
    key: K,
    effect: Effect.Effect<XA, XE, R>,
    options?:
      | Runtime.RunForkOptions & {
        readonly onlyIfMissing?: boolean | undefined
      }
      | undefined
  ) => Fiber.RuntimeFiber<XA, XE>,
  never,
  Scope.Scope | R
> =>
  Effect.flatMap(
    make<K, A, E>(),
    (self) => runtime(self)<R>()
  )

/**
 * Add a fiber to the FiberMap. When the fiber completes, it will be removed from the FiberMap.
 * If the key already exists in the FiberMap, the previous fiber will be interrupted.
 *
 * @since 2.0.0
 * @categories combinators
 */
export const unsafeSet: {
  <K, A, E, XE extends E, XA extends A>(
    key: K,
    fiber: Fiber.RuntimeFiber<XA, XE>,
    options?: {
      readonly interruptAs?: FiberId.FiberId | undefined
      readonly onlyIfMissing?: boolean | undefined
    } | undefined
  ): (self: FiberMap<K, A, E>) => void
  <K, A, E, XE extends E, XA extends A>(
    self: FiberMap<K, A, E>,
    key: K,
    fiber: Fiber.RuntimeFiber<XA, XE>,
    options?: {
      readonly interruptAs?: FiberId.FiberId | undefined
      readonly onlyIfMissing?: boolean | undefined
    } | undefined
  ): void
} = dual((args) => isFiberMap(args[0]), <K, A, E, XE extends E, XA extends A>(
  self: FiberMap<K, A, E>,
  key: K,
  fiber: Fiber.RuntimeFiber<XA, XE>,
  options?: {
    readonly interruptAs?: FiberId.FiberId | undefined
    readonly onlyIfMissing?: boolean | undefined
  } | undefined
): void => {
  if (self.state._tag === "Closed") {
    fiber.unsafeInterruptAsFork(options?.interruptAs ?? FiberId.none)
    return
  }

  const previous = MutableHashMap.get(self.state.backing, key)
  if (previous._tag === "Some") {
    if (options?.onlyIfMissing === true) {
      fiber.unsafeInterruptAsFork(options?.interruptAs ?? FiberId.none)
      return
    } else if (previous.value === fiber) {
      return
    }
    previous.value.unsafeInterruptAsFork(options?.interruptAs ?? FiberId.none)
  }

  ;(fiber as FiberRuntime<unknown, unknown>).setFiberRef(FiberRef.unhandledErrorLogLevel, Option.none())
  MutableHashMap.set(self.state.backing, key, fiber)
  fiber.addObserver((exit) => {
    if (self.state._tag === "Closed") {
      return
    }
    const current = MutableHashMap.get(self.state.backing, key)
    if (Option.isSome(current) && fiber === current.value) {
      MutableHashMap.remove(self.state.backing, key)
    }
    if (Exit.isFailure(exit) && !Cause.isInterruptedOnly(exit.cause)) {
      Deferred.unsafeDone(self.deferred, exit as any)
    }
  })
})

/**
 * Add a fiber to the FiberMap. When the fiber completes, it will be removed from the FiberMap.
 * If the key already exists in the FiberMap, the previous fiber will be interrupted.
 *
 * @since 2.0.0
 * @categories combinators
 */
export const set: {
  <K, A, E, XE extends E, XA extends A>(
    key: K,
    fiber: Fiber.RuntimeFiber<XA, XE>,
    options?: {
      readonly onlyIfMissing?: boolean | undefined
    } | undefined
  ): (self: FiberMap<K, A, E>) => Effect.Effect<void>
  <K, A, E, XE extends E, XA extends A>(
    self: FiberMap<K, A, E>,
    key: K,
    fiber: Fiber.RuntimeFiber<XA, XE>,
    options?: {
      readonly onlyIfMissing?: boolean | undefined
    } | undefined
  ): Effect.Effect<void>
} = dual((args) => isFiberMap(args[0]), <K, A, E, XE extends E, XA extends A>(
  self: FiberMap<K, A, E>,
  key: K,
  fiber: Fiber.RuntimeFiber<XA, XE>,
  options?: {
    readonly onlyIfMissing?: boolean | undefined
  } | undefined
): Effect.Effect<void> =>
  Effect.fiberIdWith(
    (fiberId) =>
      Effect.sync(() =>
        unsafeSet(self, key, fiber, {
          interruptAs: fiberId,
          onlyIfMissing: options?.onlyIfMissing
        })
      )
  ))

/**
 * Retrieve a fiber from the FiberMap.
 *
 * @since 2.0.0
 * @categories combinators
 */
export const unsafeGet: {
  <K>(key: K): <A, E>(self: FiberMap<K, A, E>) => Option.Option<Fiber.RuntimeFiber<A, E>>
  <K, A, E>(self: FiberMap<K, A, E>, key: K): Option.Option<Fiber.RuntimeFiber<A, E>>
} = dual<
  <K>(
    key: K
  ) => <A, E>(self: FiberMap<K, A, E>) => Option.Option<Fiber.RuntimeFiber<A, E>>,
  <K, A, E>(
    self: FiberMap<K, A, E>,
    key: K
  ) => Option.Option<Fiber.RuntimeFiber<A, E>>
>(2, (self, key) => self.state._tag === "Closed" ? Option.none() : MutableHashMap.get(self.state.backing, key))

/**
 * Retrieve a fiber from the FiberMap.
 *
 * @since 2.0.0
 * @categories combinators
 */
export const get: {
  <K>(key: K): <A, E>(self: FiberMap<K, A, E>) => Effect.Effect<Fiber.RuntimeFiber<A, E>, NoSuchElementException>
  <K, A, E>(self: FiberMap<K, A, E>, key: K): Effect.Effect<Fiber.RuntimeFiber<A, E>, NoSuchElementException>
} = dual<
  <K>(
    key: K
  ) => <A, E>(self: FiberMap<K, A, E>) => Effect.Effect<Fiber.RuntimeFiber<A, E>, NoSuchElementException>,
  <K, A, E>(
    self: FiberMap<K, A, E>,
    key: K
  ) => Effect.Effect<Fiber.RuntimeFiber<A, E>, NoSuchElementException>
>(2, (self, key) => Effect.suspend(() => unsafeGet(self, key)))

/**
 * Check if a key exists in the FiberMap.
 *
 * @since 2.0.0
 * @categories combinators
 */
export const unsafeHas: {
  <K>(key: K): <A, E>(self: FiberMap<K, A, E>) => boolean
  <K, A, E>(self: FiberMap<K, A, E>, key: K): boolean
} = dual(
  2,
  <K, A, E>(self: FiberMap<K, A, E>, key: K): boolean =>
    self.state._tag === "Closed" ? false : MutableHashMap.has(self.state.backing, key)
)

/**
 * Check if a key exists in the FiberMap.
 *
 * @since 2.0.0
 * @categories combinators
 */
export const has: {
  <K>(key: K): <A, E>(self: FiberMap<K, A, E>) => Effect.Effect<boolean>
  <K, A, E>(self: FiberMap<K, A, E>, key: K): Effect.Effect<boolean>
} = dual(
  2,
  <K, A, E>(self: FiberMap<K, A, E>, key: K): Effect.Effect<boolean> => Effect.sync(() => unsafeHas(self, key))
)

/**
 * Remove a fiber from the FiberMap, interrupting it if it exists.
 *
 * @since 2.0.0
 * @categories combinators
 */
export const remove: {
  <K>(key: K): <A, E>(self: FiberMap<K, A, E>) => Effect.Effect<void>
  <K, A, E>(self: FiberMap<K, A, E>, key: K): Effect.Effect<void>
} = dual<
  <K>(
    key: K
  ) => <A, E>(self: FiberMap<K, A, E>) => Effect.Effect<void>,
  <K, A, E>(
    self: FiberMap<K, A, E>,
    key: K
  ) => Effect.Effect<void>
>(2, (self, key) =>
  Effect.suspend(() => {
    if (self.state._tag === "Closed") {
      return Effect.void
    }
    const fiber = MutableHashMap.get(self.state.backing, key)
    if (fiber._tag === "None") {
      return Effect.void
    }
    // will be removed by the observer
    return Fiber.interrupt(fiber.value)
  }))

/**
 * @since 2.0.0
 * @categories combinators
 */
export const clear = <K, A, E>(self: FiberMap<K, A, E>): Effect.Effect<void> =>
  Effect.suspend(() => {
    if (self.state._tag === "Closed") {
      return Effect.void
    }

    return Effect.forEach(self.state.backing, ([, fiber]) =>
      // will be removed by the observer
      Fiber.interrupt(fiber))
  })

const constInterruptedFiber = (function() {
  let fiber: Fiber.RuntimeFiber<never, never> | undefined = undefined
  return () => {
    if (fiber === undefined) {
      fiber = Effect.runFork(Effect.interrupt)
    }
    return fiber
  }
})()

/**
 * Run an Effect and add the forked fiber to the FiberMap.
 * When the fiber completes, it will be removed from the FiberMap.
 *
 * @since 2.0.0
 * @categories combinators
 */
export const run: {
  <K, A, E>(
    self: FiberMap<K, A, E>,
    key: K,
    options?: {
      readonly onlyIfMissing?: boolean | undefined
    } | undefined
  ): <R, XE extends E, XA extends A>(
    effect: Effect.Effect<XA, XE, R>
  ) => Effect.Effect<Fiber.RuntimeFiber<XA, XE>, never, R>
  <K, A, E, R, XE extends E, XA extends A>(
    self: FiberMap<K, A, E>,
    key: K,
    effect: Effect.Effect<XA, XE, R>,
    options?: {
      readonly onlyIfMissing?: boolean | undefined
    } | undefined
  ): Effect.Effect<Fiber.RuntimeFiber<XA, XE>, never, R>
} = function() {
  if (Effect.isEffect(arguments[2])) {
    const self = arguments[0] as FiberMap<any>
    const key = arguments[1]
    const effect = arguments[2] as Effect.Effect<any, any, any>
    const options = arguments[3] as { readonly onlyIfMissing?: boolean } | undefined
    return Effect.suspend(() => {
      if (self.state._tag === "Closed") {
        return Effect.interrupt
      } else if (options?.onlyIfMissing === true && unsafeHas(self, key)) {
        return Effect.sync(constInterruptedFiber)
      }
      return Effect.uninterruptibleMask((restore) =>
        Effect.tap(
          restore(Effect.forkDaemon(effect)),
          (fiber) => set(self, key, fiber, options)
        )
      )
    }) as any
  }
  const self = arguments[0] as FiberMap<any>
  const key = arguments[1]
  const options = arguments[2] as { readonly onlyIfMissing?: boolean } | undefined
  return (effect: Effect.Effect<any, any, any>) =>
    Effect.suspend(() => {
      if (self.state._tag === "Closed") {
        return Effect.interrupt
      } else if (options?.onlyIfMissing === true && unsafeHas(self, key)) {
        return Effect.sync(constInterruptedFiber)
      }
      return Effect.uninterruptibleMask((restore) =>
        Effect.tap(
          restore(Effect.forkDaemon(effect)),
          (fiber) => set(self, key, fiber, options)
        )
      )
    })
}

/**
 * Capture a Runtime and use it to fork Effect's, adding the forked fibers to the FiberMap.
 *
 * @example
 * import { Context, Effect, FiberMap } from "effect"
 *
 * interface Users {
 *   readonly _: unique symbol
 * }
 * const Users = Context.GenericTag<Users, {
 *    getAll: Effect.Effect<Array<unknown>>
 * }>("Users")
 *
 * Effect.gen(function*(_) {
 *   const map = yield* _(FiberMap.make<string>())
 *   const run = yield* _(FiberMap.runtime(map)<Users>())
 *
 *   // run some effects and add the fibers to the map
 *   run("effect-a", Effect.andThen(Users, _ => _.getAll))
 *   run("effect-b", Effect.andThen(Users, _ => _.getAll))
 * }).pipe(
 *   Effect.scoped // The fibers will be interrupted when the scope is closed
 * )
 *
 * @since 2.0.0
 * @categories combinators
 */
export const runtime: <K, A, E>(
  self: FiberMap<K, A, E>
) => <R = never>() => Effect.Effect<
  <XE extends E, XA extends A>(
    key: K,
    effect: Effect.Effect<XA, XE, R>,
    options?:
      | Runtime.RunForkOptions & {
        readonly onlyIfMissing?: boolean | undefined
      }
      | undefined
  ) => Fiber.RuntimeFiber<XA, XE>,
  never,
  R
> = <K, A, E>(self: FiberMap<K, A, E>) => <R>() =>
  Effect.map(
    Effect.runtime<R>(),
    (runtime) => {
      const runFork = Runtime.runFork(runtime)
      return <XE extends E, XA extends A>(
        key: K,
        effect: Effect.Effect<XA, XE, R>,
        options?:
          | Runtime.RunForkOptions & {
            readonly onlyIfMissing?: boolean | undefined
          }
          | undefined
      ) => {
        if (self.state._tag === "Closed") {
          return constInterruptedFiber()
        } else if (options?.onlyIfMissing === true && unsafeHas(self, key)) {
          return constInterruptedFiber()
        }
        const fiber = runFork(effect, options)
        unsafeSet(self, key, fiber, options)
        return fiber
      }
    }
  )

/**
 * @since 2.0.0
 * @categories combinators
 */
export const size = <K, A, E>(self: FiberMap<K, A, E>): Effect.Effect<number> =>
  Effect.sync(() => self.state._tag === "Closed" ? 0 : MutableHashMap.size(self.state.backing))

/**
 * Join all fibers in the FiberMap. If any of the Fiber's in the map terminate with a failure,
 * the returned Effect will terminate with the first failure that occurred.
 *
 * @since 2.0.0
 * @categories combinators
 * @example
 * import { Effect, FiberMap } from "effect";
 *
 * Effect.gen(function* (_) {
 *   const map = yield* _(FiberMap.make());
 *   yield* _(FiberMap.set(map, "a", Effect.runFork(Effect.fail("error"))));
 *
 *   // parent fiber will fail with "error"
 *   yield* _(FiberMap.join(map));
 * });
 */
export const join = <K, A, E>(self: FiberMap<K, A, E>): Effect.Effect<void, E> =>
  Deferred.await(self.deferred as Deferred.Deferred<void, E>)
