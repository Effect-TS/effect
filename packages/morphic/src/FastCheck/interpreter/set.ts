import type { Array } from "@effect-ts/core/Classic/Array"
import type { Ord } from "@effect-ts/core/Classic/Ord"
import type { Set } from "@effect-ts/core/Classic/Set"
import { fromArray } from "@effect-ts/core/Classic/Set"
import { pipe } from "@effect-ts/core/Function"

import type { AnyEnv, ConfigsForType } from "../../Algebra/config"
import type { AlgebraSet1, SetConfig } from "../../Algebra/set"
import { memo } from "../../Internal/Utils"
import { accessFC, fcApplyConfig } from "../config"
import { FastCheckType, FastCheckURI } from "../hkt"

export const fcSetInterpreter = memo(
  <Env extends AnyEnv>(): AlgebraSet1<FastCheckURI, Env> => ({
    _F: FastCheckURI,
    set: <A>(
      a: (env: Env) => FastCheckType<A>,
      ord: Ord<A>,
      config?: {
        name?: string
        conf?: ConfigsForType<Env, Array<unknown>, Set<A>, SetConfig<unknown, A>>
      }
    ) => (env) =>
      pipe(
        a(env).arb,
        (arb) =>
          new FastCheckType(
            fcApplyConfig(config?.conf)(
              accessFC(env).set(arb).map(fromArray(ord)),
              env,
              {
                arb
              }
            )
          )
      )
  })
)
