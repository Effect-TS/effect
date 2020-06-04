import type { AnyEnv, ConfigsForType } from "@morphic-ts/common/lib/config"
import { oneof } from "fast-check"

import { memo } from "../../utils"
import { fcApplyConfig } from "../config"
import { FastCheckType, FastCheckURI } from "../hkt"

import type { MatechsAlgebraUnions1 } from "@matechs/morphic-alg/unions"

export const fcUnionInterpreter = memo(
  <Env extends AnyEnv>(): MatechsAlgebraUnions1<FastCheckURI, Env> => ({
    _F: FastCheckURI,
    union: <A>(
      items: ((env: Env) => FastCheckType<A>)[],
      _name: string,
      config?: ConfigsForType<Env, unknown, A>
    ) => (env: Env) =>
      new FastCheckType(
        fcApplyConfig(config)(oneof(...items.map((v) => v(env).arb)), env)
      )
  })
)
