import * as R from "@effect-ts/core/Classic/Record"
import { pipe } from "@effect-ts/core/Function"
import * as T from "@effect-ts/core/Sync"

import type { ObjectURI } from "../../Algebra/Object"
import { isUnknownRecord } from "../../Guard/interpreter/common"
import type { Kind } from "../../HKT"
import { interpreter } from "../../HKT"
import { projectFieldWithEnv2 } from "../../Utils"
import { decoderApplyConfig, DecoderType, DecoderURI } from "../base"
import type { Decoder } from "../common"
import { appendContext, fail, makeDecoder } from "../common"
import { foreachRecordWithIndex, mergePrefer, originalSort, tuple } from "./common"

export const decoderObjectInterpreter = interpreter<DecoderURI, ObjectURI>()(() => ({
  _F: DecoderURI,
  interface: (props, cfg) => (env) =>
    pipe(projectFieldWithEnv2(props, env), (decoder) => {
      const keys = Object.keys(decoder)
      return new DecoderType(
        decoderApplyConfig(cfg?.conf)(
          interfaceDecoder(keys, decoder, cfg?.name) as any,
          env,
          {
            decoder: R.map_(decoder, (d) => d.decoder) as any
          }
        )
      ).setChilds(decoder)
    }),
  partial: (props, cfg) => (env) =>
    pipe(projectFieldWithEnv2(props, env), (decoder) => {
      return new DecoderType(
        decoderApplyConfig(cfg?.conf)(partialDecoder(decoder, cfg?.name) as any, env, {
          decoder: R.map_(decoder, (d) => d.decoder) as any
        })
      ).setChilds(decoder)
    }),
  both: (props, partial, cfg) => (env) =>
    pipe(projectFieldWithEnv2(props, env), (decoder) =>
      pipe(projectFieldWithEnv2(partial, env), (decoderPartial) => {
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
                  ([r, o]) => originalSort(u, mergePrefer(u, r, o))
                ),
              "both",
              cfg?.name || "Both"
            ),
            env,
            {
              decoder: R.map_(decoder, (d) => d.decoder) as any,
              decoderPartial: R.map_(decoderPartial, (d) => d.decoder) as any
            }
          )
        ).setChilds({ ...decoder, ...decoderPartial })
      })
    )
}))

function partialDecoder<
  Env,
  Props extends { [k in keyof Props]: (env: Env) => DecoderType<any> }
>(
  decoder: any,
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
              ? (decoder[k] as DecoderType<any>).decoder.validate(
                  a,
                  appendContext(c, k, decoder[k].decoder, a)
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
  decoder: any,
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
              ? (decoder[k] as DecoderType<any>).decoder.validate(
                  a,
                  appendContext(c, k, decoder[k].decoder, a)
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
