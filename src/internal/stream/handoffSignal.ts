import type { Cause } from "../../Cause.js"
import type { Chunk } from "../../Chunk.js"
import type { SinkEndReason } from "./sinkEndReason.js"

/** @internal */
export type HandoffSignal<E, A> = Emit<A> | Halt<E> | End

/** @internal */
export const OP_EMIT = "Emit" as const

/** @internal */
export type OP_EMIT = typeof OP_EMIT

/** @internal */
export const OP_HALT = "Halt" as const

/** @internal */
export type OP_HALT = typeof OP_HALT

/** @internal */
export const OP_END = "End" as const

/** @internal */
export type OP_END = typeof OP_END

export interface Emit<A> {
  readonly _tag: OP_EMIT
  readonly elements: Chunk<A>
}

/** @internal */
export interface Halt<E> {
  readonly _tag: OP_HALT
  readonly cause: Cause<E>
}

/** @internal */
export interface End {
  readonly _tag: OP_END
  readonly reason: SinkEndReason
}

/** @internal */
export const emit = <A>(elements: Chunk<A>): HandoffSignal<never, A> => ({
  _tag: OP_EMIT,
  elements
})

/** @internal */
export const halt = <E>(cause: Cause<E>): HandoffSignal<E, never> => ({
  _tag: OP_HALT,
  cause
})

/** @internal */
export const end = (reason: SinkEndReason): HandoffSignal<never, never> => ({
  _tag: OP_END,
  reason
})
