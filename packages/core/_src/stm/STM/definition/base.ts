export type USTM<A> = STM<never, never, A>

export const STMSym = Symbol.for("@effect/core/stm/STM")
export type STMSym = typeof STMSym

export const _R = Symbol.for("@effect/core/stm/STM/R")
export type _R = typeof _R

export const _E = Symbol.for("@effect/core/stm/STM/E")
export type _E = typeof _E

export const _A = Symbol.for("@effect/core/stm/STM/A")
export type _A = typeof _A

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
 * @tsplus type effect/core/stm/STM
 */
export interface STM<R, E, A> {
  readonly [STMSym]: STMSym
  readonly [_R]: () => R
  readonly [_E]: () => E
  readonly [_A]: () => A
}

/**
 * @tsplus type effect/core/stm/STM.Ops
 */
export interface STMOps {
  $: STMAspects
}
export const STM: STMOps = {
  $: {}
}

/**
 * @tsplus type effect/core/stm/STM.Aspects
 */
export interface STMAspects {}

/**
 * @tsplus unify effect/core/stm/STM
 */
export function unifySTM<X extends STM<any, any, any>>(
  self: X
): STM<
  [X] extends [{ [_R]: () => infer R }] ? R : never,
  [X] extends [{ [_E]: () => infer E }] ? E : never,
  [X] extends [{ [_A]: () => infer A }] ? A : never
> {
  return self
}

export class STMBase<R, E, A> implements STM<R, E, A> {
  readonly [STMSym]: STMSym = STMSym
  readonly [_R]!: () => R
  readonly [_E]!: () => E
  readonly [_A]!: () => A
}
