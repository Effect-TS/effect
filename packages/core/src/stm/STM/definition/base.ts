import type * as UT from "../../../data/Utils/types"
import { _A, _E, _R } from "../../../support/Symbols"

// -----------------------------------------------------------------------------
// Model
// -----------------------------------------------------------------------------

export const STMTypeId = Symbol.for("@effect-ts/core/STM")
export type STMTypeId = typeof STMTypeId

/**
 * `STM<R, E, A>` represents an effect that can be performed transactionally,
 *  resulting in a failure `E` or a value `A` that may require an environment
 *  `R` to execute.
 *
 * Software Transactional Memory is a technique which allows composition of
 * arbitrary atomic operations.  It is the software analog of transactions in
 * database systems.
 *
 * The API is lifted directly from the Haskell package Control.Concurrent.STM
 * although the implementation does not resemble the Haskell one at all.
 *
 * See http://hackage.haskell.org/package/stm-2.5.0.0/docs/Control-Concurrent-STM.html
 *
 * STM in Haskell was introduced in:
 *
 * Composable memory transactions, by Tim Harris, Simon Marlow, Simon Peyton
 * Jones, and Maurice Herlihy, in ACM Conference on Principles and Practice of
 * Parallel Programming 2005.
 *
 * See https://www.microsoft.com/en-us/research/publication/composable-memory-transactions/
 *
 * See also:
 *  Lock Free Data Structures using STMs in Haskell, by Anthony Discolo, Tim
 *  Harris, Simon Marlow, Simon Peyton Jones, Satnam Singh) FLOPS 2006: Eighth
 *  International Symposium on Functional and Logic Programming, Fuji Susono,
 *  JAPAN, April 2006
 *
 *  https://www.microsoft.com/en-us/research/publication/lock-free-data-structures-using-stms-in-haskell/
 *
 * The implemtation is based on the ZIO STM module, while JS environments have
 * no race conditions from multiple threads STM provides greater benefits for
 * synchronization of Fibers and transactional data-types can be quite useful.
 *
 * @tsplus type ets/STM
 */
export interface STM<R, E, A> {
  readonly [STMTypeId]: STMTypeId
  readonly [_R]: (_: R) => void
  readonly [_E]: () => E
  readonly [_A]: () => A
}

/**
 * @tsplus type ets/STMOps
 */
export interface STMOps {}
export const STM: STMOps = {}

/**
 * @tsplus unify ets/STM
 */
export function unifySTM<X extends STM<any, any, any>>(
  self: X
): STM<UT._R<X>, UT._E<X>, UT._A<X>> {
  return self
}

export type USTM<A> = STM<unknown, never, A>

export class STMBase<R, E, A> implements STM<R, E, A> {
  readonly [STMTypeId]: STMTypeId = STMTypeId;
  readonly [_R]: (_: R) => void;
  readonly [_E]: () => E;
  readonly [_A]: () => A
}
