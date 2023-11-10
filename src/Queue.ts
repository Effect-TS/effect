/**
 * @since 2.0.0
 */
import type { Deferred } from "./Deferred.js"
import type {
  BackingQueue,
  Dequeue,
  DequeueTypeId,
  Enqueue,
  EnqueueTypeId,
  QueueStrategyTypeId,
  Strategy
} from "./impl/Queue.js"
import type { MutableQueue } from "./MutableQueue.js"
import type { MutableRef } from "./MutableRef.js"
import type { Pipeable } from "./Pipeable.js"

/**
 * @since 2.0.0
 */
export * from "./impl/Queue.js"
/**
 * @since 2.0.0
 */
export * from "./internal/Jumpers/Queue.js"

/**
 * @since 2.0.0
 */
export declare namespace Queue {
  // eslint-disable-next-line import/no-cycle
  // @ts-expect-error
  export type * from "./impl/Queue.js"
}
/**
 * @since 2.0.0
 * @category models
 */
export interface Queue<A> extends Enqueue<A>, Dequeue<A>, Pipeable {
  /** @internal */
  readonly queue: BackingQueue<A>
  /** @internal */
  readonly takers: MutableQueue<Deferred<never, A>>
  /** @internal */
  readonly shutdownHook: Deferred<never, void>
  /** @internal */
  readonly shutdownFlag: MutableRef<boolean>
  /** @internal */
  readonly strategy: Strategy<A>
}

/**
 * @since 2.0.0
 */
export declare namespace Queue {
  /**
   * @since 2.0.0
   * @category models
   */
  export interface EnqueueVariance<A> {
    readonly [EnqueueTypeId]: {
      readonly _In: (_: A) => void
    }
  }

  /**
   * @since 2.0.0
   * @category models
   */
  export interface DequeueVariance<A> {
    readonly [DequeueTypeId]: {
      readonly _Out: (_: never) => A
    }
  }

  /**
   * @since 2.0.0
   * @category models
   */
  export interface StrategyVariance<A> {
    readonly [QueueStrategyTypeId]: {
      readonly _A: (_: never) => A
    }
  }
}
