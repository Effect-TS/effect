import type { Node as NodeInternal, NodeOps } from "@effect/core/stm/THub/definition/Node"
import type { TDequeue as TDequeueInternal } from "@effect/core/stm/THub/definition/TDequeue"
import { TDequeueOps } from "@effect/core/stm/THub/definition/TDequeue"

export const THubSym = Symbol.for("@effect/core/stm/THub")
export type THubSym = typeof THubSym

export const _A = Symbol.for("@effect/core/stm/THub/A")
export type _A = typeof _A

export declare namespace THub {
  export type Node<A> = NodeInternal<A>
  export type Strategy = BackPressure | Dropping | Sliding
  export interface TDequeue<A> extends TDequeueInternal<A> {}
}

/**
 * A `THub` is a transactional queue. Offerors can offer values to the queue
 * and takers can take values from the queue.
 *
 * @tsplus type effect/core/stm/THub
 */
export interface THub<A> {}

/**
 * @tsplus type effect/core/stm/THub.Ops
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
 */
export interface THubAspects {}

export interface BackPressure {
  _tag: "BackPressure"
}

export interface Dropping {
  _tag: "Dropping"
}

export interface Sliding {
  _tag: "Sliding"
}

/**
 * @tsplus static effect/core/stm/THub.Ops BackPressure
 */
export const BackPressure: THub.Strategy = {
  _tag: "BackPressure"
}

/**
 * @tsplus static effect/core/stm/THub.Ops Dropping
 */
export const Dropping: THub.Strategy = {
  _tag: "Dropping"
}

/**
 * @tsplus static effect/core/stm/THub.Ops Sliding
 */
export const Sliding: THub.Strategy = {
  _tag: "Sliding"
}
