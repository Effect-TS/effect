import { pipe } from "@effect-ts/core/Function"
import * as T from "@effect-ts/core/Sync"

import type { AnyEnv } from "../../Algebra/config"
import type { AlgebraObject1, PropsKind1 } from "../../Algebra/object"
import { isUnknownRecord } from "../../Guard/interpreter/common"
import { memo, projectFieldWithEnv } from "../../Internal/Utils"
import type { Validate } from "../common"
import { fail } from "../common"
import { decoderApplyConfig } from "../config"
import { DecoderType, DecoderURI } from "../hkt"
import { fixKey, foreachRecordWithIndex, tuple } from "./common"

export const decoderObjectInterpreter = memo(
  <Env extends AnyEnv>(): AlgebraObject1<DecoderURI, Env> => ({
    _F: DecoderURI,
    interface: (props, cfg) => (env) =>
      pipe(projectFieldWithEnv(props, env)("decoder"), (decoder) => {
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
      pipe(projectFieldWithEnv(props, env)("decoder"), (decoder) => {
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
                      interfaceDecoder(keys, decoder, cfg?.id, cfg?.name).validate(
                        u,
                        c
                      ),
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
  })
)

function partialDecoder<Props, Env extends AnyEnv>(
  decoder: {
    [q in keyof PropsKind1<DecoderURI, Props, Env>]: ReturnType<
      PropsKind1<DecoderURI, Props, Env>[q]
    >["decoder"]
  },
  id?: string,
  name?: string
): Validate<Partial<Readonly<Props>>> {
  return {
    validate: (u, c) => {
      if (isUnknownRecord(u)) {
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

function interfaceDecoder<Props, Env extends AnyEnv>(
  keys: string[],
  decoder: {
    [q in keyof PropsKind1<DecoderURI, Props, Env>]: ReturnType<
      PropsKind1<DecoderURI, Props, Env>[q]
    >["decoder"]
  },
  id?: string,
  name?: string
): Validate<Readonly<Props>> {
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
