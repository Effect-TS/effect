/**
 * @since 2.0.0
 */
import * as Effect from "./Effect.js"
import { dual } from "./Function.js"
import { type Pipeable, pipeArguments } from "./Pipeable.js"
import { hasProperty } from "./Predicate.js"
import * as Stream from "./Stream.js"

/**
 * @since 2.0.0
 * @category type ids
 */
export const TypeId = Symbol.for("effect/Subscribable")

/**
 * @since 2.0.0
 * @category type ids
 */
export type TypeId = typeof TypeId

/**
 * @since 2.0.0
 * @category models
 */
export interface Subscribable<A, E = never, R = never> extends Pipeable {
  readonly [TypeId]: TypeId
  readonly get: Effect.Effect<A, E, R>
  readonly changes: Stream.Stream<A, E, R>
}

/**
 * @since 2.0.0
 * @category refinements
 */
export const isSubscribable = (u: unknown): u is Subscribable<unknown, unknown, unknown> => hasProperty(u, TypeId)

const Proto: Omit<Subscribable<any>, "get" | "changes"> = {
  [TypeId]: TypeId,
  pipe() {
    return pipeArguments(this, arguments)
  }
}

/**
 * @since 2.0.0
 * @category constructors
 */
export const make = <A, E, R, B, E2, R2>(options: {
  readonly get: Effect.Effect<A, E, R>
  readonly changes: Stream.Stream<B, E2, R2>
}): Subscribable<A | B, E | E2, R | R2> => Object.assign(Object.create(Proto), options)

/**
 * @since 2.0.0
 * @category combinators
 */
export const map: {
  <A, B>(f: (a: NoInfer<A>) => B): <E, R>(fa: Subscribable<A, E, R>) => Subscribable<B, E, R>
  <A, E, R, B>(self: Subscribable<A, E, R>, f: (a: NoInfer<A>) => B): Subscribable<B, E, R>
} = dual(2, <A, E, R, B>(self: Subscribable<A, E, R>, f: (a: NoInfer<A>) => B): Subscribable<B, E, R> =>
  make({
    get: Effect.map(self.get, f),
    changes: Stream.map(self.changes, f)
  }))

/**
 * @since 2.0.0
 * @category combinators
 */
export const mapEffect: {
  <A, B, E2, R2>(
    f: (a: NoInfer<A>) => Effect.Effect<B, E2, R2>
  ): <E, R>(fa: Subscribable<A, E, R>) => Subscribable<B, E | E2, R | R2>
  <A, E, R, B, E2, R2>(
    self: Subscribable<A, E, R>,
    f: (a: NoInfer<A>) => Effect.Effect<B, E2, R2>
  ): Subscribable<B, E | E2, R | R2>
} = dual(2, <A, E, R, B, E2, R2>(
  self: Subscribable<A, E, R>,
  f: (a: NoInfer<A>) => Effect.Effect<B, E2, R2>
): Subscribable<B, E | E2, R | R2> =>
  make({
    get: Effect.flatMap(self.get, f),
    changes: Stream.mapEffect(self.changes, f)
  }))
