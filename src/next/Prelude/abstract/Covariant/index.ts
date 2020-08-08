import { HasURI, HKT6, Kind, URIS } from "../HKT"

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
export interface CovariantF<F> extends HasURI<F> {
  readonly Covariant: "Covariant"
  readonly map: <A, B>(
    f: (a: A) => B
  ) => <Y, X, S, R, E>(fa: HKT6<F, Y, X, S, R, E, A>) => HKT6<F, Y, X, S, R, E, B>
}

export interface CovariantK<F extends URIS> extends HasURI<F> {
  readonly Covariant: "Covariant"
  readonly map: <A, B>(
    f: (a: A) => B
  ) => <Y, X, S, R, E>(fa: Kind<F, Y, X, S, R, E, A>) => Kind<F, Y, X, S, R, E, B>
}

export function makeCovariant<URI extends URIS>(
  _: URI
): (_: Omit<CovariantK<URI>, "URI" | "Covariant">) => CovariantK<URI>
export function makeCovariant<URI>(
  URI: URI
): (_: Omit<CovariantF<URI>, "URI" | "Covariant">) => CovariantF<URI> {
  return (_) => ({
    URI,
    Covariant: "Covariant",
    ..._
  })
}
