/**
 * Low-level helpers for making custom values behave like Effects. The module
 * exposes a prototype builder, an abstract base class, and a mixin that let
 * domain-specific values, such as service keys or configuration descriptions,
 * be evaluated by Effect and yielded inside `Effect.gen`.
 *
 * @since 4.0.0
 */
import type * as Effect from "./Effect.ts"
import type * as Fiber from "./Fiber.ts"
import type * as Inspectable from "./Inspectable.ts"
import { type EffectTypeId, evaluate, makePrimitiveProto } from "./internal/core.ts"
import type * as Pipeable from "./Pipeable.ts"

/**
 * Create a low-level `Effect` prototype.
 *
 * **When to use**
 *
 * Use when you need to create a custom Effect-like value without extending a
 * class, by providing a label and an evaluate function that receives the
 * current fiber.
 *
 * **Details**
 *
 * When the effect is evaluated, it calls `evaluate` with the current fiber.
 *
 * @see {@link Class} for a class-based approach to defining custom Effect values
 * @see {@link Mixin} for wrapping an existing class constructor
 *
 * @category prototypes
 * @since 4.0.0
 */
export const Prototype = <A extends Effect.Effect<any, any, any>>(options: {
  readonly label: string
  readonly evaluate: (
    this: A,
    fiber: Fiber.Fiber<any, any>
  ) => Effect.Effect<Effect.Success<A>, Effect.Error<A>, Effect.Services<A>>
}): Effect.Effect<Effect.Success<A>, Effect.Error<A>, Effect.Services<A>> =>
  makePrimitiveProto({
    op: options.label,
    [evaluate]: options.evaluate
  }) as any

const proto = Prototype({
  label: "Effectable",
  evaluate(_) {
    return (this as any).override
  }
})

const Base: new<A, E, R>() => Effect.Effect<A, E, R> = (() => {
  const Base = function() {}
  Base.prototype = proto
  return Base as any
})()

/**
 * Provides an abstract class that can be extended to create an `Effect`.
 *
 * **When to use**
 *
 * Use as an abstract base class to define custom classes whose instances behave
 * as `Effect` values.
 *
 * @see {@link Prototype} for a lower-level primitive approach to creating custom Effect-like values without a class
 * @see {@link Mixin} for wrapping an existing class constructor
 * @category constructors
 * @since 2.0.0
 */
export abstract class Class<A, E = never, R = never> extends Base<A, E, R> {
  abstract override: Effect.Effect<A, E, R>
}

type OverrideEffect<Self> = Self extends {
  override: infer Override extends Effect.Effect<any, any, any>
} ? Override
  : never

interface EffectableFromOverride extends Pipeable.Pipeable, Inspectable.Inspectable {
  readonly [EffectTypeId]: OverrideEffect<this>[typeof EffectTypeId]
  [Symbol.iterator](): Effect.EffectIterator<OverrideEffect<this>>
}

/**
 * Constructor type for classes whose instances behave as `Effect` values.
 *
 * **When to use**
 *
 * Use as the constructor-side type when a class value should be known to create
 * instances that can be evaluated by Effect.
 *
 * @see {@link Class} for the base constructor
 * @see {@link Mixin} for wrapping an existing class constructor
 *
 * @category models
 * @since 4.0.0
 */
export type EffectableConstructor = abstract new(...args: ReadonlyArray<any>) => EffectableFromOverride

/**
 * Returns a subclass of the provided class that inserts the Effect prototype
 * into the inheritance chain.
 *
 * **When to use**
 *
 * Use to make instances of an existing class behave as `Effect` values without
 * extending {@link Class} or modifying the original prototype.
 *
 * **Details**
 *
 * Pass the class to wrap, then define the `override` Effect on the final class.
 * The returned class is abstract, and the success, error, and service types are
 * inferred from the concrete `override` property. The original constructor and
 * instance members are preserved.
 *
 * **Example** (Evaluating a mixed-in class)
 *
 * ```ts import.meta.vitest
 * import { Effect, Effectable } from "effect"
 *
 * class Box {
 *   constructor(readonly value: number) {}
 * }
 *
 * class EffectBox extends Effectable.Mixin(Box) {
 *   override = Effect.succeed(this.value)
 * }
 *
 * const box = new EffectBox(2)
 * Effect.isEffect(box) // => true
 * await Effect.runPromise(box) // => 2
 * ```
 *
 * @see {@link Prototype} for a lower-level primitive approach to creating custom Effect-like values without a class
 * @see {@link Class} for a base constructor to extend
 * @category constructors
 * @since 4.0.0
 */
export const Mixin = <TBase extends new(...args: ReadonlyArray<any>) => any>(
  klass: TBase
) => {
  abstract class Mixed extends klass {
    abstract override: Effect.Effect<any, any, any>
  }
  Object.setPrototypeOf(
    Mixed.prototype,
    Object.create(klass.prototype, Object.getOwnPropertyDescriptors(proto))
  )
  return Mixed as typeof Mixed & EffectableConstructor
}
