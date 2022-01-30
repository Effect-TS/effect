import * as St from "../../../../../prelude/Structural"
import { _A } from "../../../../../support/Symbols"
import type { List, MutableList, Node } from "../../definition"
import { ListTypeId } from "../../definition"
import { equalsWith_ } from "../equalsWith"
import { ForwardListIterator } from "./ListIterator"

export class ListInternal<A> implements Iterable<A>, List<A>, St.HasEquals, St.HasHash {
  readonly [ListTypeId]: ListTypeId = ListTypeId;
  readonly [_A]: () => A

  constructor(
    readonly bits: number,
    readonly offset: number,
    readonly length: number,
    readonly prefix: A[],
    readonly root: Node | undefined,
    readonly suffix: A[]
  ) {}

  [Symbol.iterator](): Iterator<A> {
    return new ForwardListIterator(this)
  }

  [St.equalsSym](that: unknown): boolean {
    return that instanceof ListInternal && equalsWith_(this, that, St.equals)
  }

  get [St.hashSym](): number {
    return St.hashIterator(this[Symbol.iterator]())
  }
}

export function cloneList<A>(l: List<A>): MutableList<A> {
  return new ListInternal(l.bits, l.offset, l.length, l.prefix, l.root, l.suffix) as any
}
