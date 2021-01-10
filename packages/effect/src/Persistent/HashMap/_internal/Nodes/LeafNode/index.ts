// copyright https://github.com/frptools

import type { ChangeFlag } from "../../../../_internal/Core/ChangeFlag"
import type { MutationContext, Persistent } from "../../../../_internal/Structural"
import {
  cloneSymbol,
  getSubordinateContext,
  isMutable,
  mutationContextSymbol
} from "../../../../_internal/Structural"
import { hashFragment, SIZE, toBitmap } from "../../Common"
import { CollisionNode } from "../CollisionNode"
import { NOTHING } from "../Constants"
import { empty } from "../EmptyNode"
import { IndexedNode } from "../IndexedNode"
import type { AnyNode, ChildrenNodes, GetValueFn, Leaf } from "../Types"
import { NodeType } from "../Types"

export class LeafNode<K, V> implements Leaf<K, V> {
  public readonly [mutationContextSymbol]: MutationContext
  public type: NodeType.LEAF = NodeType.LEAF

  constructor(
    mctx: MutationContext,
    public hash: number,
    public key: K,
    public value: V
  ) {
    this[mutationContextSymbol] = mctx
    this[cloneSymbol] = this[cloneSymbol].bind(this)
    this.modify = this.modify.bind(this)
  }

  public [cloneSymbol](mctx: MutationContext): LeafNode<K, V> {
    return new LeafNode<K, V>(mctx, this.hash, this.key, this.value)
  }

  public modify(
    owner: Persistent,
    change: ChangeFlag,
    shift: number,
    get: GetValueFn<V>,
    hash: number,
    key: K
  ): AnyNode<K, V> {
    if (key === this.key) {
      const value = get(this.value)

      if (value === this.value) {
        return this
      }

      if (value === NOTHING) {
        change.dec()
        return empty<K, V>()
      }

      change.confirmed = true

      if (isMutable(this)) {
        this.value = value
        return this
      }

      return new LeafNode(getSubordinateContext(owner), hash, key, value)
    }

    const value = get()

    if (value === NOTHING) {
      return this
    }

    change.inc()

    const mctx = getSubordinateContext(owner)
    return combineLeafNodes(
      mctx,
      shift,
      this.hash,
      this,
      hash,
      new LeafNode(mctx, hash, key, value)
    )
  }
}

export function combineLeafNodes<K, V>(
  mctx: MutationContext,
  shift: number,
  hash1: number,
  leafNode1: LeafNode<K, V>,
  hash2: number,
  leafNode2: LeafNode<K, V>
): CollisionNode<K, V> | IndexedNode<K, V> {
  if (hash1 === hash2) {
    return new CollisionNode(mctx, hash1, [leafNode2, leafNode1])
  }

  const fragment1 = hashFragment(shift, hash1)
  const fragment2 = hashFragment(shift, hash2)

  return new IndexedNode(
    mctx,
    toBitmap(fragment1) | toBitmap(fragment2),
    ((fragment1 === fragment2
      ? [combineLeafNodes(mctx, shift + SIZE, hash1, leafNode1, hash2, leafNode2)]
      : fragment1 < fragment2
      ? [leafNode1, leafNode2]
      : [leafNode2, leafNode1]) as any) as ChildrenNodes<K, V>
  )
}
