import {
  HKT,
  HasURI,
  URIS,
  Kind,
  Kind2,
  URIS2,
  Kind3,
  URIS3,
  Kind4,
  URIS4,
  URIS5,
  Kind5,
  URIS6,
  Kind6
} from "../HKT"

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
export interface Covariant<F> extends HasURI<F> {
  readonly map: <A, B>(f: (a: A) => B) => { (fa: HKT<F, A>): HKT<F, B> }
}

export interface Covariant1<F extends URIS> extends HasURI<F> {
  readonly map: <A, B>(f: (a: A) => B) => { (fa: Kind<F, A>): Kind<F, B> }
}

export interface Covariant2<F extends URIS2> extends HasURI<F> {
  readonly map: <A, B>(f: (a: A) => B) => { <E>(fa: Kind2<F, E, A>): Kind2<F, E, B> }
}

export interface Covariant3<F extends URIS3> extends HasURI<F> {
  readonly map: <A, B>(
    f: (a: A) => B
  ) => { <R, E>(fa: Kind3<F, R, E, A>): Kind3<F, R, E, B> }
}

export interface Covariant4<F extends URIS4> extends HasURI<F> {
  readonly map: <A, B>(
    f: (a: A) => B
  ) => { <S, R, E>(fa: Kind4<F, S, R, E, A>): Kind4<F, S, R, E, B> }
}

export interface Covariant5<F extends URIS5> extends HasURI<F> {
  readonly map: <A, B>(
    f: (a: A) => B
  ) => { <X, S, R, E>(fa: Kind5<F, X, S, R, E, A>): Kind5<F, X, S, R, E, B> }
}

export interface Covariant6<F extends URIS6> extends HasURI<F> {
  readonly map: <A, B>(
    f: (a: A) => B
  ) => { <Y, X, S, R, E>(fa: Kind6<F, Y, X, S, R, E, A>): Kind6<F, Y, X, S, R, E, B> }
}
