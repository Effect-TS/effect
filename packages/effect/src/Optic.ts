/**
 * @since 2.0.0
 *
 * ```md
 * - Docs: https://fp-ts.github.io/optic/modules/index.ts.html
 * - Docs: https://fp-ts.github.io/optic/modules/experimental.ts.html
 * - Module: "@fp-ts/optic"
 * - Module: "@fp-ts/optic/experimental"
 * ```
 */

import { left, right } from "@fp-ts/optic/data/Either"
import { cons } from "@fp-ts/optic/data/List"
import { none, some } from "@fp-ts/optic/data/Option"

export * from "@fp-ts/optic"
export * from "@fp-ts/optic/experimental"

export {
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://fp-ts.github.io/optic/modules/data/List.ts.html#cons
   * - Module: "@fp-ts/optic/data/Option"
   * ```
   */
  cons as consList,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://fp-ts.github.io/optic/modules/data/Either.ts.html#left
   * - Module: "@fp-ts/optic/data/Either"
   * ```
   */
  left,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://fp-ts.github.io/optic/modules/data/Option.ts.html#none
   * - Module: "@fp-ts/optic/data/Option"
   * ```
   */
  none,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://fp-ts.github.io/optic/modules/data/Either.ts.html#right
   * - Module: "@fp-ts/optic/data/Either"
   * ```
   */
  right,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://fp-ts.github.io/optic/modules/data/Option.ts.html#some
   * - Module: "@fp-ts/optic/data/Option"
   * ```
   */
  some
}
