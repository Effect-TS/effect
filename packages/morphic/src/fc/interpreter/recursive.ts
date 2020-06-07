import { constant } from "fast-check"

import { memo } from "../../utils"
import { fcApplyConfig } from "../config"
import { FastCheckType, FastCheckURI } from "../hkt"

import { introduce } from "@matechs/core/Function"
import type { AnyEnv, ConfigsForType } from "@matechs/morphic-alg/config"
import type {
  MatechsAlgebraRecursive1,
  RecursiveConfig
} from "@matechs/morphic-alg/recursive"

export const fcRecursiveInterpreter = memo(
  <Env extends AnyEnv>(): MatechsAlgebraRecursive1<FastCheckURI, Env> => ({
    _F: FastCheckURI,
    recursive: <A>(
      f: (x: (env: Env) => FastCheckType<A>) => (env: Env) => FastCheckType<A>,
      _name: string,
      config?: ConfigsForType<Env, unknown, A, RecursiveConfig<unknown, A>>
    ) => {
      type FA = ReturnType<typeof f>
      const get = memo(() => f(res))
      const res: FA = (env) =>
        introduce(() => get()(env).arb)(
          (getArb) =>
            new FastCheckType(
              fcApplyConfig(config)(
                constant(null).chain((_) => getArb()),
                env,
                {
                  getArb
                }
              )
            )
        )

      return res
    }
  })
)
