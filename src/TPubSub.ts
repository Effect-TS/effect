/**
 * @since 2.0.0
 */
import type { HashSet } from "./HashSet.js"
import type { TPubSubTypeId } from "./impl/TPubSub.js"
import type * as internal from "./internal/stm/tPubSub.js"
import type * as tQueue from "./internal/stm/tQueue.js"
import type { TQueue } from "./TQueue.js"
import type { TRef } from "./TRef.js"

/**
 * @since 2.0.0
 * @internal
 */
export * from "./impl/TPubSub.js"
/**
 * @since 2.0.0
 * @internal
 */
export * from "./internal/Jumpers/TPubSub.js"

/**
 * @since 2.0.0
 */
export declare namespace TPubSub {
  // eslint-disable-next-line import/no-cycle
  // @ts-expect-error
  export type * from "./impl/TPubSub.js"
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
