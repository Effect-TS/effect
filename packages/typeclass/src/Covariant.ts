/**
 * @since 0.24.0
 */
import { dual } from "effect/Function"
import type { Kind, TypeLambda } from "effect/HKT"
import type { Invariant } from "./Invariant.js"

/**
 * @category type class
 * @since 0.24.0
 */
export interface Covariant<F extends TypeLambda> extends Invariant<F> {
  readonly map: {
    <A, B>(f: (a: A) => B): <R, O, E>(self: Kind<F, R, O, E, A>) => Kind<F, R, O, E, B>
    <R, O, E, A, B>(self: Kind<F, R, O, E, A>, f: (a: A) => B): Kind<F, R, O, E, B>
  }
}

/**
 * Returns a default `map` composition.
 *
 * @since 0.24.0
 */
export const mapComposition = <F extends TypeLambda, G extends TypeLambda>(
  F: Covariant<F>,
  G: Covariant<G>
): <FR, FO, FE, GR, GO, GE, A, B>(
  self: Kind<F, FR, FO, FE, Kind<G, GR, GO, GE, A>>,
  f: (a: A) => B
) => Kind<F, FR, FO, FE, Kind<G, GR, GO, GE, B>> =>
(self, f) => F.map(self, G.map(f))

/**
 * Returns a default `imap` implementation.
 *
 * @since 0.24.0
 */
export const imap = <F extends TypeLambda>(
  map: <R, O, E, A, B>(self: Kind<F, R, O, E, A>, f: (a: A) => B) => Kind<F, R, O, E, B>
): Invariant<F>["imap"] => dual(3, (self, to, _) => map(self, to))

/**
 * @category mapping
 * @since 0.24.0
 */
export const flap = <F extends TypeLambda>(F: Covariant<F>): {
  <R, O, E, A, B>(self: Kind<F, R, O, E, (a: A) => B>): (a: A) => Kind<F, R, O, E, B>
  <A, R, O, E, B>(a: A, self: Kind<F, R, O, E, (a: A) => B>): Kind<F, R, O, E, B>
} =>
  dual(
    2,
    <A, R, O, E, B>(a: A, self: Kind<F, R, O, E, (a: A) => B>): Kind<F, R, O, E, B> => F.map(self, (f) => f(a))
  )

/**
 * @category mapping
 * @since 0.24.0
 */
export const as = <F extends TypeLambda>(F: Covariant<F>): {
  <B>(b: B): <R, O, E, _>(self: Kind<F, R, O, E, _>) => Kind<F, R, O, E, B>
  <R, O, E, _, B>(self: Kind<F, R, O, E, _>, b: B): Kind<F, R, O, E, B>
} =>
  dual(
    2,
    <R, O, E, _, B>(self: Kind<F, R, O, E, _>, b: B): Kind<F, R, O, E, B> => F.map(self, () => b)
  )

/**
 * @category mapping
 * @since 0.24.0
 */
export const asVoid = <F extends TypeLambda>(
  F: Covariant<F>
): <R, O, E, _>(self: Kind<F, R, O, E, _>) => Kind<F, R, O, E, void> => as(F)<void>(undefined)

const let_ = <F extends TypeLambda>(
  F: Covariant<F>
): {
  <N extends string, A extends object, B>(
    name: Exclude<N, keyof A>,
    f: (a: A) => B
  ): <R, O, E>(
    self: Kind<F, R, O, E, A>
  ) => Kind<F, R, O, E, { [K in keyof A | N]: K extends keyof A ? A[K] : B }>
  <R, O, E, A extends object, N extends string, B>(
    self: Kind<F, R, O, E, A>,
    name: Exclude<N, keyof A>,
    f: (a: A) => B
  ): Kind<F, R, O, E, { [K in keyof A | N]: K extends keyof A ? A[K] : B }>
} =>
  dual(3, <R, O, E, A extends object, N extends string, B>(
    self: Kind<F, R, O, E, A>,
    name: Exclude<N, keyof A>,
    f: (a: A) => B
  ): Kind<F, R, O, E, { [K in keyof A | N]: K extends keyof A ? A[K] : B }> =>
    F.map(self, (a) => Object.assign({}, a, { [name]: f(a) }) as any))

export {
  /**
   * **Example**
   *
   * ```ts
   * import * as covariant from "@effect/typeclass/Covariant"
   * import type { HKT } from "effect"
   * import { dual, pipe } from "effect/Function"
   *
   * interface MyData<A> {
   *   readonly value: A
   * }
   *
   * interface MyDataTypeLambda extends HKT.TypeLambda {
   *   readonly type: MyData<this["Target"]>
   * }
   *
   * const map: covariant.Covariant<MyDataTypeLambda>["map"] = dual(
   *   2,
   *   <A, B>(self: MyData<A>, f: (a: A) => B): MyData<B> => ({ value: f(self.value) })
   * )
   *
   * const Covariant: covariant.Covariant<MyDataTypeLambda> = { imap: covariant.imap<MyDataTypeLambda>(map), map }
   *
   * const notation = {
   *   Do: { value: {} } as MyData<{}>,
   *   let: covariant.let(Covariant)
   * }
   *
   * console.log(pipe(notation.Do, notation.let("foo", () => "bar")))
   * // { value: { foo: "bar" } }
   * ```
   *
   * @category do notation
   * @since 0.24.0
   */
  let_ as let
}
