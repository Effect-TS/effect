export const RandomSym = Symbol.for("@effect/core/io/Random");
export type RandomSym = typeof RandomSym;

/**
 * @tsplus type ets/Random
 */
export interface Random {
  readonly [RandomSym]: RandomSym;
  readonly next: UIO<number>;
  readonly nextBoolean: UIO<boolean>;
  readonly nextInt: UIO<number>;
  readonly nextRange: (low: number, high: number, __tsplusTrace?: string) => UIO<number>;
  readonly nextIntBetween: (low: number, high: number, __tsplusTrace?: string) => UIO<number>;
  readonly shuffle: <A>(collection: LazyArg<Collection<A>>, __tsplusTrace?: string) => UIO<Collection<A>>;
}

/**
 * @tsplus type ets/Random/Ops
 */
export interface RandomOps {
  $: RandomAspects;
  Tag: Tag<Random>;
}
export const Random: RandomOps = {
  $: {},
  Tag: Service.Tag()
};

/**
 * @tsplus type ets/Random/Aspects
 */
export interface RandomAspects {}
