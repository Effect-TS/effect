// copyright https://github.com/frptools

import {
  withArrayIndexInserted,
  withArrayIndexRemoved
} from "../../../../_internal/Array"
import type { ChangeFlag } from "../../../../_internal/Core/ChangeFlag"
import type { MutationContext, Persistent } from "../../../../_internal/Structural"
import {
  cloneSymbol,
  getSubordinateContext,
  isMutable,
  mutationContextSymbol
} from "../../../../_internal/Structural"
import { NOTHING } from "../Constants"
import { combineLeafNodes, LeafNode } from "../LeafNode"
import type { AnyNode, Collision, GetValueFn } from "../Types"
import { NodeType } from "../Types"

export function newCollisionList<K, V>(
  mctx: MutationContext,
  change: ChangeFlag,
  hash: number,
  list: Array<LeafNode<K, V>>,
  get: GetValueFn<V>,
  key: K
): Array<LeafNode<K, V>> {
  const length = list.length

  for (let i = 0; i < length; ++i) {
    const child = list[i]

    if (child.key === key) {
      const value = child.value
      const newValue = get(value)

      if (newValue === value) {
        return list
      }

      if (newValue === NOTHING) {
        change.dec()
        return withArrayIndexRemoved(i, list)
      }

      return withArrayIndexInserted(i, new LeafNode(mctx, hash, key, newValue), list)
    }
  }

  const newValue = get()

  if (newValue === NOTHING) {
    return list
  }

  change.inc()

  return withArrayIndexInserted(length, new LeafNode(mctx, hash, key, newValue), list)
}

export class CollisionNode<K, V> implements Collision<K, V> {
  public readonly [mutationContextSymbol]: MutationContext
  public type: NodeType.COLLISION = NodeType.COLLISION

  constructor(
    mctx: MutationContext,
    public hash: number,
    public children: Array<LeafNode<K, V>>
  ) {
    this[mutationContextSymbol] = mctx
    this[cloneSymbol] = this[cloneSymbol].bind(this)
    this.modify = this.modify.bind(this)
  }

  public [cloneSymbol](mctx: MutationContext): CollisionNode<K, V> {
    return new CollisionNode(mctx, this.hash, this.children)
  }

  public modify(
    owner: Persistent,
    change: ChangeFlag,
    shift: number,
    get: GetValueFn<V>,
    hash: number,
    key: K
  ): AnyNode<K, V> {
    if (hash === this.hash) {
      const list: Array<LeafNode<K, V>> = newCollisionList(
        getSubordinateContext(owner),
        change,
        this.hash,
        this.children,
        get,
        key
      )

      if (list === this.children) {
        return this
      }

      change.confirmed = true

      if (list.length <= 1) {
        return list[0]
      }

      if (isMutable(this)) {
        this.children = list
        return this
      }

      new CollisionNode(getSubordinateContext(owner), this.hash, list)
    }

    const value = get()

    if (value === NOTHING) {
      return this
    }

    change.dec()

    const mctx = getSubordinateContext(owner)
    return combineLeafNodes(
      mctx,
      shift,
      this.hash,
      this as any,
      hash,
      new LeafNode(mctx, hash, key, value)
    )
  }
}
