import { flow, pipe } from "@effect-ts/core/Function"

import type { AnyEnv } from "../../Algebra/config"
import type { AlgebraNewtype2 } from "../../Algebra/newtype"
import { memo } from "../../Internal/Utils"
import { encoderApplyConfig } from "../config"
import { EncoderType, EncoderURI } from "../hkt"

export const encoderNewtypeInterpreter = memo(
  <Env extends AnyEnv>(): AlgebraNewtype2<EncoderURI, Env> => ({
    _F: EncoderURI,
    newtypeIso: (iso, getEncoder, config) => (env) =>
      pipe(
        getEncoder(env).encoder,
        (encoder) =>
          new EncoderType(
            encoderApplyConfig(config?.conf)(
              {
                encode: flow(iso.reverseGet, encoder.encode)
              },
              env,
              { encoder }
            )
          )
      ),
    newtypePrism: (prism, getEncoder, config) => (env) =>
      pipe(
        getEncoder(env).encoder,
        (encoder) =>
          new EncoderType(
            encoderApplyConfig(config?.conf)(
              {
                encode: flow(prism.reverseGet, encoder.encode)
              },
              env,
              { encoder }
            )
          )
      )
  })
)
