import * as A from "@effect-ts/core/Classic/Array"
import * as S from "@effect-ts/core/Classic/Set"
import { pipe } from "@effect-ts/core/Function"
import * as T from "@effect-ts/core/Sync"

import type { SetURI } from "../../Algebra/Set"
import { interpreter } from "../../HKT"
import { encoderApplyConfig, EncoderType, EncoderURI } from "../base"

export const encoderSetInterpreter = interpreter<EncoderURI, SetURI>()(() => ({
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
}))
