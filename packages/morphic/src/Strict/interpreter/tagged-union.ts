import type { AnyEnv } from "../../Algebra/config"
import type { AlgebraTaggedUnion1 } from "../../Algebra/tagged-union"
import { mapRecord, memo } from "../../Internal/Utils"
import { strictApplyConfig } from "../config"
import { StrictType, StrictURI } from "../hkt"

export const strictTaggedUnionInterpreter = memo(
  <Env extends AnyEnv>(): AlgebraTaggedUnion1<StrictURI, Env> => ({
    _F: StrictURI,
    taggedUnion: (tag, types, config) => (env) => {
      const stricts = mapRecord(types, (a) => a(env).strict)

      return new StrictType(
        strictApplyConfig(config?.conf)(
          {
            shrink: (u) => stricts[u[tag]].shrink(u)
          },
          env,
          {
            stricts: stricts as any
          }
        )
      )
    }
  })
)
