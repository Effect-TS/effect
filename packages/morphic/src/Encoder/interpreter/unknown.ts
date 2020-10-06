import * as T from "@effect-ts/core/Classic/Sync"

import type { AnyEnv } from "../../Algebra/config"
import type { AlgebraUnknown2 } from "../../Algebra/unknown"
import { memo } from "../../Internal/Utils"
import { encoderApplyConfig } from "../config"
import { EncoderType, EncoderURI } from "../hkt"

export const encoderUnknownInterpreter = memo(
  <Env extends AnyEnv>(): AlgebraUnknown2<EncoderURI, Env> => ({
    _F: EncoderURI,
    unknown: (cfg) => (env) =>
      new EncoderType(
        encoderApplyConfig(cfg?.conf)(
          {
            encode: T.succeed
          },
          env,
          {}
        )
      )
  })
)
