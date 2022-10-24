import * as Equal from "@fp-ts/data/Equal"
import { pipe } from "@fp-ts/data/Function"
import type * as HashSet from "@fp-ts/data/HashSet"

/**
 * @category symbol
 * @since 1.0.0
 */
export const FiberIdSym = Symbol.for("@effect/core/io/FiberId")

/**
 * @category symbol
 * @since 1.0.0
 */
export type FiberIdSym = typeof FiberIdSym

/**
 * @tsplus type effect/core/io/FiberId
 * @category model
 * @since 1.0.0
 */
export interface FiberId extends Equal.Equal {
  readonly [FiberIdSym]: FiberIdSym
}

/**
 * @since 1.0.0
 */
export declare namespace FiberId {
  type Runtime = RuntimeFiberId
}

/**
 * @tsplus type effect/core/io/FiberId.Ops
 * @category model
 * @since 1.0.0
 */
export interface FiberIdOps {
  $: FiberIdAspects
}
export const FiberId: FiberIdOps = {
  $: {}
}

/**
 * @tsplus type effect/core/io/FiberId.Aspects
 * @category model
 * @since 1.0.0
 */
export interface FiberIdAspects {}

export type RealFiberId = None | RuntimeFiberId | CompositeFiberId

/**
 * @tsplus macro remove
 */
export function realFiberId(_: FiberId): asserts _ is RealFiberId {
  //
}

/** @internal */
export class None implements FiberId, Equal.Equal {
  readonly _tag = "None"

  readonly [FiberIdSym]: FiberIdSym = FiberIdSym;

  [Equal.symbolHash](): number {
    return Equal.hash(this._tag)
  }

  [Equal.symbolEqual](that: unknown): boolean {
    if (isFiberId(that)) {
      realFiberId(that)
      return that._tag === "None"
    }
    return false
  }
}

/** @internal */
export class RuntimeFiberId implements Equal.Equal {
  readonly _tag = "Runtime"

  readonly [FiberIdSym]: FiberIdSym = FiberIdSym

  constructor(
    readonly id: number,
    readonly startTimeMillis: number
  ) {}

  [Equal.symbolHash](): number {
    return pipe(
      Equal.hash(this._tag),
      Equal.hashCombine(Equal.hash(this.id)),
      Equal.hashCombine(Equal.hash(this.startTimeMillis))
    )
  }

  [Equal.symbolEqual](that: unknown): boolean {
    if (isFiberId(that)) {
      realFiberId(that)
      return this._tag === that._tag &&
        this.id === that.id &&
        this.startTimeMillis === that.startTimeMillis
    }
    return false
  }
}

/** @internal */
export class CompositeFiberId implements FiberId, Equal.Equal {
  readonly _tag = "Composite"

  readonly [FiberIdSym]: FiberIdSym = FiberIdSym

  constructor(readonly fiberIds: HashSet.HashSet<FiberId.Runtime>) {}

  [Equal.symbolHash](): number {
    return pipe(
      Equal.hash(this._tag),
      Equal.hashCombine(Equal.hash(this.fiberIds))
    )
  }

  [Equal.symbolEqual](that: unknown): boolean {
    if (isFiberId(that)) {
      realFiberId(that)
      return that._tag === "Composite" &&
        Equal.equals(this.fiberIds, that.fiberIds)
    }
    return false
  }
}

/**
 * Checks if the specified unknown value is a `FiberId`.
 *
 * @tsplus static effect/core/io/FiberId.Ops isFiberId
 * @category refinements
 * @since 1.0.0
 */
export function isFiberId(self: unknown): self is FiberId {
  return typeof self === "object" && self != null && FiberIdSym in self
}
