import type { FiberDump } from "@effect/core/io/Fiber/_internal/dump"
import type { FiberStatus } from "@effect/core/io/Fiber/status"
import * as order from "@fp-ts/core/typeclass/Order"
import type * as Chunk from "@fp-ts/data/Chunk"
import { pipe } from "@fp-ts/data/Function"
import type * as HashSet from "@fp-ts/data/HashSet"
import * as Number from "@fp-ts/data/Number"
import type * as Option from "@fp-ts/data/Option"

/**
 * @category symbol
 * @since 1.0.0
 */
export const FiberSym = Symbol.for("@effect/core/io/Fiber")

/**
 * @category symbol
 * @since 1.0.0
 */
export type FiberSym = typeof FiberSym

/**
 * @category symbol
 * @since 1.0.0
 */
export const _E = Symbol.for("@effect/core/io/Fiber/E")

/**
 * @category symbol
 * @since 1.0.0
 */
export type _E = typeof _E

/**
 * @category symbol
 * @since 1.0.0
 */
export const _A = Symbol.for("@effect/core/io/Fiber/A")

/**
 * @category symbol
 * @since 1.0.0
 */
export type _A = typeof _A

/**
 * A fiber is a lightweight thread of execution that never consumes more than a
 * whole thread (but may consume much less, depending on contention and
 * asynchronicity). Fibers are spawned by forking ZIO effects, which run
 * concurrently with the parent effect.
 *
 * Fibers can be joined, yielding their result to other fibers, or interrupted,
 * which terminates the fiber, safely releasing all resources.
 *
 * @tsplus type effect/core/io/Fiber
 * @category model
 * @since 1.0.0
 */
export interface Fiber<E, A> {
  readonly [FiberSym]: FiberSym
  readonly [_E]: () => E
  readonly [_A]: () => A
}

/** @internal */
export type RealFiber<E, A> = Fiber.Runtime<E, A> | Fiber.Synthetic<E, A>

/**
 * @since 1.0.0
 */
export declare namespace Fiber {
  export type Runtime<E, A> = RuntimeFiber<E, A>
  export type Synthetic<E, A> = SyntheticFiber<E, A>

  export type Dump = FiberDump
  export type Status = FiberStatus

  export interface Descriptor {
    /**
     * The unique identifier of the `Fiber`.
     */
    readonly id: FiberId
    /**
     * The status of the `Fiber`.
     */
    readonly status: FiberStatus
    /**
     * The set of fibers attempting to interrupt the fiber or its ancestors.
     */
    readonly interrupters: HashSet.HashSet<FiberId>
  }
}

/**
 * @tsplus unify effect/core/io/Fiber
 */
export function unifyFiber<X extends Fiber<any, any>>(
  self: X
): Fiber<
  [X] extends [{ [_E]: () => infer E }] ? E : never,
  [X] extends [{ [_A]: () => infer A }] ? A : never
> {
  return self
}

/**
 * @tsplus type effect/core/io/Fiber.Ops
 * @category model
 * @since 1.0.0
 */
export interface FiberOps {
  $: FiberAspects
}
export const Fiber: FiberOps = {
  $: {}
}

/**
 * @tsplus type effect/core/io/Fiber.Aspects
 * @category model
 * @since 1.0.0
 */
export interface FiberAspects {}

/**
 * @tsplus macro remove
 */
export function realFiber<E, A>(fiber: Fiber<E, A>): asserts fiber is RealFiber<E, A> {
  //
}

/**
 * @category model
 * @since 1.0.0
 */
export interface BaseFiber<E, A> extends Fiber<E, A> {
  /**
   * The identity of the fiber.
   */
  readonly id: FiberId

  /**
   * Awaits the fiber, which suspends the awaiting fiber until the result of the
   * fiber has been determined.
   */
  readonly await: Effect<never, never, Exit<E, A>>

  /**
   * Retrieves the immediate children of the fiber.
   */
  readonly children: Effect<never, never, Chunk.Chunk<Fiber.Runtime<any, any>>>

  /**
   * Inherits values from all `FiberRef` instances into current fiber. This
   * will resume immediately.
   */
  readonly inheritAll: Effect<never, never, void>

  /**
   * Tentatively observes the fiber, but returns immediately if it is not
   * already done.
   */
  readonly poll: Effect<never, never, Option.Option<Exit<E, A>>>

  /**
   * In the background, interrupts the fiber as if interrupted from the
   * specified fiber. If the fiber has already exited, the returned effect will
   * resume immediately. Otherwise, the effect will resume when the fiber exits.
   */
  readonly interruptAsFork: (fiberId: FiberId) => Effect<never, never, void>
}

/**
 * A runtime fiber that is executing an effect. Runtime fibers have an
 * identity and a trace.
 *
 * @tsplus type effect/core/io/Fiber/Runtime
 * @category model
 * @since 1.0.0
 */
export interface RuntimeFiber<E, A> extends BaseFiber<E, A> {
  readonly _tag: "RuntimeFiber"

  /**
   * The identity of the fiber.
   */
  readonly id: FiberId.Runtime

  /**
   * The status of the fiber.
   */
  readonly status: Effect<never, never, FiberStatus>
}

/**
 * A synthetic fiber that is created from a pure value or that combines
 * existing fibers.
 *
 * @tsplus type effect/core/io/Fiber/Synthetic
 * @category model
 * @since 1.0.0
 */
export class SyntheticFiber<E, A> implements BaseFiber<E, A> {
  readonly _tag = "SyntheticFiber"

  readonly [FiberSym]: FiberSym = FiberSym
  readonly [_E]!: () => E
  readonly [_A]!: () => A
  readonly await: Effect<never, never, Exit<E, A>>
  constructor(
    readonly id: FiberId,
    _await: Effect<never, never, Exit<E, A>>,
    readonly children: Effect<never, never, Chunk.Chunk<Fiber.Runtime<any, any>>>,
    readonly inheritAll: Effect<never, never, void>,
    readonly poll: Effect<never, never, Option.Option<Exit<E, A>>>,
    readonly interruptAsFork: (fiberId: FiberId) => Effect<never, never, void>
  ) {
    this.await = _await
  }
}

/**
 * @tsplus static effect/core/io/Fiber.Ops Order
 * @category instances
 * @since 1.0.0
 */
export const Order: order.Order<Fiber.Runtime<unknown, unknown>> = pipe(
  order.tuple(Number.Order, Number.Order),
  order.contramap((fiber: Fiber.Runtime<unknown, unknown>) =>
    [
      (fiber.id as FiberId.Runtime).startTimeMillis,
      (fiber.id as FiberId.Runtime).id
    ] as const
  )
)

/**
 * @category constructors
 * @since 1.0.0
 */
export function makeSynthetic<E, A>(_: {
  readonly id: FiberId
  readonly await: Effect<never, never, Exit<E, A>>
  readonly children: Effect<never, never, Chunk.Chunk<Fiber.Runtime<any, any>>>
  readonly inheritAll: Effect<never, never, void>
  readonly poll: Effect<never, never, Option.Option<Exit<E, A>>>
  readonly interruptAsFork: (fiberId: FiberId) => Effect<never, never, void>
}): Fiber<E, A> {
  return new SyntheticFiber(
    _.id,
    _.await,
    _.children,
    _.inheritAll,
    _.poll,
    _.interruptAsFork
  )
}
