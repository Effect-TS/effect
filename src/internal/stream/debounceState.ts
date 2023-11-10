import type { Chunk } from "../../Chunk.js"
import type { Fiber } from "../../Fiber.js"
import type { HandoffSignal } from "./handoffSignal.js"

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
export interface Previous<A> {
  readonly _tag: OP_PREVIOUS
  readonly fiber: Fiber<never, Chunk<A>>
}

/** @internal */
export interface Current<E, A> {
  readonly _tag: OP_CURRENT
  readonly fiber: Fiber<E, HandoffSignal<E, A>>
}

/** @internal */
export const notStarted: DebounceState<never, never> = {
  _tag: OP_NOT_STARTED
}

/** @internal */
export const previous = <A>(fiber: Fiber<never, Chunk<A>>): DebounceState<never, A> => ({
  _tag: OP_PREVIOUS,
  fiber
})

/** @internal */
export const current = <E, A>(fiber: Fiber<E, HandoffSignal<E, A>>): DebounceState<E, A> => ({
  _tag: OP_CURRENT,
  fiber
})
