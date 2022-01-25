import type { LazyArg } from "../../../data/Function"
import type { UIO } from "../definition"
import { ISucceed } from "../definition"

/**
 * Returns an effect that models success with the specified synchronous
 * side-effect.
 *
 * @ets static ets/EffectOps succeed
 */
export function succeed<A>(f: LazyArg<A>, __etsTrace?: string): UIO<A> {
  return new ISucceed(f, __etsTrace)
}

/**
 * Returns an effect that models success with the specified synchronous
 * side-effect.
 *
 * @ets static ets/EffectOps __call
 */
export function apply<A>(f: LazyArg<A>, __etsTrace?: string): UIO<A> {
  return new ISucceed(f, __etsTrace)
}
