import type { Ref } from "../definition";

export const SynchronizedRefSym = Symbol.for("@effect-ts/core/io/Ref/Synchronized");
export type SynchronizedRefSym = typeof SynchronizedRefSym;

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
  readonly [SynchronizedRefSym]: SynchronizedRefSym;
}

/**
 * @tsplus type ets/Ref/Synchronized/Ops
 */
export interface SynchronizedRefOps {}
export const SynchronizedRef: SynchronizedRefOps = {};

/**
 * @tsplus type ets/Ref/Synchronized/Aspects
 */
export interface SynchronizedRefAspects {}
