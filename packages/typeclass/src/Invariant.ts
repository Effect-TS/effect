/**
 * The `Invariant` typeclass is a higher-order abstraction over types that allow mapping the contents of a type in both directions.
 * It is similar to the `Covariant` typeclass but provides an `imap` opration, which allows transforming a value in both directions.
 * This typeclass is useful when dealing with data types that can be converted to and from some other types.
 * The `imap` operation provides a way to convert such data types to other types that they can interact with while preserving their invariants.
 *
 * @since 0.24.0
 */
import { dual } from "effect/Function"
import type { Kind, TypeClass, TypeLambda } from "effect/HKT"

/**
 * @category type class
 * @since 0.24.0
 */
export interface Invariant<F extends TypeLambda> extends TypeClass<F> {
  readonly imap: {
    <A, B>(
      to: (a: A) => B,
      from: (b: B) => A
    ): <R, O, E>(self: Kind<F, R, O, E, A>) => Kind<F, R, O, E, B>
    <R, O, E, A, B>(
      self: Kind<F, R, O, E, A>,
      to: (a: A) => B,
      from: (b: B) => A
    ): Kind<F, R, O, E, B>
  }
}

/**
 * Returns a default ternary `imap` composition.
 *
 * @since 0.24.0
 */
export const imapComposition = <F extends TypeLambda, G extends TypeLambda>(
  F: Invariant<F>,
  G: Invariant<G>
) =>
<FR, FO, FE, GR, GO, GE, A, B>(
  self: Kind<F, FR, FO, FE, Kind<G, GR, GO, GE, A>>,
  to: (a: A) => B,
  from: (b: B) => A
): Kind<F, FR, FO, FE, Kind<G, GR, GO, GE, B>> => F.imap(self, G.imap(to, from), G.imap(from, to))

/**
 * @category do notation
 * @since 0.24.0
 */
export const bindTo = <F extends TypeLambda>(F: Invariant<F>): {
  <N extends string>(
    name: N
  ): <R, O, E, A>(self: Kind<F, R, O, E, A>) => Kind<F, R, O, E, { [K in N]: A }>
  <R, O, E, A, N extends string>(
    self: Kind<F, R, O, E, A>,
    name: N
  ): Kind<F, R, O, E, { [K in N]: A }>
} =>
  dual(2, <R, O, E, A, N extends string>(
    self: Kind<F, R, O, E, A>,
    name: N
  ): Kind<F, R, O, E, { [K in N]: A }> => F.imap(self, (a) => ({ [name]: a } as any), ({ [name]: a }) => a))

/**
 * Convert a value in a singleton array in a given effect.
 *
 * @since 0.24.0
 */
export const tupled = <F extends TypeLambda>(
  F: Invariant<F>
): <R, O, E, A>(self: Kind<F, R, O, E, A>) => Kind<F, R, O, E, [A]> => F.imap((a) => [a], ([a]) => a)
