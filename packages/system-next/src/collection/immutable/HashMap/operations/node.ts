import type { Option } from "../../../../data/Option"
import type { Cont, TraversalFn, VisitResult } from "./_internal/hashMap"
import {
  visitLazy as visitLazyInternal,
  visitLazyChildren as visitLazyChildrenInternal
} from "./_internal/hashMap"
import type { Node } from "./_internal/node"
import {
  ArrayNode,
  canEditNode as canEditNodeInternal,
  CollisionNode,
  EmptyNode,
  IndexedNode,
  isEmptyNode as isEmptyNodeInternal,
  isLeafNode as isLeafNodeInternal,
  LeafNode
} from "./_internal/node"

export { Node } from "./_internal/node"

// -----------------------------------------------------------------------------
// Constructors
// -----------------------------------------------------------------------------

/**
 * @tsplus static ets/HashMapNodeOps empty
 */
export function emptyNode<K, V>(): Node<K, V> {
  return new EmptyNode()
}

/**
 * @tsplus static ets/HashMapNodeOps leaf
 */
export function leafNode<K, V>(
  edit: number,
  hash: number,
  key: K,
  value: Option<V>
): Node<K, V> {
  return new LeafNode(edit, hash, key, value)
}

/**
 * @tsplus static ets/HashMapNodeOps collision
 */
export function collisionNode<K, V>(
  edit: number,
  hash: number,
  children: Array<Node<K, V>>
): Node<K, V> {
  return new CollisionNode(edit, hash, children)
}

/**
 * @tsplus static ets/HashMapNodeOps indexed
 */
export function indexedNode<K, V>(
  edit: number,
  mask: number,
  children: Array<Node<K, V>>
): Node<K, V> {
  return new IndexedNode(edit, mask, children)
}

/**
 * @tsplus static ets/HashMapNodeOps array
 */
export function arrayNode<K, V>(
  edit: number,
  size: number,
  children: Array<Node<K, V>>
): Node<K, V> {
  return new ArrayNode(edit, size, children)
}

// -----------------------------------------------------------------------------
// Type Guards
// -----------------------------------------------------------------------------

/**
 * @tsplus static ets/HashMapNodeOps isEmptyNode
 */
export const isEmptyNode: (u: unknown) => u is EmptyNode<unknown, unknown> =
  isEmptyNodeInternal

/**
 * @tsplus static ets/HashMapNodeOps isLeafNode
 */
export const isLeafNode: <K, V>(
  node: Node<K, V>
) => node is EmptyNode<K, V> | LeafNode<K, V> | CollisionNode<K, V> = isLeafNodeInternal

// -----------------------------------------------------------------------------
// Operations
// -----------------------------------------------------------------------------

/**
 * @tsplus fluent ets/HashMapNode canEdit
 */
export const canEditNode: <K, V>(node: Node<K, V>, edit: number) => boolean =
  canEditNodeInternal

/**
 * @tsplus fluent ets/HashMapNode visitLazy
 */
export const visitLazy: <K, V, A>(
  self: Node<K, V>,
  f: TraversalFn<K, V, A>,
  cont: Cont<K, V, A>
) => Option<VisitResult<K, V, A>> = visitLazyInternal

/**
 * @tsplus fluent ets/HashMapNode visitLazyChildren
 */
export const visitLazyChildren: <K, V, A>(
  len: number,
  children: Node<K, V>[],
  i: number,
  f: TraversalFn<K, V, A>,
  cont: Cont<K, V, A>
) => Option<VisitResult<K, V, A>> = visitLazyChildrenInternal
