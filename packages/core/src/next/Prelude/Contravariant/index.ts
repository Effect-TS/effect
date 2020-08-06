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
 * `Contravariant<F>` provides implicit evidence that `HKT<F, ->` is a
 * contravariant endofunctor in the category of Scala objects.
 *
 * `Contravariant` instances of type `HKT<F, A>` "consume" values of type `A` in
 * some sense. For example, `Equal<A>` takes two values of type `A` as input
 * and returns a `boolean` indicating whether they are equal. Similarly, a
 * `Ord<A>` takes two values of type `A` as input and returns an `Ordering`
 * with the result of comparing them and `Hash` takes an `A` value and returns
 * an `number`.
 *
 * Common examples of contravariant instances include effects with
 * regard to their environment types, sinks with regard to their input type,
 * and polymorphic queues and references regarding their input types.
 *
 * `Contravariant` instances support a `contramap` operation, which allows
 * transforming the input type given a function from the new input type to the
 * old input type. For example, if we have an `Ord<number>` that allows us to
 * compare two integers and we have a function `string => number` that returns
 * the length of a string, then we can construct an `Ord<string>` that
 * compares strings by computing their lengths with the provided function and
 * comparing those.
 */
export interface Contravariant<F> extends HasURI<F> {
  readonly contramap: <A, B>(f: (a: B) => A) => { (fa: HKT<F, B>): HKT<F, B> }
}

export interface Contravariant1<F extends URIS> extends HasURI<F> {
  readonly contramap: <A, B>(f: (a: B) => A) => { (fa: Kind<F, A>): Kind<F, B> }
}

export interface Contravariant2<F extends URIS2> extends HasURI<F> {
  readonly contramap: <A, B>(
    f: (a: B) => A
  ) => { <E>(fa: Kind2<F, E, A>): Kind2<F, E, B> }
}

export interface Contravariant3<F extends URIS3> extends HasURI<F> {
  readonly contramap: <A, B>(
    f: (a: B) => A
  ) => { <R, E>(fa: Kind3<F, R, E, A>): Kind3<F, R, E, B> }
}

export interface Contravariant4<F extends URIS4> extends HasURI<F> {
  readonly contramap: <A, B>(
    f: (a: B) => A
  ) => { <S, R, E>(fa: Kind4<F, S, R, E, A>): Kind4<F, S, R, E, B> }
}

export interface Contravariant5<F extends URIS5> extends HasURI<F> {
  readonly contramap: <A, B>(
    f: (a: B) => A
  ) => { <X, S, R, E>(fa: Kind5<F, X, S, R, E, A>): Kind5<F, X, S, R, E, B> }
}

export interface Contravariant6<F extends URIS6> extends HasURI<F> {
  readonly contramap: <A, B>(
    f: (a: B) => A
  ) => { <Y, X, S, R, E>(fa: Kind6<F, Y, X, S, R, E, A>): Kind6<F, Y, X, S, R, E, B> }
}
