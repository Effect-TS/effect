import type { ModuleShape } from "./ModuleShape"
import type { Patched } from "./Patched"

export type Derived<A extends ModuleShape<A>> = {
  [k in keyof A]: {
    [h in keyof A[k]]: Patched<A, A[k][h]>
  }
}
