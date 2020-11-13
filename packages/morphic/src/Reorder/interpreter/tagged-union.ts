import type { TaggedUnionURI } from "../../Algebra/TaggedUnion"
import { interpreter } from "../../HKT"
import { mapRecord } from "../../Utils"
import { reorderApplyConfig, ReorderType, ReorderURI } from "../base"

export const reorderTaggedUnionInterpreter = interpreter<ReorderURI, TaggedUnionURI>()(
  () => ({
    _F: ReorderURI,
    taggedUnion: (tag, types, config) => (env) => {
      const reorders = mapRecord(types, (a) => a(env).reorder)

      return new ReorderType(
        reorderApplyConfig(config?.conf)(
          {
            reorder: (u) => reorders[u[tag as any] as any].reorder(u)
          },
          env,
          {
            reorders: reorders as any
          }
        )
      )
    }
  })
)
