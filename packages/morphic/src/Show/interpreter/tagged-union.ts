import type { TaggedUnionURI } from "../../Algebra/TaggedUnion"
import { interpreter } from "../../HKT"
import { mapRecord } from "../../Utils"
import { showApplyConfig, ShowType, ShowURI } from "../base"

export const showTaggedUnionInterpreter = interpreter<ShowURI, TaggedUnionURI>()(
  () => ({
    _F: ShowURI,
    taggedUnion: (tag, types, config) => (env) => {
      const shows = mapRecord(types, (a) => a(env).show)
      return new ShowType(
        showApplyConfig(config?.conf)(
          {
            show: (a): string => (shows as any)[a[tag as any]].show(a)
          },
          env,
          {
            shows: shows as any
          }
        )
      )
    }
  })
)
