/**
 * @since 2.0.0
 */
import * as Effect from "effect/Effect"
import type * as Scope from "effect/Scope"
import type { NoSuchElementException } from "./Cause.js"
import * as Fiber from "./Fiber.js"
import * as FiberId from "./FiberId.js"
import { dual } from "./Function.js"
import type { FiberMap } from "./index.js"
import * as Inspectable from "./Inspectable.js"
import * as MutableHashMap from "./MutableHashMap.js"
import * as Option from "./Option.js"
import { type Pipeable, pipeArguments } from "./Pipeable.js"
import * as Predicate from "./Predicate.js"
import * as Runtime from "./Runtime.js"

/**
 * @since 2.0.0
 * @categories type ids
 */
export const TypeId = Symbol.for("effect/FiberMap")

/**
 * @since 2.0.0
 * @categories type ids
 */
export type TypeId = typeof TypeId

/**
 * @since 2.0.0
 * @categories models
 */
export interface FiberMap<K, E = unknown, A = unknown>
  extends Pipeable, Inspectable.Inspectable, Iterable<[K, Fiber.RuntimeFiber<A, E>]>
{
  readonly [TypeId]: TypeId
  readonly backing: MutableHashMap.MutableHashMap<K, Fiber.RuntimeFiber<A, E>>
}

/**
 * @since 2.0.0
 * @categories refinements
 */
export const isFiberMap = (u: unknown): u is FiberMap<unknown> => Predicate.hasProperty(u, TypeId)

const Proto = {
  [TypeId]: TypeId,
  [Symbol.iterator](this: FiberMap<unknown>) {
    return this.backing[Symbol.iterator]()
  },
  toString(this: FiberMap<unknown>) {
    return Inspectable.format(this.toJSON())
  },
  toJSON(this: FiberMap<unknown>) {
    return {
      _id: "FiberMap",
      backing: this.backing.toJSON()
    }
  },
  [Inspectable.NodeInspectSymbol](this: FiberMap<unknown>) {
    return this.toJSON()
  },
  pipe() {
    return pipeArguments(this, arguments)
  }
}

const unsafeMake = <K, E = unknown, A = unknown>(): FiberMap<K, E, A> => {
  const self = Object.create(Proto)
  self.backing = MutableHashMap.empty()
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
export const make = <K, E = unknown, A = unknown>(): Effect.Effect<FiberMap<K, E, A>, never, Scope.Scope> =>
  Effect.acquireRelease(Effect.sync(() => unsafeMake<K, E, A>()), clear)

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
    options?: Runtime.RunForkOptions | undefined
  ) => Fiber.RuntimeFiber<XA, XE>,
  never,
  Scope.Scope | R
> =>
  Effect.flatMap(
    make<K, E, A>(),
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
  <K, E, A, XE extends E, XA extends A>(
    key: K,
    fiber: Fiber.RuntimeFiber<XA, XE>,
    interruptAs?: FiberId.FiberId
  ): (self: FiberMap<K, E, A>) => void
  <K, E, A, XE extends E, XA extends A>(
    self: FiberMap<K, E, A>,
    key: K,
    fiber: Fiber.RuntimeFiber<XA, XE>,
    interruptAs?: FiberId.FiberId
  ): void
} = dual<
  <K, E, A, XE extends E, XA extends A>(
    key: K,
    fiber: Fiber.RuntimeFiber<XA, XE>,
    interruptAs?: FiberId.FiberId
  ) => (self: FiberMap<K, E, A>) => void,
  <K, E, A, XE extends E, XA extends A>(
    self: FiberMap<K, E, A>,
    key: K,
    fiber: Fiber.RuntimeFiber<XA, XE>,
    interruptAs?: FiberId.FiberId
  ) => void
>((args) => isFiberMap(args[0]), (self, key, fiber, interruptAs) => {
  const previous = MutableHashMap.get(self.backing, key)
  if (previous._tag === "Some") {
    if (previous.value === fiber) {
      return
    }
    previous.value.unsafeInterruptAsFork(interruptAs ?? FiberId.none)
  }
  MutableHashMap.set(self.backing, key, fiber)
  fiber.addObserver((_) => {
    const current = MutableHashMap.get(self.backing, key)
    if (Option.isSome(current) && fiber === current.value) {
      MutableHashMap.remove(self.backing, key)
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
  <K, E, A, XE extends E, XA extends A>(
    key: K,
    fiber: Fiber.RuntimeFiber<XA, XE>
  ): (self: FiberMap<K, E, A>) => Effect.Effect<void>
  <K, E, A, XE extends E, XA extends A>(
    self: FiberMap<K, E, A>,
    key: K,
    fiber: Fiber.RuntimeFiber<XA, XE>
  ): Effect.Effect<void>
} = dual<
  <K, E, A, XE extends E, XA extends A>(
    key: K,
    fiber: Fiber.RuntimeFiber<XA, XE>
  ) => (self: FiberMap<K, E, A>) => Effect.Effect<void>,
  <K, E, A, XE extends E, XA extends A>(
    self: FiberMap<K, E, A>,
    key: K,
    fiber: Fiber.RuntimeFiber<XA, XE>
  ) => Effect.Effect<void>
>(3, (self, key, fiber) =>
  Effect.fiberIdWith(
    (fiberId) => Effect.sync(() => unsafeSet(self, key, fiber, fiberId))
  ))

/**
 * Retrieve a fiber from the FiberMap.
 *
 * @since 2.0.0
 * @categories combinators
 */
export const unsafeGet: {
  <K>(key: K): <E, A>(self: FiberMap<K, E, A>) => Option.Option<Fiber.RuntimeFiber<A, E>>
  <K, E, A>(self: FiberMap<K, E, A>, key: K): Option.Option<Fiber.RuntimeFiber<A, E>>
} = dual<
  <K>(
    key: K
  ) => <E, A>(self: FiberMap<K, E, A>) => Option.Option<Fiber.RuntimeFiber<A, E>>,
  <K, E, A>(
    self: FiberMap<K, E, A>,
    key: K
  ) => Option.Option<Fiber.RuntimeFiber<A, E>>
>(2, (self, key) => MutableHashMap.get(self.backing, key))

/**
 * Retrieve a fiber from the FiberMap.
 *
 * @since 2.0.0
 * @categories combinators
 */
export const get: {
  <K>(key: K): <E, A>(self: FiberMap<K, E, A>) => Effect.Effect<Fiber.RuntimeFiber<A, E>, NoSuchElementException>
  <K, E, A>(self: FiberMap<K, E, A>, key: K): Effect.Effect<Fiber.RuntimeFiber<A, E>, NoSuchElementException>
} = dual<
  <K>(
    key: K
  ) => <E, A>(self: FiberMap<K, E, A>) => Effect.Effect<Fiber.RuntimeFiber<A, E>, NoSuchElementException>,
  <K, E, A>(
    self: FiberMap<K, E, A>,
    key: K
  ) => Effect.Effect<Fiber.RuntimeFiber<A, E>, NoSuchElementException>
>(2, (self, key) => Effect.suspend(() => MutableHashMap.get(self.backing, key)))

/**
 * Remove a fiber from the FiberMap, interrupting it if it exists.
 *
 * @since 2.0.0
 * @categories combinators
 */
export const remove: {
  <K>(key: K): <E, A>(self: FiberMap<K, E, A>) => Effect.Effect<void>
  <K, E, A>(self: FiberMap<K, E, A>, key: K): Effect.Effect<void>
} = dual<
  <K>(
    key: K
  ) => <E, A>(self: FiberMap<K, E, A>) => Effect.Effect<void>,
  <K, E, A>(
    self: FiberMap<K, E, A>,
    key: K
  ) => Effect.Effect<void>
>(2, (self, key) =>
  Effect.suspend(() => {
    const fiber = MutableHashMap.get(self.backing, key)
    if (fiber._tag === "None") {
      return Effect.unit
    }
    MutableHashMap.remove(self.backing, key)
    return Fiber.interrupt(fiber.value)
  }))

/**
 * @since 2.0.0
 * @categories combinators
 */
export const clear = <K, E, A>(self: FiberMap<K, E, A>): Effect.Effect<void> =>
  Effect.zipRight(
    Effect.forEach(self.backing, ([_, fiber]) => Fiber.interrupt(fiber)),
    Effect.sync(() => {
      MutableHashMap.clear(self.backing)
    })
  )

/**
 * Run an Effect and add the forked fiber to the FiberMap.
 * When the fiber completes, it will be removed from the FiberMap.
 *
 * @since 2.0.0
 * @categories combinators
 */
export const run: {
  <K, E, A>(
    self: FiberMap<K, E, A>,
    key: K
  ): <R, XE extends E, XA extends A>(
    effect: Effect.Effect<XA, XE, R>
  ) => Effect.Effect<Fiber.RuntimeFiber<XA, XE>, never, R>
  <K, E, A, R, XE extends E, XA extends A>(
    self: FiberMap<K, E, A>,
    key: K,
    effect: Effect.Effect<XA, XE, R>
  ): Effect.Effect<Fiber.RuntimeFiber<XA, XE>, never, R>
} = function() {
  if (arguments.length === 2) {
    const self = arguments[0] as FiberMap<any>
    const key = arguments[1]
    return (effect: Effect.Effect<any, any, any>) =>
      Effect.tap(
        Effect.forkDaemon(effect),
        (fiber) => set(self, key, fiber)
      )
  }
  const self = arguments[0] as FiberMap<any>
  const key = arguments[1]
  const effect = arguments[2] as Effect.Effect<any, any, any>
  return Effect.tap(
    Effect.forkDaemon(effect),
    (fiber) => set(self, key, fiber)
  ) as any
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
export const runtime: <K, E, A>(
  self: FiberMap<K, E, A>
) => <R>() => Effect.Effect<
  <XE extends E, XA extends A>(
    key: K,
    effect: Effect.Effect<XA, XE, R>,
    options?: Runtime.RunForkOptions | undefined
  ) => Fiber.RuntimeFiber<XA, XE>,
  never,
  R
> = <K, E, A>(self: FiberMap<K, E, A>) => <R>() =>
  Effect.map(
    Effect.runtime<R>(),
    (runtime) => {
      const runFork = Runtime.runFork(runtime)
      return <XE extends E, XA extends A>(
        key: K,
        effect: Effect.Effect<XA, XE, R>,
        options?: Runtime.RunForkOptions | undefined
      ) => {
        const fiber = runFork(effect, options)
        unsafeSet(self, key, fiber)
        return fiber
      }
    }
  )

/**
 * @since 2.0.0
 * @categories combinators
 */
export const size = <K, E, A>(self: FiberMap<K, E, A>): Effect.Effect<number> =>
  Effect.sync(() => MutableHashMap.size(self.backing))
