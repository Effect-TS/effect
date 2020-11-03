import { pipe } from "@effect-ts/core/Function"

import type { RefinedURI } from "../../Algebra/Refined"
import { interpreter } from "../../HKT"
import { encoderApplyConfig, EncoderType, EncoderURI } from "../base"

export const encoderRefinedInterpreter = interpreter<EncoderURI, RefinedURI>()(() => ({
  _F: EncoderURI,
  refined: (getEncoder, ref, config) => (env) =>
    pipe(
      getEncoder(env).encoder,
      (encoder) =>
        new EncoderType(
          encoderApplyConfig(config?.conf)(
            {
              encode: encoder.encode
            },
            env,
            { encoder }
          )
        )
    ),
  constrained: (getEncoder, ref, config) => (env) =>
    pipe(
      getEncoder(env).encoder,
      (encoder) =>
        new EncoderType(
          encoderApplyConfig(config?.conf)(
            {
              encode: encoder.encode
            },
            env,
            { encoder }
          )
        )
    )
}))
