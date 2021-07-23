// ets_tracing: off

import "../../Operator"

import * as St from "../../Structural"

export class HashedPair<A, B> implements St.HasHash, St.HasEquals {
  constructor(readonly first: A, readonly second: B) {}

  get [St.hashSym]() {
    return St.combineHash(St.hash(this.first), St.hash(this.second))
  }

  [St.equalsSym](that: unknown) {
    return (
      that instanceof HashedPair &&
      St.equals(this.first, that.first) &&
      St.equals(this.second, that.second)
    )
  }
}
