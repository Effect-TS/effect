import type { Array } from "@effect-ts/core/Classic/Array"
import type { Ord } from "@effect-ts/core/Classic/Ord"
import type { Set } from "@effect-ts/core/Classic/Set"
import { getShow as SgetShow } from "@effect-ts/core/Classic/Set"
import { pipe } from "@effect-ts/core/Function"

import type { AnyEnv, ConfigsForType } from "../../Algebra/config"
import type { AlgebraSet1, SetConfig } from "../../Algebra/set"
import { memo } from "../../Internal/Utils"
import { showApplyConfig } from "../config"
import { ShowType, ShowURI } from "../hkt"

export const showSetInterpreter = memo(
  <Env extends AnyEnv>(): AlgebraSet1<ShowURI, Env> => ({
    _F: ShowURI,
    set: <A>(
      getShow: (env: Env) => ShowType<A>,
      _ord: Ord<A>,
      config?: {
        name?: string
        conf?: ConfigsForType<Env, Array<unknown>, Set<A>, SetConfig<unknown, A>>
      }
    ) => (env) =>
      pipe(
        getShow(env).show,
        (show) =>
          new ShowType(showApplyConfig(config?.conf)(SgetShow(show), env, { show }))
      )
  })
)
