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
import * as Runtime from "./Runtime.js"

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
export interface FiberSet<out A = unknown, out E = unknown>
  extends Pipeable, Inspectable.Inspectable, Iterable<Fiber.RuntimeFiber<A, E>>
{
  readonly [TypeId]: TypeId
  readonly backing: Set<Fiber.RuntimeFiber<A, E>>
}

/**
 * @since 2.0.0
 * @categories refinements
 */
export const isFiberSet = (u: unknown): u is FiberSet<unknown, unknown> => Predicate.hasProperty(u, TypeId)

const Proto = {
  [TypeId]: TypeId,
  [Symbol.iterator](this: FiberSet<unknown, unknown>) {
    return this.backing[Symbol.iterator]()
  },
  toString(this: FiberSet<unknown, unknown>) {
    return Inspectable.format(this.toJSON())
  },
  toJSON(this: FiberSet<unknown, unknown>) {
    return {
      _id: "FiberMap",
      backing: Inspectable.toJSON(Array.from(this.backing))
    }
  },
  [Inspectable.NodeInspectSymbol](this: FiberSet<unknown, unknown>) {
    return this.toJSON()
  },
  pipe() {
    return pipeArguments(this, arguments)
  }
}

const unsafeMake = <A, E>(): FiberSet<A, E> => {
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
export const make = <A = unknown, E = unknown>(): Effect.Effect<FiberSet<A, E>, never, Scope.Scope> =>
  Effect.acquireRelease(Effect.sync(() => unsafeMake<A, E>()), clear)

/**
 * Create an Effect run function that is backed by a FiberSet.
 *
 * @since 2.0.0
 * @categories constructors
 */
export const makeRuntime = <R = never, A = unknown, E = unknown>(): Effect.Effect<
  <XE extends E, XA extends A>(
    effect: Effect.Effect<XA, XE, R>,
    options?: Runtime.RunForkOptions | undefined
  ) => Fiber.RuntimeFiber<XA, XE>,
  never,
  Scope.Scope | R
> =>
  Effect.flatMap(
    make<A, E>(),
    (self) => runtime(self)<R>()
  )

/**
 * Add a fiber to the FiberSet. When the fiber completes, it will be removed.
 *
 * @since 2.0.0
 * @categories combinators
 */
export const unsafeAdd: {
  <A, E, XE extends E, XA extends A>(fiber: Fiber.RuntimeFiber<XA, XE>): (self: FiberSet<A, E>) => void
  <A, E, XE extends E, XA extends A>(self: FiberSet<A, E>, fiber: Fiber.RuntimeFiber<XA, XE>): void
} = dual<
  <A, E, XE extends E, XA extends A>(
    fiber: Fiber.RuntimeFiber<XA, XE>
  ) => (self: FiberSet<A, E>) => void,
  <A, E, XE extends E, XA extends A>(
    self: FiberSet<A, E>,
    fiber: Fiber.RuntimeFiber<XA, XE>
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
  <A, E, XE extends E, XA extends A>(
    fiber: Fiber.RuntimeFiber<XA, XE>
  ): (self: FiberSet<A, E>) => Effect.Effect<void>
  <A, E, XE extends E, XA extends A>(
    self: FiberSet<A, E>,
    fiber: Fiber.RuntimeFiber<XA, XE>
  ): Effect.Effect<void>
} = dual<
  <A, E, XE extends E, XA extends A>(
    fiber: Fiber.RuntimeFiber<XA, XE>
  ) => (self: FiberSet<A, E>) => Effect.Effect<void>,
  <A, E, XE extends E, XA extends A>(
    self: FiberSet<A, E>,
    fiber: Fiber.RuntimeFiber<XA, XE>
  ) => Effect.Effect<void>
>(2, (self, fiber) => Effect.sync(() => unsafeAdd(self, fiber)))

/**
 * @since 2.0.0
 * @categories combinators
 */
export const clear = <A, E>(self: FiberSet<A, E>): Effect.Effect<void> =>
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
  <A, E>(self: FiberSet<A, E>): <R, XE extends E, XA extends A>(
    effect: Effect.Effect<XA, XE, R>
  ) => Effect.Effect<Fiber.RuntimeFiber<XA, XE>, never, R>
  <A, E, R, XE extends E, XA extends A>(
    self: FiberSet<A, E>,
    effect: Effect.Effect<XA, XE, R>
  ): Effect.Effect<Fiber.RuntimeFiber<XA, XE>, never, R>
} = function() {
  const self = arguments[0] as FiberSet<any, any>
  if (arguments.length === 1) {
    return (effect: Effect.Effect<any, any, any>) =>
      Effect.tap(
        Effect.forkDaemon(effect),
        (fiber) => add(self, fiber)
      )
  }
  const effect = arguments[1] as Effect.Effect<any, any, any>
  return Effect.tap(
    Effect.forkDaemon(effect),
    (fiber) => add(self, fiber)
  ) as any
}

/**
 * Capture a Runtime and use it to fork Effect's, adding the forked fibers to the FiberSet.
 *
 * @example
 * import { Context, Effect, FiberSet } from "effect"
 *
 * interface Users {
 *   readonly _: unique symbol
 * }
 * const Users = Context.GenericTag<Users, {
 *    getAll: Effect.Effect<Array<unknown>>
 * }>("Users")
 *
 * Effect.gen(function*(_) {
 *   const set = yield* _(FiberSet.make())
 *   const run = yield* _(FiberSet.runtime(set)<Users>())
 *
 *   // run some effects and add the fibers to the set
 *   run(Effect.andThen(Users, _ => _.getAll))
 * }).pipe(
 *   Effect.scoped // The fibers will be interrupted when the scope is closed
 * )
 *
 * @since 2.0.0
 * @categories combinators
 */
export const runtime: <A, E>(
  self: FiberSet<A, E>
) => <R = never>() => Effect.Effect<
  <XE extends E, XA extends A>(
    effect: Effect.Effect<XA, XE, R>,
    options?: Runtime.RunForkOptions | undefined
  ) => Fiber.RuntimeFiber<XA, XE>,
  never,
  R
> = <A, E>(self: FiberSet<A, E>) => <R>() =>
  Effect.map(
    Effect.runtime<R>(),
    (runtime) => {
      const runFork = Runtime.runFork(runtime)
      return <XE extends E, XA extends A>(
        effect: Effect.Effect<XA, XE, R>,
        options?: Runtime.RunForkOptions | undefined
      ) => {
        const fiber = runFork(effect, options)
        unsafeAdd(self, fiber)
        return fiber
      }
    }
  )

/**
 * @since 2.0.0
 * @categories combinators
 */
export const size = <A, E>(self: FiberSet<A, E>): Effect.Effect<number> => Effect.sync(() => self.backing.size)
