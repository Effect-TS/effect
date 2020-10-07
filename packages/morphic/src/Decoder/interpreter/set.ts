import type { Array } from "@effect-ts/core/Classic/Array"
import * as A from "@effect-ts/core/Classic/Array"
import type { Ord } from "@effect-ts/core/Classic/Ord"
import type { Set } from "@effect-ts/core/Classic/Set"
import * as S from "@effect-ts/core/Classic/Set"
import * as T from "@effect-ts/core/Classic/Sync"
import { pipe } from "@effect-ts/core/Function"

import type { AnyEnv, ConfigsForType } from "../../Algebra/config"
import type { AlgebraSet1, SetConfig } from "../../Algebra/set"
import { memo } from "../../Internal/Utils"
import { decoderApplyConfig } from "../config"
import { DecoderType, DecoderURI, fail } from "../hkt"
import { Validation } from "./common"

export const decoderSetInterpreter = memo(
  <Env extends AnyEnv>(): AlgebraSet1<DecoderURI, Env> => ({
    _F: DecoderURI,
    set: <A>(
      a: (env: Env) => DecoderType<A>,
      _: Ord<A>,
      config?: {
        name?: string
        conf?: ConfigsForType<Env, Array<unknown>, Set<A>, SetConfig<unknown, A>>
      }
    ) => (env) =>
      pipe(
        a(env).decoder,
        (decoder) =>
          new DecoderType(
            decoderApplyConfig(config?.conf)(
              {
                decode: (u) =>
                  Array.isArray(u)
                    ? pipe(
                        u,
                        A.foreachF(Validation)(decoder.decode),
                        T.map(S.fromArray(_))
                      )
                    : fail([
                        {
                          actual: u,
                          message: `${typeof u} is not a Set`
                        }
                      ])
              },
              env,
              { decoder }
            )
          )
      )
  })
)
