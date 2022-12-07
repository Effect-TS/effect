/**
 * @since 2.0.0
 */

import * as HKT from "@fp-ts/core/HKT"
import * as Boolean from "@fp-ts/data/Boolean"
import * as Context from "@fp-ts/data/Context"
import * as Duration from "@fp-ts/data/Duration"
import * as Either from "@fp-ts/data/Either"
import * as Equal from "@fp-ts/data/Equal"
import * as Function from "@fp-ts/data/Function"
import { absurd, flow, hole, identity, pipe, unsafeCoerce } from "@fp-ts/data/Function"
import * as Identity from "@fp-ts/data/Identity"
import * as Json from "@fp-ts/data/Json"
import * as MutableRef from "@fp-ts/data/mutable/MutableRef"
import * as Number from "@fp-ts/data/Number"
import * as Option from "@fp-ts/data/Option"
import * as Ordering from "@fp-ts/data/Ordering"
import * as Predicate from "@fp-ts/data/Predicate"
import * as PCGRandom from "@fp-ts/data/Random"
import * as String from "@fp-ts/data/String"
import * as Differ from "effect/data/Differ"
import * as Optic from "effect/data/Optic"

export {
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://fp-ts.github.io/data/modules/Function.ts.html#absurd
   * - Module: "@fp-ts/data/Function"
   * ```
   */
  absurd,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://fp-ts.github.io/data/modules/Boolean.ts.html
   * - Module: "@fp-ts/data/Boolean"
   * ```
   */
  Boolean,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://fp-ts.github.io/data/modules/Context.ts.html
   * - Module: "@fp-ts/data/Context"
   * ```
   */
  Context,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://fp-ts.github.io/data/modules/Differ.ts.html
   * - Module: "@fp-ts/data/Differ"
   * ```
   */
  Differ,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://fp-ts.github.io/data/modules/Duration.ts.html
   * - Module: "@fp-ts/data/Duration"
   * ```
   */
  Duration,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://fp-ts.github.io/data/modules/Either.ts.html
   * - Module: "@fp-ts/data/Either"
   * ```
   */
  Either,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://fp-ts.github.io/data/modules/Equal.ts.html
   * - Module: "@fp-ts/data/Equal"
   * ```
   */
  Equal,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://fp-ts.github.io/data/modules/Function.ts.html
   * - Module: "@fp-ts/data/Function"
   * ```
   */
  flow,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://fp-ts.github.io/data/modules/Function.ts.html
   * - Module: "@fp-ts/data/Function"
   * ```
   */
  Function,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://fp-ts.github.io/core/modules/HKT.ts.html
   * - Module: "@fp-ts/core/HKT"
   * ```
   */
  HKT,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://fp-ts.github.io/data/modules/Function.ts.html#hole
   * - Module: "@fp-ts/data/Function"
   * ```
   */
  hole,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://fp-ts.github.io/data/modules/Identity.ts.html
   * - Module: "@fp-ts/data/Identity"
   * ```
   */
  Identity,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://fp-ts.github.io/data/modules/Function.ts.html#identity
   * - Module: "@fp-ts/data/Function"
   * ```
   */
  identity,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://fp-ts.github.io/data/modules/Json.ts.html
   * - Module: "@fp-ts/data/Json"
   * ```
   */
  Json,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://fp-ts.github.io/data/modules/mutable/MutableRef.ts.html
   * - Module: "@fp-ts/data/mutable/MutableRef"
   * ```
   */
  MutableRef,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://fp-ts.github.io/data/modules/Number.ts.html
   * - Module: "@fp-ts/data/Number"
   * ```
   */
  Number,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://fp-ts.github.io/optic/modules/index.ts.html
   * - Module: "@fp-ts/optic"
   * ```
   */
  Optic,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://fp-ts.github.io/data/modules/Option.ts.html
   * - Module: "@fp-ts/data/Option"
   * ```
   */
  Option,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://fp-ts.github.io/data/modules/Ordering.ts.html
   * - Module: "@fp-ts/data/Ordering"
   * ```
   */
  Ordering,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://fp-ts.github.io/data/modules/Random.ts.html
   * - Module: "@fp-ts/data/Random"
   * ```
   */
  PCGRandom,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://fp-ts.github.io/data/modules/Function.ts.html#pipe
   * - Module: "@fp-ts/data/Function"
   * ```
   */
  pipe,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://fp-ts.github.io/data/modules/Predicate.ts.html
   * - Module: "@fp-ts/data/Predicate"
   * ```
   */
  Predicate,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://fp-ts.github.io/data/modules/String.ts.html
   * - Module: "@fp-ts/data/String"
   * ```
   */
  String,
  /**
   * @since 2.0.0
   */
  unsafeCoerce
}
