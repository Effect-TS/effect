import { HasURI, HKTFix, KindFix, URIS } from "../HKT"

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
export interface CovariantF<F, Fix0 = any, Fix1 = any, Fix2 = any, Fix3 = any>
  extends HasURI<F, Fix0, Fix1, Fix2, Fix3> {
  readonly Covariant: "Covariant"
  readonly map: <A, B>(
    f: (a: A) => B
  ) => <K, NK extends string, SI, SO, X, In, St, Env, Err>(
    fa: HKTFix<F, Fix0, Fix1, Fix2, Fix3, K, NK, SI, SO, X, In, St, Env, Err, A>
  ) => HKTFix<F, Fix0, Fix1, Fix2, Fix3, K, NK, SI, SO, X, In, St, Env, Err, B>
}

export interface CovariantK<
  F extends URIS,
  Fix0 = any,
  Fix1 = any,
  Fix2 = any,
  Fix3 = any
> extends HasURI<F, Fix0, Fix1, Fix2, Fix3> {
  readonly Covariant: "Covariant"
  readonly map: <A, B>(
    f: (a: A) => B
  ) => <K, NK extends string, SI, SO, X, In, St, Env, Err>(
    fa: KindFix<F, Fix0, Fix1, Fix2, Fix3, K, NK, SI, SO, X, In, St, Env, Err, A>
  ) => KindFix<F, Fix0, Fix1, Fix2, Fix3, K, NK, SI, SO, X, In, St, Env, Err, B>
}

export function makeCovariant<
  URI extends URIS,
  Fix0 = any,
  Fix1 = any,
  Fix2 = any,
  Fix3 = any
>(
  _: URI
): (
  _: Omit<
    CovariantK<URI, Fix0, Fix1, Fix2, Fix3>,
    "URI" | "Fix0" | "Fix1" | "Fix2" | "Fix3" | "Covariant"
  >
) => CovariantK<URI, Fix0, Fix1, Fix2, Fix3>
export function makeCovariant<URI, Fix0 = any, Fix1 = any, Fix2 = any, Fix3 = any>(
  URI: URI
): (
  _: Omit<
    CovariantF<URI, Fix0, Fix1, Fix2, Fix3>,
    "URI" | "Fix0" | "Fix1" | "Fix2" | "Fix3" | "Covariant"
  >
) => CovariantF<URI, Fix0, Fix1, Fix2, Fix3>
export function makeCovariant<URI, Fix0 = any, Fix1 = any, Fix2 = any, Fix3 = any>(
  URI: URI
): (
  _: Omit<
    CovariantF<URI, Fix0, Fix1, Fix2, Fix3>,
    "URI" | "Fix0" | "Fix1" | "Fix2" | "Fix3" | "Covariant"
  >
) => CovariantF<URI, Fix0, Fix1, Fix2, Fix3> {
  return (_) => ({
    URI,
    Fix0: undefined as any,
    Fix1: undefined as any,
    Fix2: undefined as any,
    Fix3: undefined as any,
    Covariant: "Covariant",
    ..._
  })
}
