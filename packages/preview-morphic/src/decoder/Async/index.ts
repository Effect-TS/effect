import { DecoderURI, primitivesInterpreter } from ".."
import { AlgebraURIS } from "../../registry"
import { Async, AsyncStackURI } from "../../stack"
import { finalize } from "../../utils"
import { contramapF, mapF } from "../decoder"

export const decoder = finalize<AlgebraURIS, DecoderURI, AsyncStackURI>()(
  primitivesInterpreter(Async)
)

export const map = mapF(Async)

export const contramap = contramapF(Async)
