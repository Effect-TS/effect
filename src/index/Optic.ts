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

import { toggle } from "@fp-ts/optic/data/Boolean"
import { cons as consChunk, head as headChunk, index as indexChunk, tail as tailChunk } from "@fp-ts/optic/data/Chunk"
import { left, right } from "@fp-ts/optic/data/Either"
import { getAt as getAtHashMap, getIndex as getIndexHashMap } from "@fp-ts/optic/data/HashMap"
import { cons as consList, head as headList, index as indexList, tail as tailList } from "@fp-ts/optic/data/List"
import { none } from "@fp-ts/optic/data/Option"
import { consNonEmpty as consNonEmptyReadonlyArray } from "@fp-ts/optic/data/ReadonlyArray"
import { getAt as getAtSortedMap, getIndex as getIndexSortedMap } from "@fp-ts/optic/data/SortedMap"
import { index as indexString } from "@fp-ts/optic/data/String"

export * from "@fp-ts/optic"
export * from "@fp-ts/optic/experimental"

export {
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://fp-ts.github.io/optic/modules/data/Chunk.ts.html#cons
   * - Module: "@fp-ts/optic/data/Chunk"
   * ```
   */
  consChunk,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://fp-ts.github.io/optic/modules/data/List.ts.html#cons
   * - Module: "@fp-ts/optic/data/List"
   * ```
   */
  consList,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://fp-ts.github.io/optic/modules/data/ReadonlyArray.ts.html#consNonEmpty
   * - Module: "@fp-ts/optic/data/ReadonlyArray"
   * ```
   */
  consNonEmptyReadonlyArray,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://fp-ts.github.io/optic/modules/data/HashMap.ts.html#getAt
   * - Module: "@fp-ts/optic/data/HashMap"
   * ```
   */
  getAtHashMap,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://fp-ts.github.io/optic/modules/data/SortedMap.ts.html#getAt
   * - Module: "@fp-ts/optic/data/SortedMap"
   * ```
   */
  getAtSortedMap,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://fp-ts.github.io/optic/modules/data/HashMap.ts.html#getIndex
   * - Module: "@fp-ts/optic/data/HashMap"
   * ```
   */
  getIndexHashMap,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://fp-ts.github.io/optic/modules/data/SortedMap.ts.html#getIndex
   * - Module: "@fp-ts/optic/data/SortedMap"
   * ```
   */
  getIndexSortedMap,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://fp-ts.github.io/optic/modules/data/Chunk.ts.html#head
   * - Module: "@fp-ts/optic/data/Chunk"
   * ```
   */
  headChunk,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://fp-ts.github.io/optic/modules/data/List.ts.html#head
   * - Module: "@fp-ts/optic/data/List"
   * ```
   */
  headList,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://fp-ts.github.io/optic/modules/data/Chunk.ts.html#index
   * - Module: "@fp-ts/optic/data/Chunk"
   * ```
   */
  indexChunk,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://fp-ts.github.io/optic/modules/data/List.ts.html#index
   * - Module: "@fp-ts/optic/data/List"
   * ```
   */
  indexList,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://fp-ts.github.io/optic/modules/data/String.ts.html#index
   * - Module: "@fp-ts/optic/data/String"
   * ```
   */
  indexString,
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
   * - Docs: https://fp-ts.github.io/optic/modules/data/Chunk.ts.html#tail
   * - Module: "@fp-ts/optic/data/Chunk"
   * ```
   */
  tailChunk,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://fp-ts.github.io/optic/modules/data/List.ts.html#tail
   * - Module: "@fp-ts/optic/data/List"
   * ```
   */
  tailList,
  /**
   * @since 2.0.0
   *
   * ```md
   * - Docs: https://fp-ts.github.io/optic/modules/data/Boolean.ts.html#toggle
   * - Module: "@fp-ts/optic/data/Boolean"
   * ```
   */
  toggle
}
