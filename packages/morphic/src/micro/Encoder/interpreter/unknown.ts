import * as T from "@effect-ts/core/Sync"
import { EncoderURI } from "packages/morphic/src/Encoder/hkt"

import type { UnknownURI } from "../../Algebra/Unknown"
import { interpreter } from "../../HKT"
import { encoderApplyConfig, EncoderType } from "../base"

export const encoderUnknownInterpreter = interpreter<EncoderURI, UnknownURI>()(() => ({
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
}))
