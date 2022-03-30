import type { Tuple } from "../../../collection/immutable/Tuple"
import type { Effect } from "../../Effect"
import type { Ref } from "../definition"

/**
 * A `Ref.Synchronized` is a purely functional description of a mutable
 * reference. The fundamental operations of a `Ref.Synchronized` are `set` and
 * `get`. `set` sets the reference to a new value. `get` gets the current
 * value of the reference.
 *
 * Unlike an ordinary `Ref`, a `Ref.Synchronized` allows performing effects
 * within update operations, at some cost to performance. Writes will
 * semantically block other writers, while multiple readers can read
 * simultaneously.
 *
 * @tsplus type ets/Ref/Synchronized
 */
export interface SynchronizedRef<A> extends Ref<A> {
  readonly modifyEffect: <R, E, B>(
    f: (a: A) => Effect<R, E, Tuple<[B, A]>>,
    __tsplusTrace?: string
  ) => Effect<R, E, B>
}

/**
 * @tsplus type ets/Ref/SynchronizedOps
 */
export interface SynchronizedRefOps {}
export const SynchronizedRef: SynchronizedRefOps = {}
