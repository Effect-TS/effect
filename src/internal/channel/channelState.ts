import * as Effect from "../../Effect"
import type * as Exit from "../../Exit"
import * as OpCodes from "../opCodes/channelState"
import type { ErasedExecutor } from "./channelExecutor"

/** @internal */
export const ChannelStateTypeId = Symbol.for("effect/ChannelState")

/** @internal */
export type ChannelStateTypeId = typeof ChannelStateTypeId

/** @internal */
export interface ChannelState<R, E> extends ChannelState.Variance<R, E> {}

/** @internal */
export declare namespace ChannelState {
  export interface Variance<R, E> {
    readonly [ChannelStateTypeId]: {
      readonly _R: (_: never) => R
      readonly _E: (_: never) => E
    }
  }
}

/** @internal */
const channelStateVariance = {
  _R: (_: never) => _,
  _E: (_: never) => _
}

/** @internal */
const proto = {
  [ChannelStateTypeId]: channelStateVariance
}

/** @internal */
export type Primitive =
  | Done
  | Emit
  | FromEffect
  | Read

/** @internal */
export type Op<Tag extends string, Body = {}> = ChannelState<never, never> & Body & {
  readonly _tag: Tag
}

/** @internal */
export interface Done extends Op<OpCodes.OP_DONE, {}> {}

/** @internal */
export interface Emit extends Op<OpCodes.OP_EMIT, {}> {}

/** @internal */
export interface FromEffect extends
  Op<OpCodes.OP_FROM_EFFECT, {
    readonly effect: Effect.Effect<unknown, unknown, unknown>
  }>
{}

/** @internal */
export interface Read extends
  Op<OpCodes.OP_READ, {
    readonly upstream: ErasedExecutor<unknown>
    readonly onEffect: (effect: Effect.Effect<unknown, never, void>) => Effect.Effect<unknown, never, void>
    readonly onEmit: (value: unknown) => Effect.Effect<unknown, never, void>
    readonly onDone: (exit: Exit.Exit<unknown, unknown>) => Effect.Effect<unknown, never, void>
  }>
{}

/** @internal */
export const Done = (): ChannelState<never, never> => {
  const op = Object.create(proto)
  op._tag = OpCodes.OP_DONE
  return op
}

/** @internal */
export const Emit = (): ChannelState<never, never> => {
  const op = Object.create(proto)
  op._tag = OpCodes.OP_EMIT
  return op
}

/** @internal */
export const FromEffect = <R, E, _>(effect: Effect.Effect<R, E, _>): ChannelState<R, E> => {
  const op = Object.create(proto)
  op._tag = OpCodes.OP_FROM_EFFECT
  op.effect = effect
  return op
}

/** @internal */
export const Read = <R>(
  upstream: ErasedExecutor<R>,
  onEffect: (effect: Effect.Effect<R, never, void>) => Effect.Effect<R, never, void>,
  onEmit: (value: unknown) => Effect.Effect<R, never, void> | undefined,
  onDone: (exit: Exit.Exit<unknown, unknown>) => Effect.Effect<R, never, void> | undefined
): ChannelState<R, never> => {
  const op = Object.create(proto)
  op._tag = OpCodes.OP_READ
  op.upstream = upstream
  op.onEffect = onEffect
  op.onEmit = onEmit
  op.onDone = onDone
  return op
}

/** @internal */
export const isChannelState = (u: unknown): u is ChannelState<unknown, unknown> =>
  typeof u === "object" && u != null && ChannelStateTypeId in u

/** @internal */
export const isDone = <R, E>(self: ChannelState<R, E>): self is Done => (self as Primitive)._tag === OpCodes.OP_DONE

/** @internal */
export const isEmit = <R, E>(self: ChannelState<R, E>): self is Emit => (self as Primitive)._tag === OpCodes.OP_EMIT

/** @internal */
export const isFromEffect = <R, E>(self: ChannelState<R, E>): self is FromEffect =>
  (self as Primitive)._tag === OpCodes.OP_FROM_EFFECT

/** @internal */
export const isRead = <R, E>(self: ChannelState<R, E>): self is Read => (self as Primitive)._tag === OpCodes.OP_READ

/** @internal */
export const effect = <R, E>(self: ChannelState<R, E>): Effect.Effect<R, E, void> =>
  isFromEffect(self) ? self.effect as Effect.Effect<R, E, void> : Effect.unit

/** @internal */
export const effectOrUndefinedIgnored = <R, E>(self: ChannelState<R, E>): Effect.Effect<R, E, void> | undefined =>
  isFromEffect(self) ? Effect.ignore(self.effect as Effect.Effect<R, E, void>) : undefined
