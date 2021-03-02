import * as O from "../../Option"
import * as T from "../deps-core"
import { addIfOpen } from "./addIfOpen"
import type { Finalizer } from "./finalizer"
import { release } from "./release"
import type { ReleaseMap } from "./ReleaseMap"

export function add(finalizer: Finalizer) {
  return (_: ReleaseMap) =>
    T.map_(
      addIfOpen(finalizer)(_),
      O.fold(
        (): Finalizer => () => T.unit,
        (k): Finalizer => (e) => release(k, e)(_)
      )
    )
}
