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
export interface FiberSet<E = unknown, A = unknown> extends Pipeable, Inspectable.Inspectable {
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

const unsakeMake = <E = unknown, A = unknown>(): FiberSet<E, A> => {
  const self = Object.create(Proto)
  self.backing = new Set()
  return self
}

/**
 * @since 2.0.0
 * @categories constructors
 */
export const make = <E = unknown, A = unknown>(): Effect.Effect<Scope.Scope, never, FiberSet<E, A>> =>
  Effect.acquireRelease(Effect.sync(() => unsakeMake<E, A>()), clear)

/**
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
