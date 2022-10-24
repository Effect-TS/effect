import type { ErasedExecutor } from "@effect/core/stream/Channel/ChannelExecutor"

/**
 * @category symbol
 * @since 1.0.0
 */
export const ChannelStateSym = Symbol.for("@effect/core/stream/Channel/ChannelState")

/**
 * @category symbol
 * @since 1.0.0
 */
export type ChannelStateSym = typeof ChannelStateSym

/**
 * @category symbol
 * @since 1.0.0
 */
export const _R = Symbol.for("@effect/core/stream/Channel/ChannelState/R")

/**
 * @category symbol
 * @since 1.0.0
 */
export type _R = typeof _R

/**
 * @category symbol
 * @since 1.0.0
 */
export const _E = Symbol.for("@effect/core/stream/Channel/ChannelState/E")

/**
 * @category symbol
 * @since 1.0.0
 */
export type _E = typeof _E

/**
 * @tsplus type effect/core/stream/Channel/State
 * @category model
 * @since 1.0.0
 */
export interface ChannelState<R, E> {
  readonly [ChannelStateSym]: ChannelStateSym
  readonly [_R]: (_: R) => void
  readonly [_E]: () => E
}

/**
 * @since 1.0.0
 */
export declare namespace ChannelState {
  type Done = ChannelStateDone
  type Emit = ChannelStateEmit
  type Effect<R, E> = ChannelStateEffect<R, E>
  type Read<R, E> = ChannelStateRead<R, E>
}

/** @internal */
export abstract class ChannelStateBase<R, E> implements ChannelState<R, E> {
  readonly [ChannelStateSym]: ChannelStateSym = ChannelStateSym
  readonly [_R]!: (_: R) => void
  readonly [_E]!: () => E
}

/**
 * @category model
 * @since 1.0.0
 */
export class ChannelStateDone extends ChannelStateBase<unknown, never> {
  readonly _tag = "Done"
}

/**
 * @category model
 * @since 1.0.0
 */
export class ChannelStateEmit extends ChannelStateBase<unknown, never> {
  readonly _tag = "Emit"
}

/**
 * @category model
 * @since 1.0.0
 */
export class ChannelStateEffect<R, E> extends ChannelStateBase<R, E> {
  readonly _tag = "Effect"
  constructor(readonly effect: Effect<R, E, unknown>) {
    super()
  }
}

/**
 * @category model
 * @since 1.0.0
 */
export class ChannelStateRead<R, E> extends ChannelStateBase<R, E> {
  readonly _tag = "Read"
  constructor(
    readonly upstream: ErasedExecutor<R>,
    readonly onEffect: (_: Effect<R, never, void>) => Effect<R, never, void>,
    readonly onEmit: (_: unknown) => Effect<R, never, void> | undefined,
    readonly onDone: (_: Exit<unknown, unknown>) => Effect<R, never, void> | undefined
  ) {
    super()
  }
}

/**
 * @tsplus type effect/core/stream/Channel/State.Ops
 * @category model
 * @since 1.0.0
 */
export interface ChannelStateOps {}
export const ChannelState: ChannelStateOps = {}

/**
 * @tsplus unify effect/core/stream/Channel/State
 */
export function unifyChannelState<X extends ChannelState<any, any>>(
  self: X
): ChannelState<
  [X] extends [{ [_R]: () => infer R }] ? R : never,
  [X] extends [{ [_E]: () => infer E }] ? E : never
> {
  return self
}

/**
 * @tsplus macro remove
 * @internal
 */
export function concreteChannelState<R, E>(
  _: ChannelState<R, E>
): asserts _ is
  | ChannelStateDone
  | ChannelStateEmit
  | ChannelStateEffect<R, E>
  | ChannelStateRead<R, E>
{
  //
}

/**
 * @tsplus static effect/core/stream/Channel/State.Ops Done
 * @category constructors
 * @since 1.0.0
 */
export const channelStateDone: ChannelState<unknown, never> = new ChannelStateDone()

/**
 * @tsplus static effect/core/stream/Channel/State.Ops Emit
 * @category constructors
 * @since 1.0.0
 */
export const channelStateEmit: ChannelState<unknown, never> = new ChannelStateEmit()

/**
 * @tsplus static effect/core/stream/Channel/State.Ops Effect
 * @category constructors
 * @since 1.0.0
 */
export function channelStateEffect<R, E>(
  effect: Effect<R, E, unknown>
): ChannelState<R, E> {
  return new ChannelStateEffect(effect)
}

/**
 * @tsplus static effect/core/stream/Channel/State.Ops Read
 * @category constructors
 * @since 1.0.0
 */
export function channelStateRead<R, _E>(
  upstream: ErasedExecutor<R>,
  onEffect: (_: Effect<R, never, void>) => Effect<R, never, void>,
  onEmit: (_: unknown) => Effect<R, never, void> | undefined,
  onDone: (_: Exit<unknown, unknown>) => Effect<R, never, void> | undefined
): ChannelState<R, _E> {
  return new ChannelStateRead(upstream, onEffect, onEmit, onDone)
}

/**
 * @tsplus fluent effect/core/stream/Channel/State effectOrUnit
 * @category mutations
 * @since 1.0.0
 */
export function effectOrUnit<R, E>(
  self: ChannelState<R, E>
): Effect<R, E, unknown> {
  concreteChannelState(self)
  return self._tag === "Effect" ? self.effect : Effect.unit
}

/**
 * @tsplus fluent effect/core/stream/Channel/State effectOrUndefinedIgnored
 * @category mutations
 * @since 1.0.0
 */
export function effectOrUndefinedIgnored<R, E>(
  self: ChannelState<R, E>
): Effect<R, never, void> | undefined {
  concreteChannelState(self)
  return self._tag === "Effect" ? self.effect.ignore.unit : undefined
}
