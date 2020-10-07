import * as A from "@effect-ts/core/Classic/Array"
import * as T from "@effect-ts/core/Classic/Sync"
import { pipe } from "@effect-ts/core/Function"

import type { AnyEnv, ConfigsForType } from "../../Algebra/config"
import type {
  AlgebraIntersection1,
  IntersectionConfig
} from "../../Algebra/intersection"
import { memo } from "../../Internal/Utils"
import { decoderApplyConfig } from "../config"
import { DecoderType, DecoderURI } from "../hkt"
import { foreachArray } from "./common"

export const decoderIntersectionInterpreter = memo(
  <Env extends AnyEnv>(): AlgebraIntersection1<DecoderURI, Env> => ({
    _F: DecoderURI,
    intersection: <A>(
      types: ((env: Env) => DecoderType<A>)[],
      config?: {
        conf?: ConfigsForType<Env, unknown, A, IntersectionConfig<unknown[], A[]>>
      }
    ) => (env: Env) => {
      const decoders = types.map((getDecoder) => getDecoder(env).decoder)

      return new DecoderType<A>(
        decoderApplyConfig(config?.conf)(
          {
            decode: (u) =>
              pipe(
                decoders,
                foreachArray((d) => d.decode(u)),
                T.map(A.reduce(({} as unknown) as A, (b, a) => ({ ...b, ...a })))
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
