// copyright https://github.com/frptools

import type { ChangeFlag } from "../../../../_internal/Core/ChangeFlag"
import type { Persistent } from "../../../../_internal/Structural"

export type AnyNode<K, V> =
  | Empty<K, V>
  | Leaf<K, V>
  | Collision<K, V>
  | Indexed<K, V>
  | ListNode<K, V>

export type GetValueFn<V> = (value?: V) => V

export type Modify<K, V> = (
  owner: Persistent,
  change: ChangeFlag,
  shift: number,
  get: GetValueFn<V>,
  hash: number,
  key: K
) => AnyNode<K, V>

export type ChildNode<K, V> = Empty<K, V> | Leaf<K, V>

export type ChildrenNodes<K, V> = Array<ChildNode<K, V>>

export interface Node<K, V> extends Persistent {
  type: NodeType
  modify: Modify<K, V>
}

export interface Empty<K, V> extends Node<K, V> {
  type: NodeType.EMPTY
}

export interface Leaf<K, V> extends Node<K, V> {
  type: NodeType.LEAF
  hash: number
  key: K
  value: V
}

export interface Collision<K, V> extends Node<K, V> {
  type: NodeType.COLLISION
  hash: number
  children: Array<Leaf<K, V>>
}

export interface Indexed<K, V> extends Node<K, V> {
  type: NodeType.INDEX
  mask: number
  children: ChildrenNodes<K, V>
}

export interface ListNode<K, V> extends Node<K, V> {
  type: NodeType.ARRAY
  size: number
  children: Array<AnyNode<K, V>>
}

export const enum NodeType {
  EMPTY,
  LEAF,
  COLLISION,
  INDEX,
  ARRAY
}
