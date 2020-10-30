import * as A from "@effect-ts/core/Classic/Array"
import { pipe } from "@effect-ts/core/Function"
import * as T from "@effect-ts/core/Sync"

import type { AnyEnv, ConfigsForType } from "../../Algebra/config"
import type {
  AlgebraIntersection1,
  IntersectionConfig
} from "../../Algebra/intersection"
import { memo } from "../../Internal/Utils"
import { decoderApplyConfig } from "../config"
import { DecoderType, DecoderURI } from "../hkt"
import { foreachArray, mergePrefer } from "./common"

export const decoderIntersectionInterpreter = memo(
  <Env extends AnyEnv>(): AlgebraIntersection1<DecoderURI, Env> => ({
    _F: DecoderURI,
    intersection: <A>(
      types: ((env: Env) => DecoderType<A>)[],
      config?: {
        name?: string
        conf?: ConfigsForType<Env, unknown, A, IntersectionConfig<unknown[], A[]>>
      }
    ) => (env: Env) => {
      const decoders = types.map((getDecoder) => getDecoder(env).decoder)

      return new DecoderType<A>(
        decoderApplyConfig(config?.conf)(
          {
            validate: (u, c) =>
              pipe(
                decoders,
                foreachArray((k, d) =>
                  d.validate(u, {
                    actual: d,
                    key: c.key,
                    types: config?.name ? [...c.types, config.name] : c.types
                  })
                ),
                T.map(A.reduce(({} as unknown) as A, (b, a) => mergePrefer(u, b, a)))
              )
          },
          env,
          {
            decoders: decoders as any
          }
        )
      )
    }
  })
)
