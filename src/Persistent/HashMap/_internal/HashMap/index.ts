// copyright https://github.com/frptools

import { isCollectionSymbol, sizeSymbol } from "../../../_internal/Core/Collection"
import type { IndexedCollection } from "../../../_internal/Core/IndexedCollection"
import {
  getSymbol,
  hasSymbol,
  setSymbol,
  updateSymbol,
  verifyKeySymbol
} from "../../../_internal/Core/IndexedCollection"
import { isObject } from "../../../_internal/Guards"
import type { MutationContext } from "../../../_internal/Structural"
import {
  cloneSymbol,
  createUnwrapTargetSymbol,
  equalsSymbol,
  hashIterator,
  hashSymbol,
  mutationContextSymbol,
  unwrap,
  unwrapIntoSymbol,
  unwrapSymbol
} from "../../../_internal/Structural"
import type { AssociativeMap } from "../../../_internal/Types"
import { entries, get_, has_, isEqual_, set_, update_ } from "../Functions"
import type { AnyNode } from "../Nodes"
import { unwrapInto } from "../Primitives"

export class HashMap<K, V>
  implements IndexedCollection<K, V, [K, V], AssociativeMap<V>> {
  constructor(
    mctx: MutationContext,
    public _root: AnyNode<K, V>,
    public _size: number
  ) {
    this[mutationContextSymbol] = mctx
    this[cloneSymbol] = this[cloneSymbol].bind(this)
    this[createUnwrapTargetSymbol] = this[createUnwrapTargetSymbol].bind(this)
    this[equalsSymbol] = this[equalsSymbol].bind(this)
    this[getSymbol] = this[getSymbol].bind(this)
    this[hasSymbol] = this[hasSymbol].bind(this)
    this[hashSymbol] = this[hashSymbol].bind(this)
    this[setSymbol] = this[setSymbol].bind(this)
    this[unwrapIntoSymbol] = this[unwrapIntoSymbol].bind(this)
    this[unwrapSymbol] = this[unwrapSymbol].bind(this)
    this[updateSymbol] = this[updateSymbol].bind(this)
    this[verifyKeySymbol] = this[verifyKeySymbol].bind(this)
  }

  get [isCollectionSymbol](): true {
    return true
  }

  get [sizeSymbol](): number {
    return this._size
  }

  readonly [mutationContextSymbol]: MutationContext;

  [cloneSymbol](mctx: MutationContext): HashMap<K, V> {
    return new HashMap<K, V>(mctx, this._root, this._size)
  }

  [equalsSymbol](other: HashMap<K, V>): boolean {
    return isEqual_(this, other)
  }

  [hashSymbol](): number {
    return hashIterator(entries(this))
  }

  [unwrapSymbol](): AssociativeMap<V> {
    return unwrap<AssociativeMap<V>>(this)
  }

  [unwrapIntoSymbol](target: AssociativeMap<V>): AssociativeMap<V> {
    return unwrapInto(target, this)
  }

  [createUnwrapTargetSymbol](): AssociativeMap<V> {
    return {}
  }

  [getSymbol](key: K): V | undefined {
    return get_(this, key)
  }

  [hasSymbol](key: K): boolean {
    return has_(this, key)
  }

  [setSymbol](key: K, value: V): this {
    return <this>set_(this, key, value)
  }

  [updateSymbol](key: K, updater: (value: V, map: this) => any): this {
    return <this>update_(this, key, updater as any)
  }

  [verifyKeySymbol](_key: K): boolean {
    return true
  }

  public [Symbol.iterator](): IterableIterator<[K, V]> {
    return entries<K, V>(<HashMap<K, V>>this)
  }
}

export function isHashMap(arg: any): arg is HashMap<unknown, unknown> {
  return isObject(arg) && arg instanceof HashMap
}
