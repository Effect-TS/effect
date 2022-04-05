export const RandomId = Symbol.for("@effect-ts/core/io/Random");
export type RandomId = typeof RandomId;

/**
 * @tsplus type ets/Random
 */
export interface Random {
  readonly next: UIO<number>;
  readonly nextBoolean: UIO<boolean>;
  readonly nextInt: UIO<number>;
  readonly nextRange: (low: number, high: number, __tsplusTrace?: string) => UIO<number>;
  readonly nextIntBetween: (
    low: number,
    high: number,
    __tsplusTrace?: string
  ) => UIO<number>;
  readonly shuffle: <A>(
    collection: LazyArg<Collection<A>>,
    __tsplusTrace?: string
  ) => UIO<Collection<A>>;
}

/**
 * @tsplus type ets/Random/Ops
 */
export interface RandomOps {}
export const Random: RandomOps = {};

export const HasRandom = Service<Random>(RandomId);

export type HasRandom = Has<Random>;
