import type { ModuleShape } from "./ModuleShape"
import { specURI } from "./specURI"

export interface ModuleSpec<M> {
  [specURI]: ModuleShape<M>
}
