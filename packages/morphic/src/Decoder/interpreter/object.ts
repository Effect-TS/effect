import { pipe } from "@effect-ts/core/Function"
import * as T from "@effect-ts/core/Sync"

import type { ObjectURI, PropsKind } from "../../Algebra/Object"
import { isUnknownRecord } from "../../Guard/interpreter/common"
import type { AnyEnv } from "../../HKT"
import { interpreter } from "../../HKT"
import { projectFieldWithEnv } from "../../Utils"
import { decoderApplyConfig, DecoderType, DecoderURI } from "../base"
import type { Validate } from "../common"
import { fail } from "../common"
import { fixKey, foreachRecordWithIndex, tuple } from "./common"

export const decoderObjectInterpreter = interpreter<DecoderURI, ObjectURI>()(() => ({
  _F: DecoderURI,
  interface: (props, cfg) => (env) =>
    pipe(projectFieldWithEnv(props as any, env)("decoder"), (decoder) => {
      const keys = Object.keys(decoder)
      return new DecoderType(
        decoderApplyConfig(cfg?.conf)(
          interfaceDecoder(keys, decoder, cfg?.id, cfg?.name),
          env,
          {
            decoder: decoder as any
          }
        )
      )
    }),
  partial: (props, cfg) => (env) =>
    pipe(projectFieldWithEnv(props as any, env)("decoder"), (decoder) => {
      return new DecoderType(
        decoderApplyConfig(cfg?.conf)(
          partialDecoder(decoder, cfg?.id, cfg?.name),
          env,
          {
            decoder: decoder as any
          }
        )
      )
    }),
  both: (props, partial, cfg) => (env) =>
    pipe(projectFieldWithEnv(props, env)("decoder"), (decoder) =>
      pipe(projectFieldWithEnv(partial, env)("decoder"), (decoderPartial) => {
        const keys = Object.keys(decoder)

        return new DecoderType(
          decoderApplyConfig(cfg?.conf)(
            {
              validate: (u, c) =>
                T.map_(
                  tuple(
                    interfaceDecoder(keys, decoder, cfg?.id, cfg?.name).validate(u, c),
                    partialDecoder(decoderPartial, cfg?.id, cfg?.name).validate(u, c)
                  ),
                  ([r, o]) => ({ ...r, ...o })
                )
            },
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

function partialDecoder<PropsA, PropsE, Env extends AnyEnv>(
  decoder: {
    [q in keyof PropsKind<DecoderURI, PropsA, PropsE, Env>]: ReturnType<
      PropsKind<DecoderURI, PropsA, PropsE, Env>[q]
    >["decoder"]
  },
  id?: string,
  name?: string
): Validate<Partial<Readonly<PropsA>>> {
  return {
    validate: (u, c) => {
      if (isUnknownRecord(u)) {
        const r = {}
        for (const k of Object.keys(u)) {
          if (typeof u[k] !== "undefined" && decoder[k]) {
            r[k] = u[k]
          }
        }
        return pipe(
          r,
          foreachRecordWithIndex((k, a) =>
            decoder[k]
              ? (decoder[k] as Validate<any>).validate(a, {
                  key: fixKey(`${c.key}.${k}`),
                  actual: a,
                  types: name ? [...c.types, name] : c.types
                })
              : T.succeed(a)
          )
        ) as any
      }
      return fail([
        {
          id,
          name,
          message: `${typeof u} is not a record`,
          context: {
            ...c,
            actual: u,
            types: name ? [...c.types, name] : c.types
          }
        }
      ])
    }
  }
}

function interfaceDecoder<PropsA, PropsE, Env extends AnyEnv>(
  keys: string[],
  decoder: {
    [q in keyof PropsKind<DecoderURI, PropsA, PropsE, Env>]: ReturnType<
      PropsKind<DecoderURI, PropsA, PropsE, Env>[q]
    >["decoder"]
  },
  id?: string,
  name?: string
): Validate<Readonly<PropsA>> {
  return {
    validate: (u, c) => {
      if (isUnknownRecord(u)) {
        const uk = Object.keys(u)
        if (keys.length <= uk.length && keys.every((v) => uk.includes(v))) {
          return pipe(
            u,
            foreachRecordWithIndex((k, a) =>
              decoder[k]
                ? (decoder[k] as Validate<any>).validate(a, {
                    key: fixKey(`${c.key}.${k}`),
                    actual: a,
                    types: name ? [...c.types, name] : c.types
                  })
                : T.succeed(a)
            )
          ) as any
        }
        return fail([
          {
            id,
            name,
            message: `not all the required fields are present`,
            context: {
              ...c,
              actual: u,
              types: name ? [...c.types, name] : c.types
            }
          }
        ])
      }
      return fail([
        {
          id,
          name,
          message: `${typeof u} is not a record`,
          context: {
            ...c,
            actual: u,
            types: name ? [...c.types, name] : c.types
          }
        }
      ])
    }
  }
}
