import type * as Chunk from "../../Chunk.js"
import type * as Fiber from "../../Fiber.js"
import type * as HandoffSignal from "./handoffSignal.js"

/** @internal */
export type DebounceState<E, A> = NotStarted | Previous<A> | Current<E, A>

/** @internal */
export const OP_NOT_STARTED = "NotStarted" as const

/** @internal */
export type OP_NOT_STARTED = typeof OP_NOT_STARTED

/** @internal */
export const OP_PREVIOUS = "Previous" as const

/** @internal */
export type OP_PREVIOUS = typeof OP_PREVIOUS

/** @internal */
export const OP_CURRENT = "Current" as const

/** @internal */
export type OP_CURRENT = typeof OP_CURRENT

export interface NotStarted {
  readonly _tag: OP_NOT_STARTED
}

/** @internal */
export interface Previous<out A> {
  readonly _tag: OP_PREVIOUS
  readonly fiber: Fiber.Fiber<never, Chunk.Chunk<A>>
}

/** @internal */
export interface Current<out E, out A> {
  readonly _tag: OP_CURRENT
  readonly fiber: Fiber.Fiber<E, HandoffSignal.HandoffSignal<E, A>>
}

/** @internal */
export const notStarted: DebounceState<never, never> = {
  _tag: OP_NOT_STARTED
}

/** @internal */
export const previous = <A>(fiber: Fiber.Fiber<never, Chunk.Chunk<A>>): DebounceState<never, A> => ({
  _tag: OP_PREVIOUS,
  fiber
})

/** @internal */
export const current = <E, A>(fiber: Fiber.Fiber<E, HandoffSignal.HandoffSignal<E, A>>): DebounceState<E, A> => ({
  _tag: OP_CURRENT,
  fiber
})
