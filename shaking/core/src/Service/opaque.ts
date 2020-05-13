import type { ModuleShape } from "./ModuleShape"
import type { ModuleSpec } from "./ModuleSpec"

export const opaque = <A extends ModuleShape<A>>() => <
  B extends A,
  S extends ModuleSpec<B>
>(
  _: S
): ModuleSpec<A> => _
