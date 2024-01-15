/**
 * @since 2.0.0
 */
import * as Effect from "effect/Effect"
import type * as Scope from "effect/Scope"
import type { NoSuchElementException } from "./Cause.js"
import * as Fiber from "./Fiber.js"
import * as FiberId from "./FiberId.js"
import { dual } from "./Function.js"
import * as Inspectable from "./Inspectable.js"
import * as MutableHashMap from "./MutableHashMap.js"
import * as Option from "./Option.js"
import { type Pipeable, pipeArguments } from "./Pipeable.js"
import * as Predicate from "./Predicate.js"

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
  extends Pipeable, Inspectable.Inspectable, Iterable<[K, Fiber.RuntimeFiber<E, A>]>
{
  readonly [TypeId]: TypeId
  readonly backing: MutableHashMap.MutableHashMap<K, Fiber.RuntimeFiber<E, A>>
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
export const make = <K, E = unknown, A = unknown>(): Effect.Effect<Scope.Scope, never, FiberMap<K, E, A>> =>
  Effect.acquireRelease(Effect.sync(() => unsafeMake<K, E, A>()), clear)

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
    fiber: Fiber.RuntimeFiber<XE, XA>,
    interruptAs?: FiberId.FiberId
  ): (self: FiberMap<K, E, A>) => void
  <K, E, A, XE extends E, XA extends A>(
    self: FiberMap<K, E, A>,
    key: K,
    fiber: Fiber.RuntimeFiber<XE, XA>,
    interruptAs?: FiberId.FiberId
  ): void
} = dual<
  <K, E, A, XE extends E, XA extends A>(
    key: K,
    fiber: Fiber.RuntimeFiber<XE, XA>,
    interruptAs?: FiberId.FiberId
  ) => (self: FiberMap<K, E, A>) => void,
  <K, E, A, XE extends E, XA extends A>(
    self: FiberMap<K, E, A>,
    key: K,
    fiber: Fiber.RuntimeFiber<XE, XA>,
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
    fiber: Fiber.RuntimeFiber<XE, XA>
  ): (self: FiberMap<K, E, A>) => Effect.Effect<never, never, void>
  <K, E, A, XE extends E, XA extends A>(
    self: FiberMap<K, E, A>,
    key: K,
    fiber: Fiber.RuntimeFiber<XE, XA>
  ): Effect.Effect<never, never, void>
} = dual<
  <K, E, A, XE extends E, XA extends A>(
    key: K,
    fiber: Fiber.RuntimeFiber<XE, XA>
  ) => (self: FiberMap<K, E, A>) => Effect.Effect<never, never, void>,
  <K, E, A, XE extends E, XA extends A>(
    self: FiberMap<K, E, A>,
    key: K,
    fiber: Fiber.RuntimeFiber<XE, XA>
  ) => Effect.Effect<never, never, void>
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
  <K>(key: K): <E, A>(self: FiberMap<K, E, A>) => Option.Option<Fiber.RuntimeFiber<E, A>>
  <K, E, A>(self: FiberMap<K, E, A>, key: K): Option.Option<Fiber.RuntimeFiber<E, A>>
} = dual<
  <K>(
    key: K
  ) => <E, A>(self: FiberMap<K, E, A>) => Option.Option<Fiber.RuntimeFiber<E, A>>,
  <K, E, A>(
    self: FiberMap<K, E, A>,
    key: K
  ) => Option.Option<Fiber.RuntimeFiber<E, A>>
>(2, (self, key) => MutableHashMap.get(self.backing, key))

/**
 * Retrieve a fiber from the FiberMap.
 *
 * @since 2.0.0
 * @categories combinators
 */
export const get: {
  <K>(key: K): <E, A>(self: FiberMap<K, E, A>) => Effect.Effect<never, NoSuchElementException, Fiber.RuntimeFiber<E, A>>
  <K, E, A>(self: FiberMap<K, E, A>, key: K): Effect.Effect<never, NoSuchElementException, Fiber.RuntimeFiber<E, A>>
} = dual<
  <K>(
    key: K
  ) => <E, A>(self: FiberMap<K, E, A>) => Effect.Effect<never, NoSuchElementException, Fiber.RuntimeFiber<E, A>>,
  <K, E, A>(
    self: FiberMap<K, E, A>,
    key: K
  ) => Effect.Effect<never, NoSuchElementException, Fiber.RuntimeFiber<E, A>>
>(2, (self, key) => Effect.suspend(() => MutableHashMap.get(self.backing, key)))

/**
 * Remove a fiber from the FiberMap, interrupting it if it exists.
 *
 * @since 2.0.0
 * @categories combinators
 */
export const remove: {
  <K>(key: K): <E, A>(self: FiberMap<K, E, A>) => Effect.Effect<never, never, void>
  <K, E, A>(self: FiberMap<K, E, A>, key: K): Effect.Effect<never, never, void>
} = dual<
  <K>(
    key: K
  ) => <E, A>(self: FiberMap<K, E, A>) => Effect.Effect<never, never, void>,
  <K, E, A>(
    self: FiberMap<K, E, A>,
    key: K
  ) => Effect.Effect<never, never, void>
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
export const clear = <K, E, A>(self: FiberMap<K, E, A>): Effect.Effect<never, never, void> =>
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
  <K, E, A, R, XE extends E, XA extends A>(
    key: K,
    effect: Effect.Effect<R, XE, XA>
  ): (self: FiberMap<K, E, A>) => Effect.Effect<R, never, Fiber.RuntimeFiber<XE, XA>>
  <K, E, A, R, XE extends E, XA extends A>(
    self: FiberMap<K, E, A>,
    key: K,
    effect: Effect.Effect<R, XE, XA>
  ): Effect.Effect<R, never, Fiber.RuntimeFiber<XE, XA>>
} = dual<
  <K, E, A, R, XE extends E, XA extends A>(
    key: K,
    effect: Effect.Effect<R, XE, XA>
  ) => (self: FiberMap<K, E, A>) => Effect.Effect<R, never, Fiber.RuntimeFiber<XE, XA>>,
  <K, E, A, R, XE extends E, XA extends A>(
    self: FiberMap<K, E, A>,
    key: K,
    effect: Effect.Effect<R, XE, XA>
  ) => Effect.Effect<R, never, Fiber.RuntimeFiber<XE, XA>>
>(3, (self, key, effect) =>
  Effect.tap(
    Effect.forkDaemon(effect),
    (fiber) => set(self, key, fiber)
  ))

/**
 * @since 2.0.0
 * @categories combinators
 */
export const size = <K, E, A>(self: FiberMap<K, E, A>): Effect.Effect<never, never, number> =>
  Effect.sync(() => MutableHashMap.size(self.backing))
