import type { FiberStatus } from "@effect/core/io/Fiber/status"

export const FiberSym = Symbol.for("@effect/core/io/Fiber")
export type FiberSym = typeof FiberSym

export const _E = Symbol.for("@effect/core/io/Fiber/E")
export type _E = typeof _E

export const _A = Symbol.for("@effect/core/io/Fiber/A")
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
 */
export interface Fiber<E, A> {
  readonly [FiberSym]: FiberSym
  readonly [_E]: () => E
  readonly [_A]: () => A
}

export type RealFiber<E, A> = Fiber.Runtime<E, A> | Fiber.Synthetic<E, A>

export declare namespace Fiber {
  export type Runtime<E, A> = RuntimeFiber<E, A>
  export type Synthetic<E, A> = SyntheticFiber<E, A>

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
    readonly interrupters: HashSet<FiberId>
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
 */
export interface FiberOps {
  $: FiberAspects
}
export const Fiber: FiberOps = {
  $: {}
}

/**
 * @tsplus type effect/core/io/Fiber.Aspects
 */
export interface FiberAspects {}

/**
 * @tsplus macro remove
 */
export function realFiber<E, A>(fiber: Fiber<E, A>): asserts fiber is RealFiber<E, A> {
  //
}

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
  readonly children: Effect<never, never, Chunk<Fiber.Runtime<any, any>>>

  /**
   * Inherits values from all `FiberRef` instances into current fiber. This
   * will resume immediately.
   */
  readonly inheritAll: Effect<never, never, void>

  /**
   * Tentatively observes the fiber, but returns immediately if it is not
   * already done.
   */
  readonly poll: Effect<never, never, Maybe<Exit<E, A>>>

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
    readonly children: Effect<never, never, Chunk<Fiber.Runtime<any, any>>>,
    readonly inheritAll: Effect<never, never, void>,
    readonly poll: Effect<never, never, Maybe<Exit<E, A>>>,
    readonly interruptAsFork: (fiberId: FiberId) => Effect<never, never, void>
  ) {
    this.await = _await
  }
}

/**
 * @tsplus static effect/core/io/Fiber.Ops Ord
 */
export const ordFiber: Ord<Fiber.Runtime<unknown, unknown>> = Ord.tuple(Ord.number, Ord.number)
  .contramap((fiber) =>
    Tuple(
      (fiber.id as FiberId.Runtime).startTimeMillis,
      (fiber.id as FiberId.Runtime).id
    )
  )

export function makeSynthetic<E, A>(_: {
  readonly id: FiberId
  readonly await: Effect<never, never, Exit<E, A>>
  readonly children: Effect<never, never, Chunk<Fiber.Runtime<any, any>>>
  readonly inheritAll: Effect<never, never, void>
  readonly poll: Effect<never, never, Maybe<Exit<E, A>>>
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
