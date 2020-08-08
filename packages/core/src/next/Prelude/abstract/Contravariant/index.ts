import { HasURI, HKT6, Kind, URIS } from "../HKT"

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
export interface ContravariantF<F> extends HasURI<F> {
  readonly Contravariant: "Contravariant"
  readonly contramap: <A, B>(
    f: (a: B) => A
  ) => <Y, X, S, R, E>(fa: HKT6<F, Y, X, S, R, E, A>) => HKT6<F, Y, X, S, R, E, B>
}

export interface ContravariantK<F extends URIS> extends HasURI<F> {
  readonly Contravariant: "Contravariant"
  readonly contramap: <A, B>(
    f: (a: B) => A
  ) => <Y, X, S, R, E>(fa: Kind<F, Y, X, S, R, E, A>) => Kind<F, Y, X, S, R, E, B>
}

export function makeContravariant<URI extends URIS>(
  _: URI
): (_: Omit<ContravariantK<URI>, "URI" | "Contravariant">) => ContravariantK<URI>
export function makeContravariant<URI>(
  URI: URI
): (_: Omit<ContravariantF<URI>, "URI" | "Contravariant">) => ContravariantF<URI>
export function makeContravariant<URI>(
  URI: URI
): (_: Omit<ContravariantF<URI>, "URI" | "Contravariant">) => ContravariantF<URI> {
  return (_) => ({
    URI,
    Contravariant: "Contravariant",
    ..._
  })
}
