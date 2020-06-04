import type { AnyEnv } from "@morphic-ts/common/lib/config"
import { oneof } from "fast-check"

import { memo, collect } from "../../utils"
import { fcApplyConfig } from "../config"
import { FastCheckType, FastCheckURI } from "../hkt"

import type { MatechsAlgebraTaggedUnions1 } from "@matechs/morphic-alg/tagged-union"

export const fcTaggedUnionInterpreter = memo(
  <Env extends AnyEnv>(): MatechsAlgebraTaggedUnions1<FastCheckURI, Env> => ({
    _F: FastCheckURI,
    taggedUnion: (_tag, dic, _name, config) => (env) =>
      new FastCheckType(
        fcApplyConfig(config)(
          oneof(...collect(dic, (_, getArb) => getArb(env).arb)),
          env
        )
      )
  })
)
