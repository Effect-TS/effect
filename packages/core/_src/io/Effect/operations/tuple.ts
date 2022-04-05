import type { _E, _R } from "@effect-ts/core/io/Effect/definition/base";

type NonEmptyArrayEffect = Array<Effect<any, any, any>> & { readonly 0: Effect<any, any, any>; };

export type TupleA<T extends NonEmptyArrayEffect> = {
  [K in keyof T]: [T[K]] extends [Effect<any, any, infer A>] ? A : never;
};

/**
 * Like `forEach` + `identity` with a tuple type.
 *
 * @tsplus static ets/Effect/Ops tuple
 */
export function tuple<T extends NonEmptyArrayEffect>(
  ...t: T & {
    0: Effect<any, any, any>;
  }
): Effect<
  [T[number]] extends [{ [_R]: (_: infer R) => void; }] ? R : never,
  [T[number]] extends [{ [_E]: () => infer E; }] ? E : never,
  ForcedTuple<TupleA<T>>
> {
  return Effect.collectAll(t).map((x) => Tuple(...x)) as any;
}

/**
 * Like tuple but parallel, same as `forEachPar` + `identity` with a tuple type.
 *
 * @tsplus static ets/Effect/Ops tuplePar
 */
export function tuplePar<T extends NonEmptyArrayEffect>(
  ...t: T & {
    0: Effect<any, any, any>;
  }
): Effect<
  [T[number]] extends [{ [_R]: (_: infer R) => void; }] ? R : never,
  [T[number]] extends [{ [_E]: () => infer E; }] ? E : never,
  ForcedTuple<TupleA<T>>
> {
  return Effect.collectAllPar(t).map((x) => Tuple(...x)) as any;
}
