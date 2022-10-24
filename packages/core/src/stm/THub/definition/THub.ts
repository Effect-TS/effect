import type { Node as NodeInternal, NodeOps } from "@effect/core/stm/THub/definition/Node"
import type { TDequeue as TDequeueInternal } from "@effect/core/stm/THub/definition/TDequeue"
import { TDequeueOps } from "@effect/core/stm/THub/definition/TDequeue"

/**
 * @category symbol
 * @since 1.0.0
 */
export const THubSym = Symbol.for("@effect/core/stm/THub")

/**
 * @category symbol
 * @since 1.0.0
 */
export type THubSym = typeof THubSym

/**
 * @category symbol
 * @since 1.0.0
 */
export const _A = Symbol.for("@effect/core/stm/THub/A")

/**
 * @category symbol
 * @since 1.0.0
 */
export type _A = typeof _A

/**
 * @since 1.0.0
 */
export declare namespace THub {
  export type Node<A> = NodeInternal<A>
  export type Strategy = BackPressure | Dropping | Sliding
  export interface TDequeue<A> extends TDequeueInternal<A> {}
}

/**
 * A `THub` is a transactional message hub. Publishers can publish messages to
 * the hub and subscribers can subscribe to take messages from the hub.
 *
 * @tsplus type effect/core/stm/THub
 * @category model
 * @since 1.0.0
 */
export interface THub<A> {}

/**
 * @tsplus type effect/core/stm/THub.Ops
 * @category model
 * @since 1.0.0
 */
export interface THubOps {
  $: THubAspects
  Node: NodeOps
  TDequeue: TDequeueOps
}
export const THub: THubOps = {
  $: {},
  TDequeue: TDequeueOps,
  Node: {}
}

/**
 * @tsplus type effect/core/stm/THub.Aspects
 * @category model
 * @since 1.0.0
 */
export interface THubAspects {}

/**
 * @category model
 * @since 1.0.0
 */
export interface BackPressure {
  _tag: "BackPressure"
}

/**
 * @category model
 * @since 1.0.0
 */
export interface Dropping {
  _tag: "Dropping"
}

/**
 * @category model
 * @since 1.0.0
 */
export interface Sliding {
  _tag: "Sliding"
}

/**
 * A strategy that retries if the hub is at capacity.
 *
 * @tsplus static effect/core/stm/THub.Ops BackPressure
 * @category constructors
 * @since 1.0.0
 */
export const BackPressure: THub.Strategy = {
  _tag: "BackPressure"
}

/**
 * A strategy that drops new messages if the hub is at capacity.
 *
 * @tsplus static effect/core/stm/THub.Ops Dropping
 * @category constructors
 * @since 1.0.0
 */
export const Dropping: THub.Strategy = {
  _tag: "Dropping"
}

/**
 * A strategy that drops old messages if the hub is at capacity.
 *
 * @tsplus static effect/core/stm/THub.Ops Sliding
 * @category constructors
 * @since 1.0.0
 */
export const Sliding: THub.Strategy = {
  _tag: "Sliding"
}
