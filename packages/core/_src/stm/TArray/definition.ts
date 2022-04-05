export const TArraySym = Symbol.for("@effect-ts/core/stm/TArray");
export type TArraySym = typeof TArraySym;

export const _A = Symbol.for("@effect-ts/core/stm/TArray/A");
export type _A = typeof _A;

/**
 * @tsplus type ets/TArray
 */
export interface TArray<A> extends Collection<TRef<A>> {
  readonly [TArraySym]: TArraySym;
  readonly [_A]: () => A;
}

/**
 * @tsplus type ets/TArray/Ops
 */
export interface TArrayOps {
  $: TArrayAspects;
}
export const TArray: TArrayOps = {
  $: {}
};

/**
 * @tsplus type ets/TArray/Aspects
 */
export interface TArrayAspects {}
