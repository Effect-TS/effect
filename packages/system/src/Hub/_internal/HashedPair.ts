import * as H from "../../Case/HasHash"
import * as HH from "../../Hash"

export class HashedPair<A extends H.HasHash, B extends H.HasHash> implements H.HasHash {
  #hash!: number

  constructor(readonly first: A, readonly second: B) {}

  [H.hashSym]() {
    if (!this.#hash) {
      this.#hash = HH.combineHash(this.first[H.hashSym](), this.second[H.hashSym]())
    }

    return this.#hash
  }
}
