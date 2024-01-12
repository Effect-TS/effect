/**
 * @since 2.0.0
 */
import * as Effect from "effect/Effect"
import type * as Scope from "effect/Scope"
import * as Fiber from "./Fiber.js"
import { dual } from "./Function.js"
import * as Inspectable from "./Inspectable.js"
import { type Pipeable, pipeArguments } from "./Pipeable.js"
import * as Predicate from "./Predicate.js"

/**
 * @since 2.0.0
 * @categories type ids
 */
export const TypeId = Symbol.for("effect/FiberSet")

/**
 * @since 2.0.0
 * @categories type ids
 */
export type TypeId = typeof TypeId

/**
 * @since 2.0.0
 * @categories models
 */
export interface FiberSet<E = unknown, A = unknown>
  extends Pipeable, Inspectable.Inspectable, Iterable<Fiber.RuntimeFiber<E, A>>
{
  readonly [TypeId]: TypeId
  readonly backing: Set<Fiber.RuntimeFiber<E, A>>
}

/**
 * @since 2.0.0
 * @categories refinements
 */
export const isFiberSet = (u: unknown): u is FiberSet<unknown> => Predicate.hasProperty(u, TypeId)

const Proto = {
  [TypeId]: TypeId,
  [Symbol.iterator](this: FiberSet) {
    return this.backing[Symbol.iterator]()
  },
  toString(this: FiberSet) {
    return Inspectable.format(this.toJSON())
  },
  toJSON(this: FiberSet) {
    return {
      _id: "FiberMap",
      backing: Inspectable.toJSON(Array.from(this.backing))
    }
  },
  [Inspectable.NodeInspectSymbol](this: FiberSet) {
    return this.toJSON()
  },
  pipe() {
    return pipeArguments(this, arguments)
  }
}

const unsafeMake = <E = unknown, A = unknown>(): FiberSet<E, A> => {
  const self = Object.create(Proto)
  self.backing = new Set()
  return self
}

/**
 * A FiberSet can be used to store a collection of fibers.
 * When the associated Scope is closed, all fibers in the set will be interrupted.
 *
 * You can add fibers to the set using `FiberSet.add` or `FiberSet.run`, and the fibers will
 * be automatically removed from the FiberSet when they complete.
 *
 * @example
 * import { Effect, FiberSet } from "effect"
 *
 * Effect.gen(function*(_) {
 *   const set = yield* _(FiberSet.make())
 *
 *   // run some effects and add the fibers to the set
 *   yield* _(FiberSet.run(set, Effect.never))
 *   yield* _(FiberSet.run(set, Effect.never))
 *
 *   yield* _(Effect.sleep(1000))
 * }).pipe(
 *   Effect.scoped // The fibers will be interrupted when the scope is closed
 * )
 *
 * @since 2.0.0
 * @categories constructors
 */
export const make = <E = unknown, A = unknown>(): Effect.Effect<Scope.Scope, never, FiberSet<E, A>> =>
  Effect.acquireRelease(Effect.sync(() => unsafeMake<E, A>()), clear)

/**
 * Add a fiber to the FiberSet. When the fiber completes, it will be removed.
 *
 * @since 2.0.0
 * @categories combinators
 */
export const unsafeAdd: {
  <E, A, XE extends E, XA extends A>(fiber: Fiber.RuntimeFiber<XE, XA>): (self: FiberSet<E, A>) => void
  <E, A, XE extends E, XA extends A>(self: FiberSet<E, A>, fiber: Fiber.RuntimeFiber<XE, XA>): void
} = dual<
  <E, A, XE extends E, XA extends A>(
    fiber: Fiber.RuntimeFiber<XE, XA>
  ) => (self: FiberSet<E, A>) => void,
  <E, A, XE extends E, XA extends A>(
    self: FiberSet<E, A>,
    fiber: Fiber.RuntimeFiber<XE, XA>
  ) => void
>(2, (self, fiber) => {
  if (self.backing.has(fiber)) {
    return
  }
  self.backing.add(fiber)
  fiber.addObserver((_) => {
    self.backing.delete(fiber)
  })
})

/**
 * Add a fiber to the FiberSet. When the fiber completes, it will be removed.
 *
 * @since 2.0.0
 * @categories combinators
 */
export const add: {
  <E, A, XE extends E, XA extends A>(
    fiber: Fiber.RuntimeFiber<XE, XA>
  ): (self: FiberSet<E, A>) => Effect.Effect<never, never, void>
  <E, A, XE extends E, XA extends A>(
    self: FiberSet<E, A>,
    fiber: Fiber.RuntimeFiber<XE, XA>
  ): Effect.Effect<never, never, void>
} = dual<
  <E, A, XE extends E, XA extends A>(
    fiber: Fiber.RuntimeFiber<XE, XA>
  ) => (self: FiberSet<E, A>) => Effect.Effect<never, never, void>,
  <E, A, XE extends E, XA extends A>(
    self: FiberSet<E, A>,
    fiber: Fiber.RuntimeFiber<XE, XA>
  ) => Effect.Effect<never, never, void>
>(2, (self, fiber) => Effect.sync(() => unsafeAdd(self, fiber)))

/**
 * @since 2.0.0
 * @categories combinators
 */
export const clear = <E, A>(self: FiberSet<E, A>): Effect.Effect<never, never, void> =>
  Effect.zipRight(
    Effect.forEach(self.backing, (fiber) => Fiber.interrupt(fiber)),
    Effect.sync(() => {
      self.backing.clear()
    })
  )

/**
 * Fork an Effect and add the forked fiber to the FiberSet.
 * When the fiber completes, it will be removed from the FiberSet.
 *
 * @since 2.0.0
 * @categories combinators
 */
export const run: {
  <E, A, R, XE extends E, XA extends A>(
    effect: Effect.Effect<R, XE, XA>
  ): (self: FiberSet<E, A>) => Effect.Effect<R, never, Fiber.RuntimeFiber<XE, XA>>
  <E, A, R, XE extends E, XA extends A>(
    self: FiberSet<E, A>,
    effect: Effect.Effect<R, XE, XA>
  ): Effect.Effect<R, never, Fiber.RuntimeFiber<XE, XA>>
} = dual<
  <E, A, R, XE extends E, XA extends A>(
    effect: Effect.Effect<R, XE, XA>
  ) => (self: FiberSet<E, A>) => Effect.Effect<R, never, Fiber.RuntimeFiber<XE, XA>>,
  <E, A, R, XE extends E, XA extends A>(
    self: FiberSet<E, A>,
    effect: Effect.Effect<R, XE, XA>
  ) => Effect.Effect<R, never, Fiber.RuntimeFiber<XE, XA>>
>(2, (self, effect) =>
  Effect.tap(
    Effect.forkDaemon(effect),
    (fiber) => add(self, fiber)
  ))

/**
 * @since 2.0.0
 * @categories combinators
 */
export const size = <E, A>(self: FiberSet<E, A>): Effect.Effect<never, never, number> =>
  Effect.sync(() => self.backing.size)
