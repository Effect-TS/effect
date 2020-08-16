import { DecoderURI, primitivesInterpreter } from ".."
import { AlgebraURIS } from "../../registry"
import { Sync, SyncStackURI } from "../../stack"
import { finalize } from "../../utils"
import { contramapF, mapF } from "../decoder"

export const decoder = finalize<AlgebraURIS, DecoderURI, SyncStackURI>()(
  primitivesInterpreter(Sync)
)

export const map = mapF(Sync)

export const contramap = contramapF(Sync)
