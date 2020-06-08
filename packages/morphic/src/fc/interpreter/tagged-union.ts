import { memo, collect } from "../../utils"
import { fcApplyConfig, accessFC } from "../config"
import { FastCheckType, FastCheckURI } from "../hkt"

import { introduce } from "@matechs/core/Function"
import type { AnyEnv } from "@matechs/morphic-alg/config"
import type { MatechsAlgebraTaggedUnions1 } from "@matechs/morphic-alg/tagged-union"

export const fcTaggedUnionInterpreter = memo(
  <Env extends AnyEnv>(): MatechsAlgebraTaggedUnions1<FastCheckURI, Env> => ({
    _F: FastCheckURI,
    taggedUnion: (_tag, dic, _name, config) => (env) =>
      new FastCheckType(
        introduce(collect(dic, (_, getArb) => getArb(env).arb))((arbs) =>
          fcApplyConfig(config)(accessFC(env).oneof(...arbs), env, {
            arbs: arbs as any
          })
        )
      )
  })
)
