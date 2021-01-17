import { pipe } from "@effect-ts/core/Function"
import * as R from "@effect-ts/core/Record"
import * as T from "@effect-ts/core/Sync"

import type { ObjectURI } from "../../Algebra/Object"
import { interpreter } from "../../HKT"
import { projectFieldWithEnv2 } from "../../Utils"
import { encoderApplyConfig, EncoderType, EncoderURI } from "../base"

export const encoderObjectInterpreter = interpreter<EncoderURI, ObjectURI>()(() => ({
  _F: EncoderURI,
  interface: (props, config) => (env) =>
    pipe(projectFieldWithEnv2(props, env), (encoder) => {
      return new EncoderType(
        encoderApplyConfig(config?.conf)(
          {
            encode: R.foreachWithIndexF(T.Applicative)((k, a) =>
              encoder[k] != null ? encoder[k].encoder.encode(a) : T.succeed(a)
            ) as any
          },
          env,
          {
            encoder: R.map_(encoder, (d) => d.encoder) as any
          }
        )
      ).setChilds(encoder)
    }),
  partial: (props, config) => (env) =>
    pipe(projectFieldWithEnv2(props, env), (encoder) => {
      return new EncoderType(
        encoderApplyConfig(config?.conf)(
          {
            encode: R.foreachWithIndexF(T.Applicative)((k, a) =>
              typeof a !== "undefined" && encoder[k] != null
                ? encoder[k].encoder.encode(a)
                : T.succeed(a)
            ) as any
          },
          env,
          {
            encoder: R.map_(encoder, (d) => d.encoder) as any
          }
        )
      ).setChilds(encoder)
    }),
  both: (props, partial, config) => (env) =>
    pipe(projectFieldWithEnv2(props, env), (encoder) =>
      pipe(projectFieldWithEnv2(partial, env), (encoderPartial) => {
        return new EncoderType(
          encoderApplyConfig(config?.conf)(
            {
              encode: R.foreachWithIndexF(T.Applicative)((k, a) =>
                encoder[k] != null
                  ? encoder[k].encoder.encode(a)
                  : typeof a !== "undefined" && encoderPartial[k] != null
                  ? encoderPartial[k].encoder.encode(a)
                  : T.succeed(a)
              ) as any
            },
            env,
            {
              encoder: R.map_(encoder, (d) => d.encoder) as any,
              encoderPartial: R.map_(encoderPartial, (d) => d.encoder) as any
            }
          )
        ).setChilds(encoder)
      })
    )
}))
