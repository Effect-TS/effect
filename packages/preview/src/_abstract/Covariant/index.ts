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
export interface CovariantF<F, Fix = any> extends HasURI<F, Fix> {
  readonly Covariant: "Covariant"
  readonly map: <A, B>(
    f: (a: A) => B
  ) => <K, NK extends string, SI, SO, X, In, St, Env, Err>(
    fa: HKTFix<F, Fix, K, NK, SI, SO, X, In, St, Env, Err, A>
  ) => HKTFix<F, Fix, K, NK, SI, SO, X, In, St, Env, Err, B>
}

export interface CovariantK<F extends URIS, Fix = any> extends HasURI<F, Fix> {
  readonly Covariant: "Covariant"
  readonly map: <A, B>(
    f: (a: A) => B
  ) => <K, NK extends string, SI, SO, X, In, St, Env, Err>(
    fa: KindFix<F, Fix, K, NK, SI, SO, X, In, St, Env, Err, A>
  ) => KindFix<F, Fix, K, NK, SI, SO, X, In, St, Env, Err, B>
}

export function makeCovariant<URI extends URIS, Fix = any>(
  _: URI
): (_: Omit<CovariantK<URI, Fix>, "URI" | "Fix" | "Covariant">) => CovariantK<URI, Fix>
export function makeCovariant<URI, Fix = any>(
  URI: URI
): (_: Omit<CovariantF<URI, Fix>, "URI" | "Fix" | "Covariant">) => CovariantF<URI, Fix>
export function makeCovariant<URI, Fix = any>(
  URI: URI
): (
  _: Omit<CovariantF<URI, Fix>, "URI" | "Fix" | "Covariant">
) => CovariantF<URI, Fix> {
  return (_) => ({
    URI,
    Fix: undefined as any,
    Covariant: "Covariant",
    ..._
  })
}
