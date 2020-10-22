import * as A from "@effect-ts/core/Classic/Array"
import * as E from "@effect-ts/core/Classic/Either"
import * as NA from "@effect-ts/core/Classic/NonEmptyArray"
import * as O from "@effect-ts/core/Classic/Option"
import { flow, pipe } from "@effect-ts/core/Function"
import * as T from "@effect-ts/core/Sync"

import type { AnyEnv } from "../../Algebra/config"
import type { AlgebraPrimitive2 } from "../../Algebra/primitives"
import { memo } from "../../Internal/Utils"
import { encoderApplyConfig } from "../config"
import { EncoderType, EncoderURI } from "../hkt"

export const regexUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export const encoderPrimitiveInterpreter = memo(
  <Env extends AnyEnv>(): AlgebraPrimitive2<EncoderURI, Env> => ({
    _F: EncoderURI,
    function: (_, __, config) => (env) =>
      new EncoderType(
        encoderApplyConfig(config?.conf)(
          {
            encode: () => {
              throw new Error("cannot encode functions")
            }
          },
          env,
          {}
        )
      ),
    unknownE: (k, config) => (env) =>
      new EncoderType(
        encoderApplyConfig(config?.conf)(k(env).encoder, env, {
          encoder: k(env).encoder
        })
      ),
    date: (config) => (env) =>
      new EncoderType(
        encoderApplyConfig(config?.conf)(
          {
            encode: (u) => T.sync(() => u.toString())
          },
          env,
          {}
        )
      ),
    boolean: (config) => (env) =>
      new EncoderType(
        encoderApplyConfig(config?.conf)(
          {
            encode: T.succeed
          },
          env,
          {}
        )
      ),
    string: (config) => (env) =>
      new EncoderType(
        encoderApplyConfig(config?.conf)(
          {
            encode: T.succeed
          },
          env,
          {}
        )
      ),
    number: (config) => (env) =>
      new EncoderType(
        encoderApplyConfig(config?.conf)(
          {
            encode: T.succeed
          },
          env,
          {}
        )
      ),
    bigint: (config) => (env) =>
      new EncoderType(
        encoderApplyConfig(config?.conf)(
          {
            encode: (u) => T.succeed(u.toString(10))
          },
          env,
          {}
        )
      ),
    stringLiteral: (k, config) => (env) =>
      new EncoderType(
        encoderApplyConfig(config?.conf)(
          {
            encode: T.succeed
          },
          env,
          {}
        )
      ),
    numberLiteral: (k, config) => (env) =>
      new EncoderType(
        encoderApplyConfig(config?.conf)(
          {
            encode: T.succeed
          },
          env,
          {}
        )
      ),
    oneOfLiterals: (ls, config) => (env) =>
      new EncoderType(
        encoderApplyConfig(config?.conf)(
          {
            encode: T.succeed
          },
          env,
          {}
        )
      ),
    keysOf: (keys, config) => (env) =>
      new EncoderType(
        encoderApplyConfig(config?.conf)(
          {
            encode: T.succeed
          },
          env,
          {}
        )
      ),
    nullable: (getType, config) => (env) =>
      pipe(
        getType(env).encoder,
        (encoder) =>
          new EncoderType(
            encoderApplyConfig(config?.conf)(
              {
                encode: O.fold(() => T.succeed(null), encoder.encode)
              },
              env,
              { encoder }
            )
          )
      ),
    mutable: (getType, config) => (env) =>
      pipe(
        getType(env).encoder,
        (encoder) =>
          new EncoderType(encoderApplyConfig(config?.conf)(encoder, env, { encoder }))
      ),
    optional: (getType, config) => (env) =>
      pipe(
        getType(env).encoder,
        (encoder) =>
          new EncoderType(
            encoderApplyConfig(config?.conf)(
              {
                encode: (u) => (u == null ? T.succeed(undefined) : encoder.encode(u))
              },
              env,
              { encoder }
            )
          )
      ),
    array: (getType, config) => (env) =>
      pipe(
        getType(env).encoder,
        (encoder) =>
          new EncoderType(
            encoderApplyConfig(config?.conf)(
              {
                encode: A.foreachF(T.Applicative)(encoder.encode)
              },
              env,
              { encoder }
            )
          )
      ),
    nonEmptyArray: (getType, config) => (env) =>
      pipe(
        getType(env).encoder,
        (encoder) =>
          new EncoderType(
            encoderApplyConfig(config?.conf)(
              {
                encode: NA.foreachF(T.Applicative)(encoder.encode)
              },
              env,
              { encoder }
            )
          )
      ),
    uuid: (config) => (env) =>
      new EncoderType(
        encoderApplyConfig(config?.conf)(
          {
            encode: T.succeed
          },
          env,
          {}
        )
      ),
    either: (e, a, config) => (env) =>
      pipe(e(env).encoder, (left) =>
        pipe(
          a(env).encoder,
          (right) =>
            new EncoderType(
              encoderApplyConfig(config?.conf)(
                {
                  encode: E.fold(
                    flow(left.encode, T.map(E.left)),
                    flow(right.encode, T.map(E.right))
                  )
                },
                env,
                {
                  left,
                  right
                }
              )
            )
        )
      ),
    option: (a, config) => (env) =>
      pipe(
        a(env).encoder,
        (encoder) =>
          new EncoderType(
            encoderApplyConfig(config?.conf)(
              {
                encode: O.fold(
                  () => T.succeed(O.none),
                  flow(encoder.encode, T.map(O.some))
                )
              },
              env,
              {
                encoder
              }
            )
          )
      )
  })
)
