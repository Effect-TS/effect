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
import { fixKey, foreachArray, foreachNonEmptyArray } from "./common"

export const regexUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export const decoderPrimitiveInterpreter = memo(
  <Env extends AnyEnv>(): AlgebraPrimitive1<DecoderURI, Env> => ({
    _F: DecoderURI,
    function: (_, __, cfg) => (env) =>
      new DecoderType(
        decoderApplyConfig(cfg?.conf)(
          {
            validate: (u, c) =>
              fail([
                {
                  id: cfg?.id,
                  name: cfg?.name,
                  message: `functions are not supported`,
                  context: {
                    ...c,
                    actual: u,
                    types: cfg?.name ? [...c.types, cfg.name] : c.types
                  }
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
            validate: (u, c) => {
              if (typeof u !== "string") {
                return fail([
                  {
                    id: cfg?.id,
                    name: cfg?.name,
                    message: `${typeof u} is not a string`,
                    context: {
                      ...c,
                      actual: u,
                      types: cfg?.name ? [...c.types, cfg.name] : c.types
                    }
                  }
                ])
              }
              const d = new Date(u)
              return isNaN(d.getTime())
                ? fail([
                    {
                      id: cfg?.id,
                      name: cfg?.name,
                      message: `${u} is not a valid ISO string`,
                      context: {
                        ...c,
                        actual: u,
                        types: cfg?.name ? [...c.types, cfg.name] : c.types
                      }
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
            validate: (u, c) =>
              typeof u !== "boolean"
                ? fail([
                    {
                      id: cfg?.id,
                      name: cfg?.name,
                      message: `${typeof u} is not a boolean`,
                      context: {
                        ...c,
                        actual: u,
                        types: cfg?.name ? [...c.types, cfg.name] : c.types
                      }
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
            validate: (u, c) =>
              typeof u !== "string"
                ? fail([
                    {
                      id: cfg?.id,
                      name: cfg?.name,
                      message: `${typeof u} is not a string`,
                      context: {
                        ...c,
                        actual: u,
                        types: cfg?.name ? [...c.types, cfg.name] : c.types
                      }
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
            validate: (u, c) =>
              typeof u !== "number"
                ? fail([
                    {
                      id: cfg?.id,
                      name: cfg?.name,
                      message: `${typeof u} is not a number`,
                      context: {
                        ...c,
                        actual: u,
                        types: cfg?.name ? [...c.types, cfg.name] : c.types
                      }
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
            validate: (u, c) =>
              typeof u !== "string"
                ? fail([
                    {
                      id: cfg?.id,
                      name: cfg?.name,
                      message: `${typeof u} is not an integer string`,
                      context: {
                        ...c,
                        actual: u,
                        types: cfg?.name ? [...c.types, cfg.name] : c.types
                      }
                    }
                  ])
                : T.tryCatch(
                    () =>
                      new DecodeError([
                        {
                          id: cfg?.id,
                          name: cfg?.name,
                          message: `${typeof u} is not an integer string`,
                          context: {
                            ...c,
                            actual: u,
                            types: cfg?.name ? [...c.types, cfg.name] : c.types
                          }
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
            validate: (u, c) =>
              typeof u === "string" && u === k
                ? T.succeed(<typeof k>u)
                : fail([
                    {
                      id: cfg?.id,
                      name: cfg?.name,
                      message: `${u} is not ${k}`,
                      context: {
                        ...c,
                        actual: u,
                        types: cfg?.name ? [...c.types, cfg.name] : c.types
                      }
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
            validate: (u, c) =>
              typeof u === "number" && u === k
                ? T.succeed(<typeof k>u)
                : fail([
                    {
                      id: cfg?.id,
                      name: cfg?.name,
                      message: `${u} is not ${k}`,
                      context: {
                        ...c,
                        actual: u,
                        types: cfg?.name ? [...c.types, cfg.name] : c.types
                      }
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
            validate: (u, c) =>
              (typeof u === "string" || typeof u === "number") && ls.includes(u)
                ? T.succeed(u)
                : fail([
                    {
                      id: cfg?.id,
                      name: cfg?.name,
                      message: `${u} is not any of ${ls.join(",")}`,
                      context: {
                        ...c,
                        actual: u,
                        types: cfg?.name ? [...c.types, cfg.name] : c.types
                      }
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
            validate: (u, c) =>
              typeof u === "string" && Object.keys(keys).indexOf(u) !== -1
                ? T.succeed(u)
                : fail([
                    {
                      id: cfg?.id,
                      name: cfg?.name,
                      message: `${u} is not any of ${Object.keys(keys).join(",")}`,
                      context: {
                        ...c,
                        actual: u,
                        types: cfg?.name ? [...c.types, cfg.name] : c.types
                      }
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
                validate: (u, c) =>
                  u == null
                    ? T.succeed(none)
                    : T.map_(
                        decoder.validate(u, {
                          ...c,
                          actual: u,
                          types: cfg?.name ? [...c.types, cfg.name] : c.types
                        }),
                        some
                      )
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
          new DecoderType(
            decoderApplyConfig(cfg?.conf)(
              {
                validate: (u, c) =>
                  decoder.validate(u, {
                    ...c,
                    types: cfg?.name ? [...c.types, cfg.name] : c.types
                  })
              },
              env,
              { decoder }
            )
          )
      ),
    optional: (getType, cfg) => (env) =>
      pipe(
        getType(env).decoder,
        (decoder) =>
          new DecoderType(
            decoderApplyConfig(cfg?.conf)(
              {
                validate: (u, c) =>
                  u == null
                    ? T.succeed(undefined)
                    : decoder.validate(u, {
                        ...c,
                        actual: u,
                        types: cfg?.name ? [...c.types, cfg.name] : c.types
                      })
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
                validate: (u, c) =>
                  Array.isArray(u)
                    ? foreachArray(decoder.validate)(u)
                    : fail([
                        {
                          id: cfg?.id,
                          name: cfg?.name,
                          message: `${typeof u} is not an array`,
                          context: {
                            ...c,
                            actual: u,
                            types: cfg?.name ? [...c.types, cfg.name] : c.types
                          }
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
                validate: (u, c) =>
                  Array.isArray(u)
                    ? A.isNonEmpty(u)
                      ? foreachNonEmptyArray((k, a) =>
                          decoder.validate(a, {
                            key: `${c.key}[${k}]`,
                            actual: a,
                            types: cfg?.name ? [...c.types, cfg.name] : c.types
                          })
                        )(u)
                      : fail([
                          {
                            id: cfg?.id,
                            name: cfg?.name,
                            message: `array is empty`,
                            context: {
                              ...c,
                              actual: u,
                              types: cfg?.name ? [...c.types, cfg.name] : c.types
                            }
                          }
                        ])
                    : fail([
                        {
                          id: cfg?.id,
                          name: cfg?.name,
                          message: `${typeof u} is not an array`,
                          context: {
                            ...c,
                            actual: u,
                            types: cfg?.name ? [...c.types, cfg.name] : c.types
                          }
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
            validate: (u, c) =>
              typeof u === "string" && regexUUID.test(u)
                ? T.succeed(<UUID>u)
                : fail([
                    {
                      id: cfg?.id,
                      name: cfg?.name,
                      message: `${typeof u === "string" ? u : typeof u} is not a uuid`,
                      context: {
                        ...c,
                        actual: u,
                        types: cfg?.name ? [...c.types, cfg.name] : c.types
                      }
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
                  validate: (u, c) => {
                    if (
                      isUnknownRecord(u) &&
                      "_tag" in u &&
                      ((u["_tag"] === "Left" && "left" in u) ||
                        (u["_tag"] === "Right" && "right" in u))
                    ) {
                      if (u["_tag"] === "Left") {
                        return T.map_(
                          left.validate(u["left"], {
                            key: `${c.key}.left`,
                            actual: u,
                            types: cfg?.name ? [...c.types, cfg.name] : c.types
                          }),
                          E.left
                        ) as any
                      } else {
                        return T.map_(
                          left.validate(u["right"], {
                            key: `${c.key}.right`,
                            actual: u,
                            types: cfg?.name ? [...c.types, cfg.name] : c.types
                          }),
                          E.right
                        )
                      }
                    }

                    return fail([
                      {
                        id: cfg?.id,
                        name: cfg?.name,
                        message: `${typeof u} is not an either`,
                        context: {
                          ...c,
                          actual: u,
                          types: cfg?.name ? [...c.types, cfg.name] : c.types
                        }
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
                validate: (u, c) => {
                  if (
                    isUnknownRecord(u) &&
                    "_tag" in u &&
                    ((u["_tag"] === "Some" && "value" in u) || u["_tag"] === "None")
                  ) {
                    if (u["_tag"] === "Some") {
                      return T.map_(
                        decoder.validate(u["value"], {
                          key: fixKey(`${c.key}.value`),
                          actual: u,
                          types: cfg?.name ? [...c.types, cfg.name] : c.types
                        }),
                        O.some
                      )
                    } else {
                      return T.succeed(O.none)
                    }
                  }

                  return fail([
                    {
                      id: cfg?.id,
                      name: cfg?.name,
                      message: `${typeof u} is not an option`,
                      context: {
                        ...c,
                        actual: u,
                        types: cfg?.name ? [...c.types, cfg.name] : c.types
                      }
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
