// copyright https://github.com/frptools

import type { ChangeFlag } from "../../../../_internal/Core/ChangeFlag"
import type { MutationContext, Persistent } from "../../../../_internal/Structural"
import {
  cloneSymbol,
  getSubordinateContext,
  immutable,
  mutationContextSymbol
} from "../../../../_internal/Structural"
import { NOTHING } from "../Constants"
import { LeafNode } from "../LeafNode"
import type { AnyNode, Empty } from "../Types"
import { NodeType } from "../Types"

export class EmptyNode<K, V> implements Empty<K, V> {
  public readonly [mutationContextSymbol]: MutationContext = immutable()
  public group = 0
  public type: NodeType.EMPTY = NodeType.EMPTY

  constructor() {
    this.modify = this.modify.bind(this)
    this[cloneSymbol] = this[cloneSymbol].bind(this)
  }

  public [cloneSymbol](_mctx: MutationContext): EmptyNode<K, V> {
    return EMPTY
  }

  public modify(
    owner: Persistent,
    change: ChangeFlag,
    shift: number,
    get: (value?: any) => any,
    hash: number,
    key: K
  ): AnyNode<K, V> {
    const value = get(void shift)
    if (value === NOTHING) {
      return this
    }

    change.inc()

    return new LeafNode(getSubordinateContext(owner), hash, key, value)
  }
}

export const EMPTY = new EmptyNode<any, any>()

export function empty<K, V>(): Empty<K, V> {
  return EMPTY
}
