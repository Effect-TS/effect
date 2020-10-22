import * as A from "@effect-ts/core/Classic/Array"
import * as E from "@effect-ts/core/Classic/Either"
import * as O from "@effect-ts/core/Classic/Option"
import { none, some } from "@effect-ts/core/Classic/Option"
import { pipe } from "@effect-ts/core/Function"
import * as T from "@effect-ts/core/Sync"

import type { AnyEnv } from "../../Algebra/config"
import type { AlgebraPrimitive1, UUID } from "../../Algebra/primitives"
import { isUnknownRecord } from "../../Guard/interpreter/common"
import { memo } from "../../Internal/Utils"
import { DecodeError, fail } from "../common"
import { decoderApplyConfig } from "../config"
import { DecoderType, DecoderURI } from "../hkt"
import { foreachArray, foreachNonEmptyArray } from "./common"

export const regexUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export const decoderPrimitiveInterpreter = memo(
  <Env extends AnyEnv>(): AlgebraPrimitive1<DecoderURI, Env> => ({
    _F: DecoderURI,
    function: (_, __, cfg) => (env) =>
      new DecoderType(
        decoderApplyConfig(cfg?.conf)(
          {
            decode: (u) =>
              fail([
                {
                  id: cfg?.id,
                  name: cfg?.name,
                  actual: u,
                  message: `functions are not supported`
                }
              ])
          },
          env,
          {}
        )
      ),
    unknownE: (k, cfg) => (env) =>
      new DecoderType(decoderApplyConfig(cfg?.conf)(k(env).decoder, env, {})),
    date: (cfg) => (env) =>
      new DecoderType(
        decoderApplyConfig(cfg?.conf)(
          {
            decode: (u) => {
              if (typeof u !== "string") {
                return fail([
                  {
                    id: cfg?.id,
                    name: cfg?.name,
                    actual: u,
                    message: `${typeof u} is not a string`
                  }
                ])
              }
              const d = new Date(u)
              return isNaN(d.getTime())
                ? fail([
                    {
                      id: cfg?.id,
                      name: cfg?.name,
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
    boolean: (cfg) => (env) =>
      new DecoderType(
        decoderApplyConfig(cfg?.conf)(
          {
            decode: (u) =>
              typeof u !== "boolean"
                ? fail([
                    {
                      id: cfg?.id,
                      name: cfg?.name,
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
    string: (cfg) => (env) =>
      new DecoderType(
        decoderApplyConfig(cfg?.conf)(
          {
            decode: (u) =>
              typeof u !== "string"
                ? fail([
                    {
                      id: cfg?.id,
                      name: cfg?.name,
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
    number: (cfg) => (env) =>
      new DecoderType(
        decoderApplyConfig(cfg?.conf)(
          {
            decode: (u) =>
              typeof u !== "number"
                ? fail([
                    {
                      id: cfg?.id,
                      name: cfg?.name,
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
    bigint: (cfg) => (env) =>
      new DecoderType<bigint>(
        decoderApplyConfig(cfg?.conf)(
          {
            decode: (u) =>
              typeof u !== "string"
                ? fail([
                    {
                      id: cfg?.id,
                      name: cfg?.name,
                      actual: u,
                      message: `${typeof u} is not an integer string`
                    }
                  ])
                : T.tryCatch(
                    () =>
                      new DecodeError([
                        {
                          id: cfg?.id,
                          name: cfg?.name,
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
    stringLiteral: (k, cfg) => (env) =>
      new DecoderType<typeof k>(
        decoderApplyConfig(cfg?.conf)(
          {
            decode: (u) =>
              typeof u === "string" && u === k
                ? T.succeed(<typeof k>u)
                : fail([
                    {
                      id: cfg?.id,
                      name: cfg?.name,
                      actual: u,
                      message: `${u} is not ${k}`
                    }
                  ])
          },
          env,
          {}
        )
      ),
    numberLiteral: (k, cfg) => (env) =>
      new DecoderType<typeof k>(
        decoderApplyConfig(cfg?.conf)(
          {
            decode: (u) =>
              typeof u === "number" && u === k
                ? T.succeed(<typeof k>u)
                : fail([
                    {
                      id: cfg?.id,
                      name: cfg?.name,
                      actual: u,
                      message: `${u} is not ${k}`
                    }
                  ])
          },
          env,
          {}
        )
      ),
    oneOfLiterals: (ls, cfg) => (env) =>
      new DecoderType(
        decoderApplyConfig(cfg?.conf)(
          {
            decode: (u: unknown) =>
              (typeof u === "string" || typeof u === "number") && ls.includes(u)
                ? T.succeed(u)
                : fail([
                    {
                      id: cfg?.id,
                      name: cfg?.name,
                      actual: u,
                      message: `${u} is not any of ${ls.join(",")}`
                    }
                  ])
          },
          env,
          {}
        )
      ),
    keysOf: (keys, cfg) => (env) =>
      new DecoderType<keyof typeof keys & string>(
        decoderApplyConfig(cfg?.conf)(
          {
            decode: (u: unknown) =>
              typeof u === "string" && Object.keys(keys).indexOf(u) !== -1
                ? T.succeed(u)
                : fail([
                    {
                      id: cfg?.id,
                      name: cfg?.name,
                      actual: u,
                      message: `${u} is not any of ${Object.keys(keys).join(",")}`
                    }
                  ])
          },
          env,
          {}
        )
      ),
    nullable: (getType, cfg) => (env) =>
      pipe(
        getType(env).decoder,
        (decoder) =>
          new DecoderType(
            decoderApplyConfig(cfg?.conf)(
              {
                decode: (u) =>
                  u == null ? T.succeed(none) : T.map_(decoder.decode(u), some)
              },
              env,
              { decoder }
            )
          )
      ),
    mutable: (getType, cfg) => (env) =>
      pipe(
        getType(env).decoder,
        (decoder) =>
          new DecoderType(decoderApplyConfig(cfg?.conf)(decoder, env, { decoder }))
      ),
    optional: (getType, cfg) => (env) =>
      pipe(
        getType(env).decoder,
        (decoder) =>
          new DecoderType(
            decoderApplyConfig(cfg?.conf)(
              {
                decode: (u) => (u == null ? T.succeed(undefined) : decoder.decode(u))
              },
              env,
              { decoder }
            )
          )
      ),
    array: (getType, cfg) => (env) =>
      pipe(
        getType(env).decoder,
        (decoder) =>
          new DecoderType(
            decoderApplyConfig(cfg?.conf)(
              {
                decode: (u) =>
                  Array.isArray(u)
                    ? foreachArray(decoder.decode)(u)
                    : fail([
                        {
                          id: cfg?.id,
                          name: cfg?.name,
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
    nonEmptyArray: (getType, cfg) => (env) =>
      pipe(
        getType(env).decoder,
        (decoder) =>
          new DecoderType(
            decoderApplyConfig(cfg?.conf)(
              {
                decode: (u) =>
                  Array.isArray(u)
                    ? A.isNonEmpty(u)
                      ? foreachNonEmptyArray(decoder.decode)(u)
                      : fail([
                          {
                            id: cfg?.id,
                            name: cfg?.name,
                            actual: u,
                            message: `array is empty`
                          }
                        ])
                    : fail([
                        {
                          id: cfg?.id,
                          name: cfg?.name,
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
    uuid: (cfg) => (env) =>
      new DecoderType<UUID>(
        decoderApplyConfig(cfg?.conf)(
          {
            decode: (u) =>
              typeof u === "string" && regexUUID.test(u)
                ? T.succeed(<UUID>u)
                : fail([
                    {
                      id: cfg?.id,
                      name: cfg?.name,
                      actual: u,
                      message: `${typeof u === "string" ? u : typeof u} is not a uuid`
                    }
                  ])
          },
          env,
          {}
        )
      ),
    either: (e, a, cfg) => (env) =>
      pipe(e(env).decoder, (left) =>
        pipe(
          a(env).decoder,
          (right) =>
            new DecoderType(
              decoderApplyConfig(cfg?.conf)(
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
                        id: cfg?.id,
                        name: cfg?.name,
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
    option: (a, cfg) => (env) =>
      pipe(
        a(env).decoder,
        (decoder) =>
          new DecoderType(
            decoderApplyConfig(cfg?.conf)(
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
                      id: cfg?.id,
                      name: cfg?.name,
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
