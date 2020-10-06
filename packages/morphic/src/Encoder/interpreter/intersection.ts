import * as A from "@effect-ts/core/Classic/Array"
import * as T from "@effect-ts/core/Classic/Sync"
import { pipe } from "@effect-ts/core/Function"

import type { AnyEnv, ConfigsForType } from "../../Algebra/config"
import type {
  AlgebraIntersection2,
  IntersectionConfig
} from "../../Algebra/intersection"
import { memo } from "../../Internal/Utils"
import { encoderApplyConfig } from "../config"
import { EncoderType, EncoderURI } from "../hkt"

export const encoderIntersectionInterpreter = memo(
  <Env extends AnyEnv>(): AlgebraIntersection2<EncoderURI, Env> => ({
    _F: EncoderURI,
    intersection: <L, A>(
      types: ((env: Env) => EncoderType<A, L>)[],
      config?: {
        conf?: ConfigsForType<Env, L, A, IntersectionConfig<L[], A[]>>
      }
    ) => (env: Env) => {
      const encoders = types.map((getEncoder) => getEncoder(env).encoder)
      return new EncoderType<A, L>(
        encoderApplyConfig(config?.conf)(
          {
            encode: (u) =>
              pipe(
                encoders,
                A.foreachF(T.Applicative)((d) => d.encode(u)),
                T.map(A.reduce(({} as unknown) as L, (b, a) => ({ ...b, ...a })))
              )
          },
          env,
          {
            encoders: encoders as any
          }
        )
      )
    }
  })
)
