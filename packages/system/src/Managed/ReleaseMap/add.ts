// ets_tracing: off

import * as O from "../../Option/index.js"
import * as T from "../deps-core"
import { addIfOpen } from "./addIfOpen.js"
import type { Finalizer } from "./finalizer.js"
import { release } from "./release"
import type { ReleaseMap } from "./ReleaseMap"

export function add(finalizer: Finalizer) {
  return (_: ReleaseMap) =>
    T.map_(
      addIfOpen(finalizer)(_),
      O.fold(
        (): Finalizer => () => T.unit,
        (k): Finalizer =>
          (e) =>
            release(k, e)(_)
      )
    )
}
