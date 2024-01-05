/**
 * @since 2.0.0
 */
import * as TR from "./internal/trie.js"

const TypeId: unique symbol = TR.TrieTypeId as TypeId

/**
 * @since 2.0.0
 * @category symbol
 */
export type TypeId = typeof TypeId
