import type { Array } from "@effect-ts/core/Classic/Array"
import type { Ord } from "@effect-ts/core/Classic/Ord"
import type { Set } from "@effect-ts/core/Classic/Set"
import * as S from "@effect-ts/core/Classic/Set"
import { pipe } from "@effect-ts/core/Function"
import * as T from "@effect-ts/core/Sync"

import type { AnyEnv, ConfigsForType, Named } from "../../Algebra/config"
import type { AlgebraSet1, SetConfig } from "../../Algebra/set"
import { memo } from "../../Internal/Utils"
import { fail } from "../common"
import { decoderApplyConfig } from "../config"
import { DecoderType, DecoderURI } from "../hkt"
import { foreachArray } from "./common"

export const decoderSetInterpreter = memo(
  <Env extends AnyEnv>(): AlgebraSet1<DecoderURI, Env> => ({
    _F: DecoderURI,
    set: <A>(
      a: (env: Env) => DecoderType<A>,
      _: Ord<A>,
      cfg?: Named<ConfigsForType<Env, Array<unknown>, Set<A>, SetConfig<unknown, A>>>
    ) => (env) =>
      pipe(
        a(env).decoder,
        (decoder) =>
          new DecoderType(
            decoderApplyConfig(cfg?.conf)(
              {
                validate: (u, c) =>
                  Array.isArray(u)
                    ? pipe(
                        u,
                        foreachArray((k, a) =>
                          decoder.validate(u, {
                            key: `${c.key}[${k}]`,
                            actual: u,
                            types: cfg?.name ? [...c.types, cfg.name] : c.types
                          })
                        ),
                        T.map(S.fromArray(_))
                      )
                    : fail([
                        {
                          id: cfg?.id,
                          name: cfg?.name,
                          message: `${typeof u} is not a Set`,
                          context: {
                            ...c,
                            actual: u,
                            types: cfg?.name ? [...c.types, cfg.name] : c.types
                          }
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
