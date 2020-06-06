import { TaggedUnionA } from "../../config"
import { mapRecord, memo } from "../../utils"
import { eqApplyConfig } from "../config"
import { EqType, EqURI } from "../hkt"

import * as E from "@matechs/core/Eq"
import type { AnyEnv } from "@matechs/morphic-alg/config"
import type { MatechsAlgebraTaggedUnions1 } from "@matechs/morphic-alg/tagged-union"

declare module "@matechs/morphic-alg/tagged-union" {
  export interface TaggedUnionConfig<Types> {
    [EqURI]: {
      equals: TaggedUnionA<Types, E.URI>
    }
  }
}

export const eqTaggedUnionInterpreter = memo(
  <Env extends AnyEnv>(): MatechsAlgebraTaggedUnions1<EqURI, Env> => ({
    _F: EqURI,
    taggedUnion: (tag, types, _name, config) => (env) => {
      const equals = mapRecord(types, (a) => a(env).eq.equals)
      return new EqType(
        eqApplyConfig(config)(
          {
            equals: (a, b): boolean => {
              if (a === b) {
                return true
              } else {
                const aTag = a[tag]
                return aTag === b[tag] ? equals[aTag](a, b) : false
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
