import { pipe } from "@effect-ts/core/Function"
import * as T from "@effect-ts/core/Sync"

import type { ObjectURI } from "../../Algebra/Object"
import { isUnknownRecord } from "../../Guard/interpreter/common"
import type { Kind } from "../../HKT"
import { interpreter } from "../../HKT"
import { projectFieldWithEnv } from "../../Utils"
import { decoderApplyConfig, DecoderType, DecoderURI } from "../base"
import type { Decoder } from "../common"
import { appendContext, fail, makeDecoder } from "../common"
import { foreachRecordWithIndex, tuple } from "./common"

export const decoderObjectInterpreter = interpreter<DecoderURI, ObjectURI>()(() => ({
  _F: DecoderURI,
  interface: (props, cfg) => (env) =>
    pipe(projectFieldWithEnv(props, env)("decoder"), (decoder) => {
      const keys = Object.keys(decoder)
      return new DecoderType(
        decoderApplyConfig(cfg?.conf)(interfaceDecoder(keys, decoder, cfg?.name), env, {
          decoder: decoder as any
        })
      )
    }),
  partial: (props, cfg) => (env) =>
    pipe(projectFieldWithEnv(props, env)("decoder"), (decoder) => {
      return new DecoderType(
        decoderApplyConfig(cfg?.conf)(partialDecoder(decoder, cfg?.name), env, {
          decoder: decoder as any
        })
      )
    }),
  both: (props, partial, cfg) => (env) =>
    pipe(projectFieldWithEnv(props, env)("decoder"), (decoder) =>
      pipe(projectFieldWithEnv(partial, env)("decoder"), (decoderPartial) => {
        const keys = Object.keys(decoder)

        return new DecoderType(
          decoderApplyConfig(cfg?.conf)(
            makeDecoder(
              (u, c) =>
                T.map_(
                  tuple(
                    interfaceDecoder(keys, decoder, cfg?.name).validate(u, c),
                    partialDecoder(decoderPartial, cfg?.name).validate(u, c)
                  ),
                  ([r, o]) => ({ ...o, ...r })
                ),
              "both",
              cfg?.name || "Both"
            ),
            env,
            {
              decoder: decoder as any,
              decoderPartial: decoderPartial as any
            }
          )
        )
      })
    )
}))

function partialDecoder<
  Env,
  Props extends { [k in keyof Props]: (env: Env) => DecoderType<any> }
>(
  decoder: { [q in keyof Props]: ReturnType<Props[q]>["decoder"] },
  name?: string
): Decoder<
  Partial<
    Readonly<
      {
        [k in keyof Props]: [Props[k]] extends [Kind<DecoderURI, any, infer E, infer A>]
          ? A
          : never
      }
    >
  >
> {
  return makeDecoder(
    (u, c) => {
      if (isUnknownRecord(u)) {
        return pipe(
          u,
          foreachRecordWithIndex((k, a) =>
            typeof a !== "undefined" && decoder[k]
              ? (decoder[k] as Decoder<any>).validate(
                  a,
                  appendContext(c, k, decoder[k], a)
                )
              : T.succeed(a)
          )
        ) as any
      }
      return fail(u, c, `${typeof u} is not a record`)
    },
    "partial",
    name || "Partial"
  )
}

function interfaceDecoder<
  Env,
  Props extends { [k in keyof Props]: (env: Env) => DecoderType<any> }
>(
  keys: string[],
  decoder: { [q in keyof Props]: ReturnType<Props[q]>["decoder"] },
  name?: string
): Decoder<
  Readonly<
    {
      [k in keyof Props]: [Props[k]] extends [Kind<DecoderURI, any, infer E, infer A>]
        ? A
        : never
    }
  >
> {
  return makeDecoder(
    (u, c) => {
      if (isUnknownRecord(u)) {
        const set = new Set(keys.concat(Object.keys(u)))
        const r = {} as typeof u
        set.forEach((k) => {
          r[k] = u[k]
        })

        return pipe(
          r,
          foreachRecordWithIndex((k, a) =>
            decoder[k]
              ? (decoder[k] as Decoder<any>).validate(
                  a,
                  appendContext(c, k, decoder[k], a)
                )
              : T.succeed(a)
          )
        ) as any
      }
      return fail(u, c, `${typeof u} is not a record`)
    },
    "interface",
    name || "Interface"
  )
}
