import { memo } from "../../utils"
import { fcApplyConfig, accessFC } from "../config"
import { FastCheckType, FastCheckURI } from "../hkt"

import { Array } from "@matechs/core/Array"
import { introduce } from "@matechs/core/Function"
import { Ord } from "@matechs/core/Ord"
import { fromArray, Set } from "@matechs/core/Set"
import type { AnyEnv, ConfigsForType } from "@matechs/morphic-alg/config"
import type { MatechsAlgebraSet1, SetConfig } from "@matechs/morphic-alg/set"

export const fcSetInterpreter = memo(
  <Env extends AnyEnv>(): MatechsAlgebraSet1<FastCheckURI, Env> => ({
    _F: FastCheckURI,
    set: <A>(
      a: (env: Env) => FastCheckType<A>,
      ord: Ord<A>,
      config?: ConfigsForType<Env, Array<unknown>, Set<A>, SetConfig<unknown, A>>
    ) => (env) =>
      introduce(a(env).arb)(
        (arb) =>
          new FastCheckType(
            fcApplyConfig(config)(accessFC(env).set(arb).map(fromArray(ord)), env, {
              arb
            })
          )
      )
  })
)
