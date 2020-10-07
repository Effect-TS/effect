import type { AnyEnv } from "../../Algebra/config"
import type { AlgebraTaggedUnion1 } from "../../Algebra/tagged-union"
import { mapRecord, memo } from "../../Internal/Utils"
import { showApplyConfig } from "../config"
import { ShowType, ShowURI } from "../hkt"

export const showTaggedUnionInterpreter = memo(
  <Env extends AnyEnv>(): AlgebraTaggedUnion1<ShowURI, Env> => ({
    _F: ShowURI,
    taggedUnion: (tag, types, config) => (env) => {
      const shows = mapRecord(types, (a) => a(env).show)
      return new ShowType(
        showApplyConfig(config?.conf)(
          {
            show: (a): string => (shows as any)[a[tag]].show(a)
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
