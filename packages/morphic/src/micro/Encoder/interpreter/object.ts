import * as R from "@effect-ts/core/Classic/Record"
import { pipe } from "@effect-ts/core/Function"
import * as T from "@effect-ts/core/Sync"

import type { ObjectURI } from "../../Algebra/Object"
import { interpreter } from "../../HKT"
import { projectFieldWithEnv } from "../../Utils"
import type { Encoder } from "../base"
import { encoderApplyConfig, EncoderType, EncoderURI } from "../base"

export const encoderObjectInterpreter = interpreter<EncoderURI, ObjectURI>()(() => ({
  _F: EncoderURI,
  interface: (props, config) => (env) =>
    pipe(projectFieldWithEnv(props as any, env)("encoder"), (encoder) => {
      return new EncoderType(
        encoderApplyConfig(config?.conf)(
          {
            encode: R.foreachWithIndexF(T.Applicative)((k, a) =>
              encoder[k] != null
                ? (encoder[k] as Encoder<any, any>).encode(a)
                : T.succeed(a)
            ) as any
          },
          env,
          {
            encoder: encoder as any
          }
        )
      )
    }),
  partial: (props, config) => (env) =>
    pipe(projectFieldWithEnv(props as any, env)("encoder"), (encoder) => {
      return new EncoderType(
        encoderApplyConfig(config?.conf)(
          {
            encode: R.foreachWithIndexF(T.Applicative)((k, a) =>
              encoder[k] != null
                ? (encoder[k] as Encoder<any, any>).encode(a)
                : T.succeed(a)
            ) as any
          },
          env,
          {
            encoder: encoder as any
          }
        )
      )
    }),
  both: (props, partial, config) => (env) =>
    pipe(projectFieldWithEnv(props, env)("encoder"), (encoder) =>
      pipe(projectFieldWithEnv(partial, env)("encoder"), (encoderPartial) => {
        return new EncoderType(
          encoderApplyConfig(config?.conf)(
            {
              encode: R.foreachWithIndexF(T.Applicative)((k, a) =>
                encoder[k] != null
                  ? (encoder[k] as Encoder<any, any>).encode(a)
                  : encoderPartial[k] != null
                  ? (encoder[k] as Encoder<any, any>).encode(a)
                  : T.succeed(a)
              ) as any
            },
            env,
            {
              encoder: encoder as any,
              encoderPartial: encoderPartial as any
            }
          )
        )
      })
    )
}))
