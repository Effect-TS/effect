import { identity } from "../../../../../data/Function"
import { Option } from "../../../../../data/Option"
import * as St from "../../../../../prelude/Structural"
import * as Iter from "../../../Iterable"
import { Tuple } from "../../../Tuple"
import { HashMap, HashMapSym } from "../../definition/base"
import { _K, _V } from "../../definition/symbols"
import type { Node } from "./node"
import { isEmptyNode } from "./node"

export type TraversalFn<K, V, A> = (node: readonly [K, V]) => A

export type Cont<K, V, A> =
  | [
      len: number,
      children: Node<K, V>[],
      i: number,
      f: TraversalFn<K, V, A>,
      cont: Cont<K, V, A>
    ]
  | undefined

export interface VisitResult<K, V, A> {
  value: A
  cont: Cont<K, V, A>
}

export class HashMapInternal<K, V> implements HashMap<K, V>, St.HasHash, St.HasEquals {
  readonly [HashMapSym]: HashMapSym = HashMapSym;
  readonly [_K]: () => K;
  readonly [_V]: () => V

  constructor(
    public _editable: boolean,
    public _edit: number,
    public _root: Node<K, V>,
    public _size: number
  ) {}

  [Symbol.iterator](): Iterator<readonly [K, V]> {
    return new HashMapIterator(this, identity)
  }

  readonly _tupleIterator: Iterable<Tuple<[K, V]>> = {
    [Symbol.iterator]: () => new HashMapIterator(this, ([k, v]) => Tuple(k, v))
  }

  get [St.hashSym](): number {
    return St.hashIterator(
      new HashMapIterator(this, ([k, v]) => St.combineHash(St.hash(k), St.hash(v)))
    )
  }

  [St.equalsSym](that: unknown): boolean {
    if (HashMap.isHashMap(that)) {
      realHashMap(that)
      return (
        that._size === this._size &&
        Iter.corresponds(this._tupleIterator, that._tupleIterator, St.equals)
      )
    }
    return false
  }
}

export class HashMapIterator<K, V, T> implements IterableIterator<T> {
  v = visitLazy(this.map._root, this.f, undefined)

  constructor(readonly map: HashMapInternal<K, V>, readonly f: TraversalFn<K, V, T>) {}

  next(): IteratorResult<T> {
    if (this.v.isNone()) {
      return { done: true, value: undefined }
    }
    const v0 = this.v.value
    this.v = applyCont(v0.cont)
    return { done: false, value: v0.value }
  }

  [Symbol.iterator](): IterableIterator<T> {
    return new HashMapIterator(this.map, this.f)
  }
}

/**
 * @ets_optimize remove
 */
export function realHashMap<K, V>(
  _: HashMap<K, V>
): asserts _ is HashMapInternal<K, V> {
  //
}

export function applyCont<K, V, A>(cont: Cont<K, V, A>) {
  return cont
    ? visitLazyChildren(cont[0], cont[1], cont[2], cont[3], cont[4])
    : Option.none
}

export function visitLazy<K, V, A>(
  node: Node<K, V>,
  f: TraversalFn<K, V, A>,
  cont: Cont<K, V, A> = undefined
): Option<VisitResult<K, V, A>> {
  switch (node._tag) {
    case "LeafNode": {
      return node.value.isSome()
        ? Option.some({
            value: f([node.key, node.value.value]),
            cont
          })
        : applyCont(cont)
    }
    case "CollisionNode":
    case "ArrayNode":
    case "IndexedNode": {
      const children = node.children
      return visitLazyChildren(children.length, children, 0, f, cont)
    }
    default: {
      return applyCont(cont)
    }
  }
}

export function visitLazyChildren<K, V, A>(
  len: number,
  children: Node<K, V>[],
  i: number,
  f: TraversalFn<K, V, A>,
  cont: Cont<K, V, A>
): Option<VisitResult<K, V, A>> {
  while (i < len) {
    const child = children[i++]
    if (child && !isEmptyNode(child)) {
      return visitLazy(child, f, [len, children, i, f, cont])
    }
  }
  return applyCont(cont)
}
