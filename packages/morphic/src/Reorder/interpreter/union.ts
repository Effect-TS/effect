import type { UnionURI } from "../../Algebra/Union"
import { interpreter } from "../../HKT"
import { reorderApplyConfig, ReorderType, ReorderURI } from "../base"

export const reorderUnionInterpreter = interpreter<ReorderURI, UnionURI>()(() => ({
  _F: ReorderURI,
  union: (...types) => (guards, config) => (env) => {
    const reorders = types.map((a) => a(env).reorder)

    return new ReorderType(
      reorderApplyConfig(config?.conf)(
        {
          reorder: (u) => {
            for (const i in guards) {
              if (guards[i](u)._tag === "Some") {
                return reorders[i].reorder(u)
              }
            }
            throw new Error("BUG: guard not found")
          }
        },
        env,
        {
          reorders: reorders as any
        }
      )
    )
  }
}))
