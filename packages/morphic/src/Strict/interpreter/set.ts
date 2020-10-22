import type { Array } from "@effect-ts/core/Classic/Array"
import type { Ord } from "@effect-ts/core/Classic/Ord"
import type { Set } from "@effect-ts/core/Classic/Set"
import { pipe } from "@effect-ts/core/Function"
import * as T from "@effect-ts/core/Sync"

import type { AnyEnv, ConfigsForType } from "../../Algebra/config"
import type { AlgebraSet1, SetConfig } from "../../Algebra/set"
import { memo } from "../../Internal/Utils"
import { strictApplyConfig } from "../config"
import { StrictType, StrictURI } from "../hkt"

export const strictSetInterpreter = memo(
  <Env extends AnyEnv>(): AlgebraSet1<StrictURI, Env> => ({
    _F: StrictURI,
    set: <A>(
      a: (env: Env) => StrictType<A>,
      _: Ord<A>,
      config?: {
        name?: string
        conf?: ConfigsForType<Env, Array<unknown>, Set<A>, SetConfig<unknown, A>>
      }
    ) => (env) =>
      pipe(
        a(env).strict,
        (strict) =>
          new StrictType(
            strictApplyConfig(config?.conf)(
              {
                shrink: T.succeed
              },
              env,
              { strict }
            )
          )
      )
  })
)
