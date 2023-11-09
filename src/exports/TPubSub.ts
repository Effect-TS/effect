import type * as internal from "../internal/stm/tPubSub.js"
import type * as tQueue from "../internal/stm/tQueue.js"
import type { TPubSubTypeId } from "../TPubSub.js"
import type { HashSet } from "./HashSet.js"
import type { TQueue } from "./TQueue.js"
import type { TRef } from "./TRef.js"

export * from "../internal/Jumpers/TPubSub.js"
export * from "../TPubSub.js"

export declare namespace TPubSub {
  // eslint-disable-next-line import/no-cycle
  // @ts-expect-error
  export type * from "../TPubSub.js"
}
/**
 * @since 2.0.0
 * @category models
 */
export interface TPubSub<A> extends TQueue.TEnqueue<A> {}
/**
 * @internal
 * @since 2.0.0
 */
export interface TPubSub<A> {
  readonly [TPubSubTypeId]: TPubSubTypeId
  /** @internal */
  readonly pubsubSize: TRef<number>
  /** @internal */
  readonly publisherHead: TRef<TRef<internal.Node<A> | undefined>>
  /** @internal */
  readonly publisherTail: TRef<TRef<internal.Node<A> | undefined> | undefined>
  /** @internal */
  readonly requestedCapacity: number
  /** @internal */
  readonly strategy: tQueue.TQueueStrategy
  /** @internal */
  readonly subscriberCount: TRef<number>
  /** @internal */
  readonly subscribers: TRef<HashSet<TRef<TRef<internal.Node<A>> | undefined>>>
}
