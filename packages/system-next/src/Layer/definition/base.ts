// ets_tracing: off

import { _E, _RIn, _ROut } from "../../Effect/definition/commons"
import { AtomicReference } from "../../Support/AtomicReference"

export const LayerHashSym = Symbol.for("@effect-ts/system/Layer")
export type LayerHashSym = typeof LayerHashSym

export abstract class Layer<RIn, E, ROut> {
  readonly [LayerHashSym] = new AtomicReference<PropertyKey>(Symbol());

  readonly [_RIn]: (_: RIn) => void;
  readonly [_E]: () => E;
  readonly [_ROut]: () => ROut

  /**
   * Set the hash key for memoization
   */
  setKey(hash: PropertyKey) {
    this[LayerHashSym].set(hash)
    return this
  }
}
