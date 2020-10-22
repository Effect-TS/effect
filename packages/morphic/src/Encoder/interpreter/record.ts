import * as R from "@effect-ts/core/Classic/Record"
import { pipe } from "@effect-ts/core/Function"
import * as T from "@effect-ts/core/Sync"

import type { AnyEnv } from "../../Algebra/config"
import type { AlgebraRecord2 } from "../../Algebra/record"
import { memo } from "../../Internal/Utils"
import { encoderApplyConfig } from "../config"
import { EncoderType, EncoderURI } from "../hkt"

export const encoderRecordInterpreter = memo(
  <Env extends AnyEnv>(): AlgebraRecord2<EncoderURI, Env> => ({
    _F: EncoderURI,
    record: (getCodomain, config) => (env) =>
      pipe(
        getCodomain(env).encoder,
        (encoder) =>
          new EncoderType(
            encoderApplyConfig(config?.conf)(
              {
                encode: R.foreachF(T.Applicative)(encoder.encode)
              },
              env,
              { encoder }
            )
          )
      )
  })
)
