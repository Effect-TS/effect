import type { ModuleShape } from "./ModuleShape"
import type { ModuleSpec } from "./ModuleSpec"
import { specURI } from "./specURI"

export function define<T extends ModuleShape<T>>(m: T): ModuleSpec<T> {
  return { [specURI]: m }
}
