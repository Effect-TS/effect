import * as A from "@effect-ts/core/Classic/Array"
import * as E from "@effect-ts/core/Classic/Either"
import * as O from "@effect-ts/core/Classic/Option"
import { none, some } from "@effect-ts/core/Classic/Option"
import { pipe } from "@effect-ts/core/Function"
import * as List from "@effect-ts/core/Persistent/List"
import * as T from "@effect-ts/core/Sync"

import type { PrimitivesURI, UUID } from "../../Algebra/Primitives"
import { isUnknownRecord } from "../../Guard/interpreter/common"
import { interpreter } from "../../HKT"
import { decoderApplyConfig, DecoderType, DecoderURI } from "../base"
import { appendContext, fail, makeDecoder } from "../common"
import { foreachArray, foreachNonEmptyArray } from "./common"

export const regexUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export const decoderPrimitiveInterpreter = interpreter<DecoderURI, PrimitivesURI>()(
  () => ({
    _F: DecoderURI,
    function: (_, __, cfg) => (env) =>
      new DecoderType(
        decoderApplyConfig(cfg?.conf)(
          makeDecoder(
            (u, c) => fail(u, c, `functions are not supported`),
            "function",
            cfg?.name || "function"
          ) as any,
          env,
          {}
        )
      ),
    unknownE: (k, cfg) => (env) =>
      new DecoderType(decoderApplyConfig(cfg?.conf)(k(env).decoder, env, {})),
    date: (cfg) => (env) =>
      new DecoderType(
        decoderApplyConfig(cfg?.conf)(
          makeDecoder(
            (u, c) => {
              if (typeof u !== "string") {
                return fail(u, c, `${typeof u} is not a string`)
              }
              const d = new Date(u)
              return isNaN(d.getTime())
                ? fail(u, c, `${u} is not a valid ISO string`)
                : T.succeed(d)
            },
            "date",
            cfg?.name
          ),
          env,
          {}
        )
      ),
    boolean: (cfg) => (env) =>
      new DecoderType(
        decoderApplyConfig(cfg?.conf)(
          makeDecoder(
            (u, c) =>
              typeof u !== "boolean"
                ? fail(u, c, `${typeof u} is not a boolean`)
                : T.succeed(u),
            "boolean",
            cfg?.name || "Boolean"
          ),
          env,
          {}
        )
      ),
    string: (cfg) => (env) =>
      new DecoderType(
        decoderApplyConfig(cfg?.conf)(
          makeDecoder(
            (u, c) =>
              typeof u !== "string"
                ? fail(u, c, `${typeof u} is not a string`)
                : T.succeed(u),
            "string",
            cfg?.name || "String"
          ),
          env,
          {}
        )
      ),
    number: (cfg) => (env) =>
      new DecoderType(
        decoderApplyConfig(cfg?.conf)(
          makeDecoder(
            (u, c) =>
              typeof u !== "number"
                ? fail(u, c, `${typeof u} is not a number`)
                : T.succeed(u),
            "number",
            cfg?.name || "Number"
          ),
          env,
          {}
        )
      ),
    bigint: (cfg) => (env) =>
      new DecoderType<bigint>(
        decoderApplyConfig(cfg?.conf)(
          makeDecoder(
            (u, c) =>
              typeof u !== "string"
                ? fail(u, c, `${typeof u} is not an integer string`)
                : T.suspend(() => {
                    try {
                      const x = BigInt(u)
                      return T.succeed(x)
                    } catch {
                      return fail(u, c, `${typeof u} is not an integer string`)
                    }
                  }),
            "bigint",
            cfg?.name || "BigInt"
          ),
          env,
          {}
        )
      ),
    stringLiteral: (k, cfg) => (env) =>
      new DecoderType<typeof k>(
        decoderApplyConfig(cfg?.conf)(
          makeDecoder(
            (u, c) =>
              typeof u === "string" && u === k
                ? T.succeed(<typeof k>u)
                : fail(u, c, `${u} is not ${k}`),
            "stringLiteral",
            cfg?.name || "StringLiteral"
          ),
          env,
          {}
        )
      ),
    numberLiteral: (k, cfg) => (env) =>
      new DecoderType<typeof k>(
        decoderApplyConfig(cfg?.conf)(
          makeDecoder(
            (u, c) =>
              typeof u === "number" && u === k
                ? T.succeed(<typeof k>u)
                : fail(u, c, `${u} is not ${k}`),
            "numberLiteral",
            cfg?.name || "NumberLiteral"
          ),
          env,
          {}
        )
      ),
    oneOfLiterals: (ls, cfg) => (env) =>
      new DecoderType(
        decoderApplyConfig(cfg?.conf)(
          makeDecoder(
            (u, c) =>
              (typeof u === "string" || typeof u === "number") && ls.includes(u)
                ? T.succeed(u)
                : fail(u, c, `${u} is not any of ${ls.join(",")}`),
            "oneOfLiterals",
            cfg?.name || "OneOfLiterals"
          ),
          env,
          {}
        )
      ),
    keysOf: (keys, cfg) => (env) =>
      new DecoderType<keyof typeof keys & string>(
        decoderApplyConfig(cfg?.conf)(
          makeDecoder(
            (u, c) =>
              typeof u === "string" && Object.keys(keys).indexOf(u) !== -1
                ? T.succeed(u)
                : fail(u, c, `${u} is not any of ${Object.keys(keys).join(",")}`),
            "keysOf",
            cfg?.name || "KeysOf"
          ),
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
              makeDecoder(
                (u, c) =>
                  u == null ? T.succeed(none) : T.map_(decoder.validate(u, c), some),
                "nullable",
                cfg?.name || "Nullable"
              ),
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
              makeDecoder(
                (u, c) => decoder.validate(u, c),
                "mutable",
                cfg?.name || "Mutable"
              ),
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
              makeDecoder(
                (u, c) => (u == null ? T.succeed(undefined) : decoder.validate(u, c)),
                "optional",
                cfg?.name || "Optional"
              ),
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
              makeDecoder(
                (u, c) =>
                  Array.isArray(u)
                    ? foreachArray((k, a) =>
                        decoder.validate(a, appendContext(c, String(k), decoder, a))
                      )(u)
                    : fail(u, c, `${typeof u} is not an array`),
                "array",
                cfg?.name || "Array"
              ),
              env,
              { decoder }
            )
          )
      ),
    list: (getType, cfg) => (env) =>
      pipe(
        getType(env).decoder,
        (decoder) =>
          new DecoderType(
            decoderApplyConfig(cfg?.conf)(
              makeDecoder(
                (u, c) =>
                  Array.isArray(u)
                    ? T.map_(
                        foreachArray((k, a) =>
                          decoder.validate(a, appendContext(c, String(k), decoder, a))
                        )(u),
                        List.from
                      )
                    : fail(u, c, `${typeof u} is not an array`),
                "array",
                cfg?.name || "Array"
              ),
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
              makeDecoder(
                (u, c) =>
                  Array.isArray(u)
                    ? A.isNonEmpty(u)
                      ? foreachNonEmptyArray((k, a) =>
                          decoder.validate(a, appendContext(c, String(k), decoder, a))
                        )(u)
                      : fail(u, c, `array is empty`)
                    : fail(u, c, `${typeof u} is not an array`),
                "nonEmptyArray",
                cfg?.name || "NonEmptyArray"
              ),
              env,
              { decoder }
            )
          )
      ),
    uuid: (cfg) => (env) =>
      new DecoderType<UUID>(
        decoderApplyConfig(cfg?.conf)(
          makeDecoder(
            (u, c) =>
              typeof u === "string" && regexUUID.test(u)
                ? T.succeed(<UUID>u)
                : fail(u, c, `${typeof u === "string" ? u : typeof u} is not a uuid`),
            "uuid",
            cfg?.name || "UUID"
          ),
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
                makeDecoder(
                  (u, c) => {
                    if (
                      isUnknownRecord(u) &&
                      "_tag" in u &&
                      ((u["_tag"] === "Left" && "left" in u) ||
                        (u["_tag"] === "Right" && "right" in u))
                    ) {
                      if (u["_tag"] === "Left") {
                        return T.map_(
                          left.validate(
                            u["left"],
                            appendContext(c, "left", left, u["left"])
                          ),
                          E.left
                        ) as any
                      } else {
                        return T.map_(
                          right.validate(
                            u["right"],
                            appendContext(c, "right", right, u["right"])
                          ),
                          E.right
                        )
                      }
                    }

                    return fail(u, c, `${typeof u} is not an either`)
                  },
                  "either",
                  cfg?.name || "Either"
                ),
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
              makeDecoder(
                (u, c) => {
                  if (
                    isUnknownRecord(u) &&
                    "_tag" in u &&
                    ((u["_tag"] === "Some" && "value" in u) || u["_tag"] === "None")
                  ) {
                    if (u["_tag"] === "Some") {
                      return T.map_(
                        decoder.validate(
                          u["value"],
                          appendContext(c, "value", decoder, u["value"])
                        ),
                        O.some
                      )
                    } else {
                      return T.succeed(O.none)
                    }
                  }

                  return fail(u, c, `${typeof u} is not an option`)
                },
                "option",
                cfg?.name || "Option"
              ),
              env,
              {
                decoder
              }
            )
          )
      )
  })
)
