// tracing: off

import "../../Operator"

import * as St from "../../Structural"

export class HashedPair<A extends St.HasHash, B extends St.HasHash>
  implements St.HasHash {
  constructor(readonly first: A, readonly second: B) {}

  [St.hashSym]() {
    return St.combineHash(this.first[St.hashSym](), this.second[St.hashSym]())
  }
}
