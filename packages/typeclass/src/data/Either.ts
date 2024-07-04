/**
 * @since 0.24.0
 */

import * as Either from "effect/Either"
import { dual } from "effect/Function"
import type { Kind, TypeLambda } from "effect/HKT"
import type * as applicative from "../Applicative.js"
import type * as bicovariant from "../Bicovariant.js"
import type * as chainable from "../Chainable.js"
import * as covariant from "../Covariant.js"
import type * as flatMap_ from "../FlatMap.js"
import type * as foldable from "../Foldable.js"
import type * as invariant from "../Invariant.js"
import type * as monad from "../Monad.js"
import type * as of_ from "../Of.js"
import type * as pointed from "../Pointed.js"
import type * as product_ from "../Product.js"
import type * as semiAlternative from "../SemiAlternative.js"
import type * as semiApplicative from "../SemiApplicative.js"
import type * as semiCoproduct from "../SemiCoproduct.js"
import type * as semiProduct from "../SemiProduct.js"
import type * as traversable from "../Traversable.js"

const of = Either.right

const map = Either.map

const imap = covariant.imap<Either.EitherTypeLambda>(map)

const bimap: {
  <E1, E2, A, B>(
    onLeft: (e: E1) => E2,
    onRight: (a: A) => B
  ): (self: Either.Either<A, E1>) => Either.Either<B, E2>
  <E1, A, E2, B>(
    self: Either.Either<A, E1>,
    onLeft: (e: E1) => E2,
    onRight: (a: A) => B
  ): Either.Either<B, E2>
} = dual(
  3,
  <E1, A, E2, B>(
    self: Either.Either<A, E1>,
    onLeft: (e: E1) => E2,
    onRight: (a: A) => B
  ): Either.Either<B, E2> => Either.mapBoth(self, { onLeft, onRight })
)

const flatMap = Either.flatMap

const product = <E1, A, E2, B>(
  self: Either.Either<A, E1>,
  that: Either.Either<B, E2>
): Either.Either<[A, B], E1 | E2> =>
  Either.isRight(self) ?
    (Either.isRight(that) ? Either.right([self.right, that.right]) : Either.left(that.left)) :
    Either.left(self.left)

const productMany = <E, A>(
  self: Either.Either<A, E>,
  collection: Iterable<Either.Either<A, E>>
): Either.Either<[A, ...Array<A>], E> => {
  if (Either.isLeft(self)) {
    return Either.left(self.left)
  }
  const out: [A, ...Array<A>] = [self.right]
  for (const e of collection) {
    if (Either.isLeft(e)) {
      return Either.left(e.left)
    }
    out.push(e.right)
  }
  return Either.right(out)
}

const productAll = <E, A>(
  collection: Iterable<Either.Either<A, E>>
): Either.Either<Array<A>, E> => {
  const out: Array<A> = []
  for (const e of collection) {
    if (Either.isLeft(e)) {
      return Either.left(e.left)
    }
    out.push(e.right)
  }
  return Either.right(out)
}

const coproduct = <E1, A, E2, B>(
  self: Either.Either<A, E1>,
  that: Either.Either<B, E2>
): Either.Either<A | B, E1 | E2> => Either.isRight(self) ? self : that

const coproductMany = <E, A>(
  self: Either.Either<A, E>,
  collection: Iterable<Either.Either<A, E>>
): Either.Either<A, E> => {
  let out = self
  if (Either.isRight(out)) {
    return out
  }
  for (out of collection) {
    if (Either.isRight(out)) {
      return out
    }
  }
  return out
}

const traverse = <F extends TypeLambda>(
  F: applicative.Applicative<F>
): {
  <A, R, O, E, B>(
    f: (a: A) => Kind<F, R, O, E, B>
  ): <TE>(self: Either.Either<A, TE>) => Kind<F, R, O, E, Either.Either<B, TE>>
  <TE, A, R, O, E, B>(
    self: Either.Either<A, TE>,
    f: (a: A) => Kind<F, R, O, E, B>
  ): Kind<F, R, O, E, Either.Either<B, TE>>
} =>
  dual(2, <TE, A, R, O, E, B>(
    self: Either.Either<A, TE>,
    f: (a: A) => Kind<F, R, O, E, B>
  ): Kind<F, R, O, E, Either.Either<B, TE>> =>
    Either.isLeft(self) ?
      F.of<Either.Either<B, TE>>(Either.left(self.left)) :
      F.map<R, O, E, B, Either.Either<B, TE>>(f(self.right), Either.right))

/**
 * @category instances
 * @since 0.24.0
 */
export const Bicovariant: bicovariant.Bicovariant<Either.EitherTypeLambda> = {
  bimap
}

/**
 * @category instances
 * @since 0.24.0
 */
export const Covariant: covariant.Covariant<Either.EitherTypeLambda> = {
  imap,
  map
}

/**
 * @category instances
 * @since 0.24.0
 */
export const Invariant: invariant.Invariant<Either.EitherTypeLambda> = {
  imap
}

/**
 * @category instances
 * @since 0.24.0
 */
export const Of: of_.Of<Either.EitherTypeLambda> = {
  of
}

/**
 * @category instances
 * @since 0.24.0
 */
export const Pointed: pointed.Pointed<Either.EitherTypeLambda> = {
  of,
  imap,
  map
}

/**
 * @category instances
 * @since 0.24.0
 */
export const FlatMap: flatMap_.FlatMap<Either.EitherTypeLambda> = {
  flatMap
}

/**
 * @category instances
 * @since 0.24.0
 */
export const Chainable: chainable.Chainable<Either.EitherTypeLambda> = {
  imap,
  map,
  flatMap
}

/**
 * @category instances
 * @since 0.24.0
 */
export const Monad: monad.Monad<Either.EitherTypeLambda> = {
  imap,
  of,
  map,
  flatMap
}

/**
 * @category instances
 * @since 0.24.0
 */
export const SemiProduct: semiProduct.SemiProduct<Either.EitherTypeLambda> = {
  imap,
  product,
  productMany
}

/**
 * @category instances
 * @since 0.24.0
 */
export const Product: product_.Product<Either.EitherTypeLambda> = {
  of,
  imap,
  product,
  productMany,
  productAll
}

/**
 * @category instances
 * @since 0.24.0
 */
export const SemiApplicative: semiApplicative.SemiApplicative<Either.EitherTypeLambda> = {
  imap,
  map,
  product,
  productMany
}

/**
 * @category instances
 * @since 0.24.0
 */
export const Applicative: applicative.Applicative<Either.EitherTypeLambda> = {
  imap,
  of,
  map,
  product,
  productMany,
  productAll
}

/**
 * @category instances
 * @since 0.24.0
 */
export const SemiCoproduct: semiCoproduct.SemiCoproduct<Either.EitherTypeLambda> = {
  imap,
  coproduct,
  coproductMany
}

/**
 * @category instances
 * @since 0.24.0
 */
export const SemiAlternative: semiAlternative.SemiAlternative<Either.EitherTypeLambda> = {
  map,
  imap,
  coproduct,
  coproductMany
}

/**
 * @category instances
 * @since 0.24.0
 */
export const Foldable: foldable.Foldable<Either.EitherTypeLambda> = {
  reduce: dual(
    3,
    <E, A, B>(self: Either.Either<A, E>, b: B, f: (b: B, a: A) => B): B => Either.isLeft(self) ? b : f(b, self.right)
  )
}

/**
 * @category instances
 * @since 0.24.0
 */
export const Traversable: traversable.Traversable<Either.EitherTypeLambda> = {
  traverse
}
