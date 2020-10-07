import * as A from "@effect-ts/core/Classic/Array"
import * as E from "@effect-ts/core/Classic/Either"
import * as NA from "@effect-ts/core/Classic/NonEmptyArray"
import * as O from "@effect-ts/core/Classic/Option"
import { none, some } from "@effect-ts/core/Classic/Option"
import * as T from "@effect-ts/core/Classic/Sync"
import { pipe } from "@effect-ts/core/Function"

import type { AnyEnv } from "../../Algebra/config"
import type { AlgebraPrimitive1, UUID } from "../../Algebra/primitives"
import { isUnknownRecord } from "../../Guard/interpreter/common"
import { memo } from "../../Internal/Utils"
import { decoderApplyConfig } from "../config"
import { DecodeError, DecoderType, DecoderURI, fail } from "../hkt"
import { Validation } from "./common"

export const regexUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export const decoderPrimitiveInterpreter = memo(
  <Env extends AnyEnv>(): AlgebraPrimitive1<DecoderURI, Env> => ({
    _F: DecoderURI,
    function: (_, __, config) => (env) =>
      new DecoderType(
        decoderApplyConfig(config?.conf)(
          {
            decode: (u) =>
              fail([
                {
                  actual: u,
                  message: `functions are not supported`
                }
              ])
          },
          env,
          {}
        )
      ),
    unknownE: (k, config) => (env) =>
      new DecoderType(decoderApplyConfig(config?.conf)(k(env).decoder, env, {})),
    date: (config) => (env) =>
      new DecoderType(
        decoderApplyConfig(config?.conf)(
          {
            decode: (u) => {
              if (typeof u !== "string") {
                return fail([
                  {
                    actual: u,
                    message: `${typeof u} is not a string`
                  }
                ])
              }
              const d = new Date(u)
              return isNaN(d.getTime())
                ? fail([
                    {
                      actual: u,
                      message: `${u} is not a valid ISO string`
                    }
                  ])
                : T.succeed(d)
            }
          },
          env,
          {}
        )
      ),
    boolean: (config) => (env) =>
      new DecoderType(
        decoderApplyConfig(config?.conf)(
          {
            decode: (u) =>
              typeof u !== "boolean"
                ? fail([
                    {
                      actual: u,
                      message: `${typeof u} is not a boolean`
                    }
                  ])
                : T.succeed(u)
          },
          env,
          {}
        )
      ),
    string: (config) => (env) =>
      new DecoderType(
        decoderApplyConfig(config?.conf)(
          {
            decode: (u) =>
              typeof u !== "string"
                ? fail([
                    {
                      actual: u,
                      message: `${typeof u} is not a string`
                    }
                  ])
                : T.succeed(u)
          },
          env,
          {}
        )
      ),
    number: (config) => (env) =>
      new DecoderType(
        decoderApplyConfig(config?.conf)(
          {
            decode: (u) =>
              typeof u !== "number"
                ? fail([
                    {
                      actual: u,
                      message: `${typeof u} is not a number`
                    }
                  ])
                : T.succeed(u)
          },
          env,
          {}
        )
      ),
    bigint: (config) => (env) =>
      new DecoderType<bigint>(
        decoderApplyConfig(config?.conf)(
          {
            decode: (u) =>
              typeof u !== "string"
                ? fail([
                    {
                      actual: u,
                      message: `${typeof u} is not an integer string`
                    }
                  ])
                : T.tryCatch(
                    () =>
                      new DecodeError([
                        {
                          actual: u,
                          message: `${typeof u} is not an integer string`
                        }
                      ])
                  )(() => BigInt(u))
          },
          env,
          {}
        )
      ),
    stringLiteral: (k, config) => (env) =>
      new DecoderType<typeof k>(
        decoderApplyConfig(config?.conf)(
          {
            decode: (u) =>
              typeof u === "string" && u === k
                ? T.succeed(<typeof k>u)
                : fail([
                    {
                      actual: u,
                      message: `${u} is not ${k}`
                    }
                  ])
          },
          env,
          {}
        )
      ),
    numberLiteral: (k, config) => (env) =>
      new DecoderType<typeof k>(
        decoderApplyConfig(config?.conf)(
          {
            decode: (u) =>
              typeof u === "number" && u === k
                ? T.succeed(<typeof k>u)
                : fail([
                    {
                      actual: u,
                      message: `${u} is not ${k}`
                    }
                  ])
          },
          env,
          {}
        )
      ),
    oneOfLiterals: (ls, config) => (env) =>
      new DecoderType(
        decoderApplyConfig(config?.conf)(
          {
            decode: (u: unknown) =>
              (typeof u === "string" || typeof u === "number") && ls.includes(u)
                ? T.succeed(u)
                : fail([
                    {
                      actual: u,
                      message: `${u} is not any of ${ls.join(",")}`
                    }
                  ])
          },
          env,
          {}
        )
      ),
    keysOf: (keys, config) => (env) =>
      new DecoderType<keyof typeof keys & string>(
        decoderApplyConfig(config?.conf)(
          {
            decode: (u: unknown) =>
              typeof u === "string" && Object.keys(keys).indexOf(u) !== -1
                ? T.succeed(u)
                : fail([
                    {
                      actual: u,
                      message: `${u} is not any of ${Object.keys(keys).join(",")}`
                    }
                  ])
          },
          env,
          {}
        )
      ),
    nullable: (getType, config) => (env) =>
      pipe(
        getType(env).decoder,
        (decoder) =>
          new DecoderType(
            decoderApplyConfig(config?.conf)(
              {
                decode: (u) =>
                  u == null ? T.succeed(none) : T.map_(decoder.decode(u), some)
              },
              env,
              { decoder }
            )
          )
      ),
    mutable: (getType, config) => (env) =>
      pipe(
        getType(env).decoder,
        (decoder) =>
          new DecoderType(decoderApplyConfig(config?.conf)(decoder, env, { decoder }))
      ),
    optional: (getType, config) => (env) =>
      pipe(
        getType(env).decoder,
        (decoder) =>
          new DecoderType(
            decoderApplyConfig(config?.conf)(
              {
                decode: (u) => (u == null ? T.succeed(undefined) : decoder.decode(u))
              },
              env,
              { decoder }
            )
          )
      ),
    array: (getType, config) => (env) =>
      pipe(
        getType(env).decoder,
        (decoder) =>
          new DecoderType(
            decoderApplyConfig(config?.conf)(
              {
                decode: (u) =>
                  Array.isArray(u)
                    ? A.foreachF(Validation)(decoder.decode)(u)
                    : fail([
                        {
                          actual: u,
                          message: `${typeof u} is not an array`
                        }
                      ])
              },
              env,
              { decoder }
            )
          )
      ),
    nonEmptyArray: (getType, config) => (env) =>
      pipe(
        getType(env).decoder,
        (decoder) =>
          new DecoderType(
            decoderApplyConfig(config?.conf)(
              {
                decode: (u) =>
                  Array.isArray(u)
                    ? A.isNonEmpty(u)
                      ? NA.foreachF(Validation)(decoder.decode)(u)
                      : fail([
                          {
                            actual: u,
                            message: `array is empty`
                          }
                        ])
                    : fail([
                        {
                          actual: u,
                          message: `${typeof u} is not an array`
                        }
                      ])
              },
              env,
              { decoder }
            )
          )
      ),
    uuid: (config) => (env) =>
      new DecoderType<UUID>(
        decoderApplyConfig(config?.conf)(
          {
            decode: (u) =>
              typeof u === "string" && regexUUID.test(u)
                ? T.succeed(<UUID>u)
                : fail([
                    {
                      actual: u,
                      message: `${typeof u === "string" ? u : typeof u} is not a uuid`
                    }
                  ])
          },
          env,
          {}
        )
      ),
    either: (e, a, config) => (env) =>
      pipe(e(env).decoder, (left) =>
        pipe(
          a(env).decoder,
          (right) =>
            new DecoderType(
              decoderApplyConfig(config?.conf)(
                {
                  decode: (u) => {
                    if (
                      isUnknownRecord(u) &&
                      "_tag" in u &&
                      ((u["_tag"] === "Left" && "left" in u) ||
                        (u["_tag"] === "Right" && "right" in u))
                    ) {
                      if (u["_tag"] === "Left") {
                        return T.map_(left.decode(u["left"]), E.left) as any
                      } else {
                        return T.map_(left.decode(u["right"]), E.right)
                      }
                    }

                    return fail([
                      {
                        actual: u,
                        message: `${typeof u} is not an either`
                      }
                    ])
                  }
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
        a(env).decoder,
        (decoder) =>
          new DecoderType(
            decoderApplyConfig(config?.conf)(
              {
                decode: (u) => {
                  if (
                    isUnknownRecord(u) &&
                    "_tag" in u &&
                    ((u["_tag"] === "Some" && "value" in u) || u["_tag"] === "None")
                  ) {
                    if (u["_tag"] === "Some") {
                      return T.map_(decoder.decode(u["value"]), O.some)
                    } else {
                      return T.succeed(O.none)
                    }
                  }

                  return fail([
                    {
                      actual: u,
                      message: `${typeof u} is not an option`
                    }
                  ])
                }
              },
              env,
              {
                decoder
              }
            )
          )
      )
  })
)
