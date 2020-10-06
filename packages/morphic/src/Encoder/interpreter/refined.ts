import { pipe } from "@effect-ts/core/Function"

import type { AnyEnv } from "../../Algebra/config"
import type { AlgebraRefined2 } from "../../Algebra/refined"
import { memo } from "../../Internal/Utils"
import { encoderApplyConfig } from "../config"
import { EncoderType, EncoderURI } from "../hkt"

export const encoderRefinedInterpreter = memo(
  <Env extends AnyEnv>(): AlgebraRefined2<EncoderURI, Env> => ({
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
  })
)
