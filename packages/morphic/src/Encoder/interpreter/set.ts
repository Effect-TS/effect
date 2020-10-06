import * as A from "@effect-ts/core/Classic/Array"
import * as S from "@effect-ts/core/Classic/Set"
import * as T from "@effect-ts/core/Classic/Sync"
import { pipe } from "@effect-ts/core/Function"

import type { AnyEnv } from "../../Algebra/config"
import type { AlgebraSet2 } from "../../Algebra/set"
import { memo } from "../../Internal/Utils"
import { encoderApplyConfig } from "../config"
import { EncoderType, EncoderURI } from "../hkt"

export const encoderSetInterpreter = memo(
  <Env extends AnyEnv>(): AlgebraSet2<EncoderURI, Env> => ({
    _F: EncoderURI,
    set: (a, _, config) => (env) =>
      pipe(
        a(env).encoder,
        (encoder) =>
          new EncoderType(
            encoderApplyConfig(config?.conf)(
              {
                encode: (u) =>
                  Array.isArray(u)
                    ? pipe(u, S.toArray(_), A.foreachF(T.Applicative)(encoder.encode))
                    : fail([
                        {
                          actual: u,
                          message: `${typeof u} is not a Set`
                        }
                      ])
              },
              env,
              { encoder }
            )
          )
      )
  })
)
