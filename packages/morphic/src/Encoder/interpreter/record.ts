import { pipe } from "@effect-ts/core/Function"
import * as R from "@effect-ts/core/Record"
import * as T from "@effect-ts/core/Sync"

import type { RecordURI } from "../../Algebra/Record"
import { interpreter } from "../../HKT"
import { encoderApplyConfig, EncoderType, EncoderURI } from "../base"

export const encoderRecordInterpreter = interpreter<EncoderURI, RecordURI>()(() => ({
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
}))
