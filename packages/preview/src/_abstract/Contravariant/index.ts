import { HasURI, HKTFull, KindFull, URIS } from "../HKT"

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
export interface ContravariantF<F, TL0 = any, TL1 = any, TL2 = any, TL3 = any>
  extends HasURI<F, TL0, TL1, TL2, TL3> {
  readonly contramap: <A, B>(
    f: (a: B) => A
  ) => <K, NK extends string, SI, SO, X, I, S, Env, Err>(
    fa: HKTFull<F, TL0, TL1, TL2, TL3, K, NK, SI, SO, X, I, S, Env, Err, A>
  ) => HKTFull<F, TL0, TL1, TL2, TL3, K, NK, SI, SO, X, I, S, Env, Err, B>
}

export interface ContravariantK<
  F extends URIS,
  TL0 = any,
  TL1 = any,
  TL2 = any,
  TL3 = any
> extends HasURI<F, TL0, TL1, TL2, TL3> {
  readonly contramap: <A, B>(
    f: (a: B) => A
  ) => <K, NK extends string, SI, SO, X, I, S, Env, Err>(
    fa: KindFull<F, TL0, TL1, TL2, TL3, K, NK, SI, SO, X, I, S, Env, Err, A>
  ) => KindFull<F, TL0, TL1, TL2, TL3, K, NK, SI, SO, X, I, S, Env, Err, B>
}
