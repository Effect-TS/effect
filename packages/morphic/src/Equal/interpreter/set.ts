import type { Array } from "@effect-ts/core/Classic/Array"
import type { Ord } from "@effect-ts/core/Classic/Ord"
import type { Set } from "@effect-ts/core/Classic/Set"
import { getEqual as SgetEq } from "@effect-ts/core/Classic/Set"
import { pipe } from "@effect-ts/core/Function"

import type { AnyEnv, ConfigsForType } from "../../Algebra/config"
import type { AlgebraSet1, SetConfig } from "../../Algebra/set"
import { memo } from "../../Internal/Utils"
import { eqApplyConfig } from "../config"
import { EqType, EqURI } from "../hkt"

export const eqSetInterpreter = memo(
  <Env extends AnyEnv>(): AlgebraSet1<EqURI, Env> => ({
    _F: EqURI,
    set: <A>(
      a: (env: Env) => EqType<A>,
      _ord: Ord<A>,
      config?: {
        name?: string
        conf?: ConfigsForType<Env, Array<unknown>, Set<A>, SetConfig<unknown, A>>
      }
    ) => (env) =>
      pipe(
        a(env).eq,
        (eq) => new EqType(eqApplyConfig(config?.conf)(SgetEq(eq), env, { eq }))
      )
  })
)
