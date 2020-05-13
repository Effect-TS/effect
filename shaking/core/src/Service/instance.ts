import type { ModuleShape } from "./ModuleShape"
import type { ModuleSpec } from "./ModuleSpec"
import type { TypeOf } from "./TypeOf"

export function instance<M extends ModuleShape<M>, S extends ModuleSpec<M>>(_: S) {
  return (m: TypeOf<S>) => m
}
