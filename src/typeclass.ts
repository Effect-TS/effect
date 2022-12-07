/**
 * @since 2.0.0
 */

import * as Alternative from "@fp-ts/core/typeclass/Alternative"
import * as Applicative from "@fp-ts/core/typeclass/Applicative"
import * as Bicovariant from "@fp-ts/core/typeclass/Bicovariant"
import * as Bounded from "@fp-ts/core/typeclass/Bounded"
import * as Chainable from "@fp-ts/core/typeclass/Chainable"
import * as Contravariant from "@fp-ts/core/typeclass/Contravariant"
import * as Coproduct from "@fp-ts/core/typeclass/Coproduct"
import * as Covariant from "@fp-ts/core/typeclass/Covariant"
import * as FlatMap from "@fp-ts/core/typeclass/FlatMap"
import * as Foldable from "@fp-ts/core/typeclass/Foldable"
import * as Invariant from "@fp-ts/core/typeclass/Invariant"
import * as Monad from "@fp-ts/core/typeclass/Monad"
import * as Monoid from "@fp-ts/core/typeclass/Monoid"
import * as NonEmptyTraversable from "@fp-ts/core/typeclass/NonEmptyTraversable"
import * as Of from "@fp-ts/core/typeclass/Of"
import * as Order from "@fp-ts/core/typeclass/Order"
import * as Pointed from "@fp-ts/core/typeclass/Pointed"
import * as Product from "@fp-ts/core/typeclass/Product"
import * as SemiAlternative from "@fp-ts/core/typeclass/SemiAlternative"
import * as SemiApplicative from "@fp-ts/core/typeclass/SemiApplicative"
import * as SemiCoproduct from "@fp-ts/core/typeclass/SemiCoproduct"
import * as Semigroup from "@fp-ts/core/typeclass/Semigroup"
import * as SemiProduct from "@fp-ts/core/typeclass/SemiProduct"
import * as Traversable from "@fp-ts/core/typeclass/Traversable"
import * as Compactable from "@fp-ts/data/typeclass/Compactable"
import * as CovariantWithIndex from "@fp-ts/data/typeclass/CovariantWithIndex"
import * as Filterable from "@fp-ts/data/typeclass/Filterable"
import * as FilterableWithIndex from "@fp-ts/data/typeclass/FilterableWithIndex"
import * as Gen from "@fp-ts/data/typeclass/Gen"
import * as Seq from "@fp-ts/data/typeclass/Seq"
import * as TraversableFilterable from "@fp-ts/data/typeclass/TraversableFilterable"

export {
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://fp-ts.github.io/core/modules/typeclass/Alternative.ts.html
   * - Module: "@fp-ts/core/typeclass/Alternative"
   * ```
   */
  Alternative,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://fp-ts.github.io/core/modules/typeclass/Applicative.ts.html
   * - Module: "@fp-ts/core/typeclass/Applicative"
   * ```
   */
  Applicative,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://fp-ts.github.io/core/modules/typeclass/Bicovariant.ts.html
   * - Module: "@fp-ts/core/typeclass/Bicovariant"
   * ```
   */
  Bicovariant,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://fp-ts.github.io/core/modules/typeclass/Bounded.ts.html
   * - Module: "@fp-ts/core/typeclass/Bounded"
   * ```
   */
  Bounded,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://fp-ts.github.io/core/modules/typeclass/Chainable.ts.html
   * - Module: "@fp-ts/core/typeclass/Chainable"
   * ```
   */
  Chainable,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://fp-ts.github.io/core/modules/typeclass/Compactable.ts.html
   * - Module: "@fp-ts/core/typeclass/Compactable"
   * ```
   */
  Compactable,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://fp-ts.github.io/core/modules/typeclass/Contravatiant.ts.html
   * - Module: "@fp-ts/core/typeclass/Contravariant"
   * ```
   */
  Contravariant,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://fp-ts.github.io/core/modules/typeclass/Coproduct.ts.html
   * - Module: "@fp-ts/core/typeclass/Coproduct"
   * ```
   */
  Coproduct,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://fp-ts.github.io/core/modules/typeclass/Covariant.ts.html
   * - Module: "@fp-ts/core/typeclass/Covariant"
   * ```
   */
  Covariant,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://fp-ts.github.io/data/modules/typeclass/ContravatiantWithIndex.ts.html
   * - Module: "@fp-ts/data/typeclass/ContravariantWithIndex"
   * ```
   */
  CovariantWithIndex,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://fp-ts.github.io/core/modules/typeclass/Filterable.ts.html
   * - Module: "@fp-ts/core/typeclass/Filterable"
   * ```
   */
  Filterable,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://fp-ts.github.io/data/modules/typeclass/FilterableWithIndex.ts.html
   * - Module: "@fp-ts/data/typeclass/FilterableWithIndex"
   * ```
   */
  FilterableWithIndex,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://fp-ts.github.io/core/modules/typeclass/FlatMap.ts.html
   * - Module: "@fp-ts/core/typeclass/FlatMap"
   * ```
   */
  FlatMap,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://fp-ts.github.io/core/modules/typeclass/Foldable.ts.html
   * - Module: "@fp-ts/core/typeclass/Foldable"
   * ```
   */
  Foldable,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://fp-ts.github.io/data/modules/typeclass/Gen.ts.html
   * - Module: "@fp-ts/data/typeclass/Gen"
   * ```
   */
  Gen,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://fp-ts.github.io/core/modules/typeclass/Invariant.ts.html
   * - Module: "@fp-ts/core/typeclass/Invariant"
   * ```
   */
  Invariant,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://fp-ts.github.io/core/modules/typeclass/Monad.ts.html
   * - Module: "@fp-ts/core/typeclass/Monad"
   * ```
   */
  Monad,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://fp-ts.github.io/core/modules/typeclass/Monoid.ts.html
   * - Module: "@fp-ts/core/typeclass/Monoid"
   * ```
   */
  Monoid,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://fp-ts.github.io/core/modules/typeclass/NonEmptyTraversable.ts.html
   * - Module: "@fp-ts/core/typeclass/NonEmptyTraversable"
   * ```
   */
  NonEmptyTraversable,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://fp-ts.github.io/core/modules/typeclass/Of.ts.html
   * - Module: "@fp-ts/core/typeclass/Of"
   * ```
   */
  Of,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://fp-ts.github.io/core/modules/typeclass/Order.ts.html
   * - Module: "@fp-ts/core/typeclass/Order"
   * ```
   */
  Order,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://fp-ts.github.io/core/modules/typeclass/Pointed.ts.html
   * - Module: "@fp-ts/core/typeclass/Pointed"
   * ```
   */
  Pointed,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://fp-ts.github.io/core/modules/typeclass/Product.ts.html
   * - Module: "@fp-ts/core/typeclass/Product"
   * ```
   */
  Product,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://fp-ts.github.io/core/modules/typeclass/SemiAlternative.ts.html
   * - Module: "@fp-ts/core/typeclass/SemiAlternative"
   * ```
   */
  SemiAlternative,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://fp-ts.github.io/core/modules/typeclass/SemiApplicative.ts.html
   * - Module: "@fp-ts/core/typeclass/SemiApplicative"
   * ```
   */
  SemiApplicative,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://fp-ts.github.io/core/modules/typeclass/SemiCoproduct.ts.html
   * - Module: "@fp-ts/core/typeclass/SemiCoproduct"
   * ```
   */
  SemiCoproduct,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://fp-ts.github.io/core/modules/typeclass/Semigroup.ts.html
   * - Module: "@fp-ts/core/typeclass/Semigroup"
   * ```
   */
  Semigroup,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://fp-ts.github.io/core/modules/typeclass/SemiProduct.ts.html
   * - Module: "@fp-ts/core/typeclass/SemiProduct"
   * ```
   */
  SemiProduct,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://fp-ts.github.io/data/modules/typeclass/Seq.ts.html
   * - Module: "@fp-ts/data/typeclass/Seq"
   * ```
   */
  Seq,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://fp-ts.github.io/core/modules/typeclass/Traversable.ts.html
   * - Module: "@fp-ts/core/typeclass/Traversable"
   * ```
   */
  Traversable,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://fp-ts.github.io/core/modules/typeclass/TraversableFilterable.ts.html
   * - Module: "@fp-ts/core/typeclass/TraversableFilterable"
   * ```
   */
  TraversableFilterable
}
