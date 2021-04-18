// tracing: off

import "../../Operator"

import * as St from "../../Structural"

export class HashedPair<A extends St.HasHash, B extends St.HasHash>
  implements St.HasHash, St.HasEquals {
  constructor(readonly first: A, readonly second: B) {}

  [St.hashSym]() {
    return St.combineHash(this.first[St.hashSym](), this.second[St.hashSym]())
  }

  [St.equalsSym](that: unknown) {
    return (
      that instanceof HashedPair &&
      St.equals(this.first, that.first) &&
      St.equals(this.second, that.second)
    )
  }
}
