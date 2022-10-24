import * as Equal from "@fp-ts/data/Equal"
import { pipe } from "@fp-ts/data/Function"

const InterruptStatusSymbolKey = "@effect/core/io/InterruptStatus"

/**
 * @category symbol
 * @since 1.0.0
 */
export const InterruptStatusTypeId = Symbol.for(InterruptStatusSymbolKey)

/**
 * @category symbol
 * @since 1.0.0
 */
export type InterruptStatusTypeId = typeof InterruptStatusTypeId

/**
 * The `InterruptStatus` of a fiber determines whether or not it can be
 * interrupted. The status can change over time in different regions.
 *
 * @tsplus type effect/core/io/InterruptStatus
 * @category model
 * @since 1.0.0
 */
export interface InterruptStatus extends Equal.Equal {
  readonly _id: InterruptStatusTypeId
  readonly isInterruptible: boolean
  readonly isUninterruptible: boolean
  readonly toBoolean: boolean
}

/**
 * @tsplus type effect/core/io/InterruptStatus.Ops
 * @category model
 * @since 1.0.0
 */
export interface InterruptStatusOps {
  $: InterruptStatusAspects
}
export const InterruptStatus: InterruptStatusOps = {
  $: {}
}

/**
 * @tsplus type effect/core/io/InterruptStatus.Aspects
 * @category model
 * @since 1.0.0
 */
export interface InterruptStatusAspects {}

export class InterruptStatusImpl implements InterruptStatus {
  readonly _id: InterruptStatusTypeId = InterruptStatusTypeId

  constructor(readonly isInterruptible: boolean) {}

  get isUninterruptible(): boolean {
    return !this.isInterruptible
  }

  get toBoolean(): boolean {
    return this.isInterruptible
  }

  [Equal.symbolHash](): number {
    return pipe(
      Equal.hash(InterruptStatusSymbolKey),
      Equal.hashCombine(Equal.hash(this.isInterruptible))
    )
  }

  [Equal.symbolEqual](u: unknown): boolean {
    return isInterruptStatus(u) && this.isInterruptible === u.isInterruptible
  }
}

/**
 * @tsplus static effect/core/io/InterruptStatus.Ops isInterruptStatus
 * @category refinements
 * @since 1.0.0
 */
export function isInterruptStatus(u: unknown): u is InterruptStatus {
  return typeof u === "object" && u != null && "_id" in u && u["_id"] === InterruptStatusTypeId
}

/**
 * Indicates the fiber can be interrupted right now.
 *
 * @tsplus static effect/core/io/InterruptStatus.Ops Interruptible
 * @category constructors
 * @since 1.0.0
 */
export const Interruptible: InterruptStatus = new InterruptStatusImpl(true)

/**
 * Indicates the fiber cannot be interrupted right now.
 *
 * @tsplus static effect/core/io/InterruptStatus.Ops Uninterruptible
 * @category constructors
 * @since 1.0.0
 */
export const Uninterruptible: InterruptStatus = new InterruptStatusImpl(false)

/**
 * @tsplus static effect/core/io/InterruptStatus.Ops fromBoolean
 * @category constructors
 * @since 1.0.0
 */
export function fromBoolean(b: boolean): InterruptStatus {
  return b ? Interruptible : Uninterruptible
}
