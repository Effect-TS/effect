import { HasE, HasURI, HKTFull, KindFull, URIS } from "../HKT"

/**
 * `Covariant<F>` provides implicit evidence that `HKT<F, A>` is a covariant
 * endofunctor in the category of typescript objects.
 *
 * Covariant instances of type `HKT<F, A>` "produce" values of type `A` in some
 * sense. In some cases, such as with a `Array<A>`, this means that they
 * contain values of type `A`, in which case we can simply access the elements
 * of the collection. In other cases it means that output values of type `A`
 * which may not already exists, such as with a `FunctionN<[], A>` that produces
 * `A` values when invoked.
 *
 * Common examples of covariant instances includes effects with respect
 * to their error and value types, sinks with respect to their error and output
 * types, and queues and references with respect to their error and
 * output types.
 *
 * `Covariant` instances support a `map` operation which allows transforming
 * the output type given a function from the old output type to the new output
 * type. For example, if we have a `Array<string>` and a function
 * `string => number` that returns the length of a string, then we can construct
 * a `Array<number>` with the length of each string.
 */
export interface CovariantF<F, TL0 = any, TL1 = any, TL2 = any, TL3 = any>
  extends HasURI<F, TL0, TL1, TL2, TL3> {
  readonly map: <A, B>(
    f: (a: A) => B
  ) => <K, NK extends string, SI, SO, X, In, St, Env, Err>(
    fa: HKTFull<F, TL0, TL1, TL2, TL3, K, NK, SI, SO, X, In, St, Env, Err, A>
  ) => HKTFull<F, TL0, TL1, TL2, TL3, K, NK, SI, SO, X, In, St, Env, Err, B>
}

export interface CovariantK<F extends URIS, TL0 = any, TL1 = any, TL2 = any, TL3 = any>
  extends HasURI<F, TL0, TL1, TL2, TL3> {
  readonly map: <A, B>(
    f: (a: A) => B
  ) => <K, NK extends string, SI, SO, X, In, St, Env, Err>(
    fa: KindFull<F, TL0, TL1, TL2, TL3, K, NK, SI, SO, X, In, St, Env, Err, A>
  ) => KindFull<F, TL0, TL1, TL2, TL3, K, NK, SI, SO, X, In, St, Env, Err, B>
}

export interface CovariantKE<
  F extends URIS,
  E,
  TL0 = any,
  TL1 = any,
  TL2 = any,
  TL3 = any
> extends HasURI<F, TL0, TL1, TL2, TL3>, HasE<E> {
  readonly map: <A, B>(
    f: (a: A) => B
  ) => <K, NK extends string, SI, SO, X, In, St, Env>(
    fa: KindFull<F, TL0, TL1, TL2, TL3, K, NK, SI, SO, X, In, St, Env, E, A>
  ) => KindFull<F, TL0, TL1, TL2, TL3, K, NK, SI, SO, X, In, St, Env, E, B>
}

export function makeCovariant<URI extends URIS, E>(): <
  TL0 = any,
  TL1 = any,
  TL2 = any,
  TL3 = any
>() => (
  _: Omit<
    CovariantKE<URI, E, TL0, TL1, TL2, TL3>,
    "URI" | "TL0" | "TL1" | "TL2" | "TL3" | "_E"
  >
) => CovariantKE<URI, E, TL0, TL1, TL2, TL3>
export function makeCovariant<URI extends URIS>(): <
  TL0 = any,
  TL1 = any,
  TL2 = any,
  TL3 = any
>() => (
  _: Omit<CovariantK<URI, TL0, TL1, TL2, TL3>, "URI" | "TL0" | "TL1" | "TL2" | "TL3">
) => CovariantK<URI, TL0, TL1, TL2, TL3>
export function makeCovariant<URI>(): <
  TL0 = any,
  TL1 = any,
  TL2 = any,
  TL3 = any
>() => (
  _: Omit<CovariantF<URI, TL0, TL1, TL2, TL3>, "URI" | "TL0" | "TL1" | "TL2" | "TL3">
) => CovariantF<URI, TL0, TL1, TL2, TL3>
export function makeCovariant<URI>(): <
  TL0 = any,
  TL1 = any,
  TL2 = any,
  TL3 = any
>() => (
  _: Omit<CovariantF<URI, TL0, TL1, TL2, TL3>, "URI" | "TL0" | "TL1" | "TL2" | "TL3">
) => CovariantF<URI, TL0, TL1, TL2, TL3> {
  return () => (_) => ({
    URI: undefined as any,
    TL0: undefined as any,
    TL1: undefined as any,
    TL2: undefined as any,
    TL3: undefined as any,
    ..._
  })
}
