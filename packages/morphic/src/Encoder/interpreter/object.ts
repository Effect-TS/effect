import * as R from "@effect-ts/core/Classic/Record"
import { pipe } from "@effect-ts/core/Function"
import * as T from "@effect-ts/core/Sync"

import type { AnyEnv } from "../../Algebra/config"
import type { AlgebraObject2 } from "../../Algebra/object"
import { memo, projectFieldWithEnv } from "../../Internal/Utils"
import { encoderApplyConfig } from "../config"
import type { Encoder } from "../hkt"
import { EncoderType, EncoderURI } from "../hkt"

export const encoderObjectInterpreter = memo(
  <Env extends AnyEnv>(): AlgebraObject2<EncoderURI, Env> => ({
    _F: EncoderURI,
    interface: (props, config) => (env) =>
      pipe(projectFieldWithEnv(props, env)("encoder"), (encoder) => {
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
      pipe(projectFieldWithEnv(props, env)("encoder"), (encoder) => {
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
  })
)
