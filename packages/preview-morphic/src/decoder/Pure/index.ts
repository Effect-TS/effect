import { DecoderURI, primitivesInterpreter } from ".."
import { AlgebraURIS } from "../../registry"
import { Pure, PureStackURI } from "../../stack"
import { finalize } from "../../utils"
import { contramapF, mapF } from "../decoder"

export const decoder = finalize<AlgebraURIS, DecoderURI, PureStackURI>()(
  primitivesInterpreter(Pure)
)

export const map = mapF(Pure)

export const contramap = contramapF(Pure)
