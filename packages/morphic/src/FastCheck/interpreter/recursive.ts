import { pipe } from "@effect-ts/core/Function"

import type { AnyEnv, ConfigsForType } from "../../Algebra/config"
import type { AlgebraRecursive1, RecursiveConfig } from "../../Algebra/recursive"
import { memo } from "../../Internal/Utils"
import { accessFC, fcApplyConfig } from "../config"
import { FastCheckType, FastCheckURI } from "../hkt"

export const fcRecursiveInterpreter = memo(
  <Env extends AnyEnv>(): AlgebraRecursive1<FastCheckURI, Env> => ({
    _F: FastCheckURI,
    recursive: <A>(
      f: (x: (env: Env) => FastCheckType<A>) => (env: Env) => FastCheckType<A>,
      config?: {
        name?: string
        conf?: ConfigsForType<Env, unknown, A, RecursiveConfig<unknown, A>>
      }
    ) => {
      type FA = ReturnType<typeof f>
      const get = memo(() => f(res))
      const res: FA = (env) =>
        pipe(
          () => get()(env).arb,
          (getArb) =>
            new FastCheckType(
              fcApplyConfig(config?.conf)(
                accessFC(env)
                  .constant(null)
                  .chain((_) => getArb()),
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
