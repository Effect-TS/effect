// copyright https://github.com/frptools

import {
  copyArrayShallow,
  withArrayIndexInserted,
  withArrayIndexRemoved,
  withArrayIndexUpdated,
  writeArrayElements
} from "../../../../_internal/Array"
import type { ChangeFlag } from "../../../../_internal/Core/ChangeFlag"
import type { MutationContext, Persistent } from "../../../../_internal/Structural"
import {
  cloneSymbol,
  getSubordinateContext,
  isMutable,
  mutationContextSymbol
} from "../../../../_internal/Structural"
import {
  bitmapToIndex,
  hashFragment,
  MAX_INDEX_NODE,
  SIZE,
  toBitmap
} from "../../Common"
import { ArrayNode } from "../ArrayNode"
import { empty } from "../EmptyNode"
import type { AnyNode, ChildNode, ChildrenNodes, GetValueFn, Indexed } from "../Types"
import { NodeType } from "../Types"

export class IndexedNode<K, V> implements Indexed<K, V> {
  public readonly [mutationContextSymbol]: MutationContext
  public type: NodeType.INDEX = NodeType.INDEX

  constructor(
    mctx: MutationContext,
    public mask: number,
    public children: ChildrenNodes<K, V>
  ) {
    this[mutationContextSymbol] = mctx
    this[cloneSymbol] = this[cloneSymbol].bind(this)
  }

  public [cloneSymbol](mctx: MutationContext): IndexedNode<K, V> {
    return new IndexedNode<K, V>(mctx, this.mask, copyArrayShallow(this.children))
  }

  public modify(
    owner: Persistent,
    change: ChangeFlag,
    shift: number,
    get: GetValueFn<V>,
    hash: number,
    key: K
  ): AnyNode<K, V> {
    const mask = this.mask
    const children = this.children
    const fragment: number = hashFragment(shift, hash)
    const bit: number = toBitmap(fragment)
    const index: number = bitmapToIndex(mask, bit)
    const exists = Boolean(mask & bit)
    const current: AnyNode<K, V> = exists ? children[index] : empty<K, V>()
    const child = current.modify(
      owner,
      change,
      shift + SIZE,
      get,
      hash,
      key
    ) as ChildNode<K, V>

    if (current === child) {
      return this
    }

    change.confirmed = true

    if (exists && child.type === NodeType.EMPTY) {
      const bitmap = mask & ~bit

      if (!bitmap) {
        return empty<K, V>()
      }

      if (children.length <= 2 && isLeaf(children[index ^ 1])) {
        return children[index ^ 1]
      }

      if (isMutable(this)) {
        writeArrayElements(
          children,
          children,
          index + 1,
          index,
          children.length - index - 1
        )
        children.length--
        this.mask = bitmap
        return this
      }

      return new IndexedNode(
        getSubordinateContext(owner),
        bitmap,
        withArrayIndexRemoved(index, children)
      )
    }

    if (!exists && child.type !== NodeType.EMPTY) {
      if (children.length >= MAX_INDEX_NODE) {
        return toArrayNode<K, V>(
          getSubordinateContext(owner),
          fragment,
          child,
          mask,
          children
        )
      }

      if (isMutable(this)) {
        this.mask = mask | bit
        children.length++
        writeArrayElements(
          children,
          children,
          index,
          index + 1,
          children.length - index
        )
        children[index] = child
        return this
      }

      return new IndexedNode(
        getSubordinateContext(owner),
        mask | bit,
        withArrayIndexInserted(index, child, children)
      )
    }

    if (isMutable(this)) {
      children[index] = child
      return this
    }

    return new IndexedNode<K, V>(
      getSubordinateContext(owner),
      mask,
      withArrayIndexUpdated(index, child, children)
    )
  }
}

function isLeaf(node: AnyNode<any, any>): boolean {
  const type = node.type

  return (
    type === NodeType.EMPTY || type === NodeType.LEAF || type === NodeType.COLLISION
  )
}

export function toArrayNode<K, V>(
  mctx: MutationContext,
  fragment: number,
  child: ChildNode<K, V>,
  bitmap: number,
  children: ChildrenNodes<K, V>
) {
  const array: ChildrenNodes<K, V> = []
  let bit = bitmap
  let count = 0

  for (let i = 0; bit; ++i) {
    if (bit & 1) {
      array[i] = children[count++]
    }
    bit >>>= 1
  }

  array[fragment] = child

  return new ArrayNode(mctx, count + 1, array)
}
