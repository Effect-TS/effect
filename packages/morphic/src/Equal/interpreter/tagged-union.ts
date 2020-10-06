import type { AnyEnv } from "../../Algebra/config"
import type { AlgebraTaggedUnion1 } from "../../Algebra/tagged-union"
import { mapRecord, memo } from "../../Internal/Utils"
import { eqApplyConfig } from "../config"
import { EqType, EqURI } from "../hkt"

export const eqTaggedUnionInterpreter = memo(
  <Env extends AnyEnv>(): AlgebraTaggedUnion1<EqURI, Env> => ({
    _F: EqURI,
    taggedUnion: (tag, types, config) => (env) => {
      const equals = mapRecord(types, (a) => a(env).eq)
      return new EqType(
        eqApplyConfig(config?.conf)(
          {
            equals: (b) => (a): boolean => {
              if (a === b) {
                return true
              } else {
                const aTag = a[tag]
                return aTag === b[tag] ? equals[aTag].equals(b)(a) : false
              }
            }
          },
          env,
          {
            equals: equals as any
          }
        )
      )
    }
  })
)
