import * as St from "../../../../../prelude/Structural"
import { _A } from "../../../../../support/Symbols"
import type { HashMap } from "../../../HashMap"
import * as Iter from "../../../Iterable"
import { HashSet, HashSetSym } from "../../definition"

export class HashSetInternal<A> implements HashSet<A>, St.HasHash, St.HasEquals {
  readonly [HashSetSym]: HashSetSym = HashSetSym;
  readonly [_A]!: () => A

  constructor(readonly _keyMap: HashMap<A, unknown>) {}

  [Symbol.iterator](): Iterator<A> {
    return this._keyMap.keys()
  }

  get [St.hashSym](): number {
    return St.hashIterator(this[Symbol.iterator]())
  }

  [St.equalsSym](that: unknown): boolean {
    if (HashSet.isHashSet(that)) {
      realHashSet(that)
      return (
        this._keyMap.size === that._keyMap.size &&
        Iter.corresponds(this, that, St.equals)
      )
    }
    return false
  }
}

/**
 * @tsplus macro remove
 */
export function realHashSet<A>(_: HashSet<A>): asserts _ is HashSetInternal<A> {
  //
}
