// copyright https://github.com/frptools

import { withArrayIndexUpdated } from "../../../../_internal/Array"
import type { ChangeFlag } from "../../../../_internal/Core/ChangeFlag"
import type { MutationContext, Persistent } from "../../../../_internal/Structural"
import {
  cloneSymbol,
  getSubordinateContext,
  isMutable,
  mutationContextSymbol
} from "../../../../_internal/Structural"
import { hashFragment, MIN_ARRAY_NODE, SIZE } from "../../Common"
import { empty } from "../EmptyNode"
import { IndexedNode } from "../IndexedNode"
import type { AnyNode, GetValueFn, ListNode } from "../Types"
import { NodeType } from "../Types"

export function toIndexNode<K, V>(
  mctx: MutationContext,
  count: number,
  index: number,
  children: Array<AnyNode<K, V>>
): IndexedNode<K, V> {
  const newChildren = new Array(count - 1)
  let g = 0
  let bitmap = 0
  for (let i = 0; i < children.length; ++i) {
    if (i !== index) {
      const child = children[i]
      if (child && child.type > NodeType.EMPTY) {
        newChildren[g++] = child
        bitmap |= 1 << i
      }
    }
  }

  return new IndexedNode<K, V>(mctx, bitmap, newChildren)
}

export class ArrayNode<K, V> implements ListNode<K, V> {
  public readonly [mutationContextSymbol]: MutationContext
  public type: NodeType.ARRAY = NodeType.ARRAY

  constructor(
    mctx: MutationContext,
    public size: number,
    public children: Array<AnyNode<K, V>>
  ) {
    this[mutationContextSymbol] = mctx
    this[cloneSymbol] = this[cloneSymbol].bind(this)
  }

  public [cloneSymbol](mctx: MutationContext): ArrayNode<K, V> {
    return new ArrayNode(mctx, this.size, this.children)
  }

  public modify(
    owner: Persistent,
    change: ChangeFlag,
    shift: number,
    get: GetValueFn<V>,
    hash: number,
    key: K
  ): AnyNode<K, V> {
    const count = this.size
    const children = this.children
    const fragment = hashFragment(shift, hash)
    const child = children[fragment]
    const newChild = (child || empty<K, V>()).modify(
      owner,
      change,
      shift + SIZE,
      get,
      hash,
      key
    )

    if (child === newChild) {
      return this
    }

    if (isEmptyNode(child) && !isEmptyNode(newChild)) {
      if (isMutable(this)) {
        children[fragment] = newChild
        this.size = count + 1
        return this
      }
      return new ArrayNode(
        getSubordinateContext(owner),
        count + 1,
        withArrayIndexUpdated(fragment, newChild, children)
      )
    }

    if (!isEmptyNode(child) && isEmptyNode(newChild)) {
      if (count - 1 <= MIN_ARRAY_NODE) {
        return toIndexNode(getSubordinateContext(owner), count, fragment, children)
      }
      if (isMutable(this)) {
        this.size = count - 1
        children[fragment] = empty<K, V>()
        return this
      }
      return new ArrayNode<K, V>(
        getSubordinateContext(owner),
        count - 1,
        withArrayIndexUpdated(fragment, empty<K, V>(), children)
      )
    }

    if (isMutable(this)) {
      children[fragment] = newChild
      return this
    }

    return new ArrayNode(
      getSubordinateContext(owner),
      count,
      withArrayIndexUpdated(fragment, newChild, children)
    )
  }
}

function isEmptyNode(node: AnyNode<any, any>): boolean {
  return node && node.type === NodeType.EMPTY
}
