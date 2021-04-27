// tracing: off

import * as Chunk from "@effect-ts/core/Collections/Immutable/Chunk"
import { pipe } from "@effect-ts/core/Function"

import * as S from "../_schema"
import { augmentRecord } from "../_utils"
import * as Arbitrary from "../Arbitrary"
import * as Constructor from "../Constructor"
import * as Encoder from "../Encoder"
import * as Guard from "../Guard"
import * as Parser from "../Parser"
import * as Th from "../These"
import { intersect_ } from "./intersect"
import type {
  PartialApi,
  PartialConstructedShape,
  PartialConstructorError,
  PartialConstructorInput,
  PartialEncoded,
  PartialParsedShape,
  PartialParserError,
  PartialSchema
} from "./partial"
import { partial } from "./partial"

export type RequiredApi<Props extends Record<PropertyKey, S.SchemaUPI>> = {
  readonly [K in keyof Props]: S.ApiOf<Props[K]>
}

export type RequiredParsedShape<Props extends Record<PropertyKey, S.SchemaUPI>> = {
  readonly [K in keyof Props]: S.ParsedShapeOf<Props[K]>
}

export type RequiredConstructorInput<Props extends Record<PropertyKey, S.SchemaUPI>> = {
  readonly [K in keyof Props]: S.ConstructorInputOf<Props[K]>
}

export type RequiredConstructorError<
  Props extends Record<PropertyKey, S.SchemaUPI>
> = S.StructE<
  {
    [K in keyof Props]: S.RequiredKeyE<K, S.ConstructorErrorOf<Props[K]>>
  }[keyof Props]
>

export type RequiredConstructedShape<Props extends Record<PropertyKey, S.SchemaUPI>> = {
  readonly [K in keyof Props]: S.ConstructedShapeOf<Props[K]>
}

export type RequiredParserError<
  Props extends Record<PropertyKey, S.SchemaUPI>
> = S.CompositionE<
  | S.PrevE<S.LeafE<S.UnknownRecordE>>
  | S.NextE<
      S.CompositionE<
        | S.PrevE<S.MissingKeysE<keyof Props>>
        | S.NextE<
            S.StructE<
              {
                [K in keyof Props]: S.RequiredKeyE<K, S.ParserErrorOf<Props[K]>>
              }[keyof Props]
            >
          >
      >
    >
>

export type RequiredEncoded<Props extends Record<PropertyKey, S.SchemaUPI>> = {
  readonly [K in keyof Props]: S.EncodedOf<Props[K]>
}

export type RequiredSchema<Props extends Record<PropertyKey, S.SchemaUPI>> = S.Schema<
  unknown,
  RequiredParserError<Props>,
  RequiredParsedShape<Props>,
  RequiredConstructorInput<Props>,
  RequiredConstructorError<Props>,
  RequiredConstructedShape<Props>,
  RequiredEncoded<Props>,
  {
    omit: <KS extends readonly (keyof Props)[]>(
      ...ks: KS
    ) => RequiredSchema<{ [k in Exclude<keyof Props, KS[number]>]: Props[k] }>
    pick: <KS extends readonly (keyof Props)[]>(
      ...ks: KS
    ) => RequiredSchema<{ [k in KS[number]]: Props[k] }>
    fields: RequiredApi<Props>
  }
>

export const requiredIdentifier = Symbol.for("@effect-ts/schema/ids/required")

export function required<Props extends Record<PropertyKey, S.SchemaUPI>>(
  props: Props
): RequiredSchema<Props> {
  const keys = Object.keys(props)
  const guards = keys.map((k) => Guard.for(props[k]!))
  const parsers = keys.map((k) => Parser.for(props[k]!))
  const constructors = keys.map((k) => Constructor.for(props[k]!))
  const encoders = keys.map((k) => Encoder.for(props[k]!))

  const guard = (
    u: unknown
  ): u is {
    [K in keyof Props]: S.ParsedShapeOf<Props[K]>
  } => {
    if (typeof u === "object" && u != null) {
      for (let i = 0; i < keys.length; i++) {
        if (!(keys[i]! in u)) {
          return false
        }
        if (!guards[i]!(u[keys[i]!])) {
          return false
        }
      }
      return true
    }
    return false
  }

  const arbs = {}

  for (const k of keys) {
    arbs[k] = Arbitrary.for(props[k]!)
  }

  return pipe(
    S.identity(guard),
    S.arbitrary((_) => {
      const arbsFC = {}

      for (const k of keys) {
        arbsFC[k] = arbs[k](_)
      }

      return _.record(arbsFC as any) as Arbitrary.Arbitrary<RequiredParsedShape<Props>>
    }),
    S.parser(
      (u): Th.These<RequiredParserError<Props>, RequiredParsedShape<Props>> => {
        if (typeof u !== "object" || u == null) {
          return Th.fail(
            S.compositionE(Chunk.single(S.prevE(S.leafE(S.unknownRecordE(u)))))
          )
        }
        const missingKeys = []

        for (const k of keys) {
          if (!(k in u)) {
            missingKeys.push(k)
          }
        }

        if (missingKeys.length > 0) {
          return Th.fail(
            S.compositionE(
              Chunk.single(
                S.nextE(
                  S.compositionE(
                    Chunk.single(S.prevE(S.missingKeysE(Chunk.from(missingKeys))))
                  )
                )
              )
            )
          )
        }

        const val = {}

        const errorsBuilder = Chunk.builder<
          {
            [K in keyof Props]: S.RequiredKeyE<K, S.ParserErrorOf<Props[K]>>
          }[keyof Props]
        >()

        let errored = false
        let warned = false

        for (let i = 0; i < keys.length; i++) {
          const result = Th.result(parsers[i]!(u[keys[i]!]))
          if (result._tag === "Left") {
            errorsBuilder.append(S.requiredKeyE(keys[i]!, result.left))
            errored = true
          } else {
            val[keys[i]!] = result.right.get(0)
            const w = result.right.get(1)
            if (w._tag === "Some") {
              errorsBuilder.append(S.requiredKeyE(keys[i]!, w.value))
              warned = true
            }
          }
        }

        const errors = errorsBuilder.build()

        if (!errored) {
          augmentRecord(val)
          if (warned) {
            return Th.warn(
              val as RequiredParsedShape<Props>,
              S.compositionE(
                Chunk.single(
                  S.nextE(S.compositionE(Chunk.single(S.nextE(S.structE(errors)))))
                )
              )
            )
          }
          return Th.succeed(val as RequiredParsedShape<Props>)
        }

        return Th.fail(
          S.compositionE(
            Chunk.single(
              S.nextE(S.compositionE(Chunk.single(S.nextE(S.structE(errors)))))
            )
          )
        )
      }
    ),
    S.constructor(
      (
        u: RequiredConstructorInput<Props>
      ): Th.These<RequiredConstructorError<Props>, RequiredConstructedShape<Props>> => {
        const val = {}

        const errorsBuilder = Chunk.builder<
          {
            [K in keyof Props]: S.RequiredKeyE<K, S.ConstructorErrorOf<Props[K]>>
          }[keyof Props]
        >()

        let errored = false
        let warned = false

        for (let i = 0; i < keys.length; i++) {
          const result = Th.result(constructors[i]!(u[keys[i]!]))
          if (result._tag === "Left") {
            errorsBuilder.append(S.requiredKeyE(keys[i]!, result.left))
            errored = true
          } else {
            val[keys[i]!] = result.right.get(0)
            const w = result.right.get(1)
            if (w._tag === "Some") {
              errorsBuilder.append(S.requiredKeyE(keys[i]!, w.value))
              warned = true
            }
          }
        }

        const errors = errorsBuilder.build()

        if (!errored) {
          augmentRecord(val)
          if (warned) {
            return Th.warn(val as RequiredConstructedShape<Props>, S.structE(errors))
          }
          return Th.succeed(val as RequiredConstructedShape<Props>)
        }

        return Th.fail(S.structE(errors))
      }
    ),
    S.encoder((u) => {
      const res = {}
      for (let i = 0; i < encoders.length; i++) {
        res[keys[i]!] = encoders[i]!(u[keys[i]!])
      }
      return res as RequiredEncoded<Props>
    }),
    S.mapApi((_) => {
      const fields = {} as any

      for (const k of keys) {
        fields[k] = props[k]?.Api
      }

      return {
        omit: <KS extends readonly (keyof Props)[]>(
          ...ks: KS
        ): RequiredSchema<Omit<Props, KS[number]>> => {
          const np = {} as Omit<Props, KS[number]>
          for (const k of Object.keys(props)) {
            if (!ks.includes(k)) {
              np[k] = props[k]
            }
          }
          return required(np)
        },
        pick: <KS extends readonly (keyof Props)[]>(
          ...ks: KS
        ): RequiredSchema<Pick<Props, KS[number]>> => {
          const np = {} as Pick<Props, KS[number]>
          for (const k of ks) {
            if (!ks.includes(k)) {
              np[k] = props[k]
            }
          }
          return required(np)
        },
        fields
      }
    }),
    S.identified(requiredIdentifier, { props })
  )
}

export type StructSchema<
  Required extends Record<
    string,
    S.Schema<unknown, S.SchemaError<any>, any, any, S.SchemaError<any>, any, any, any>
  >,
  Partial extends Record<
    string,
    S.Schema<unknown, S.SchemaError<any>, any, any, S.SchemaError<any>, any, any, any>
  >
> = S.Schema<
  unknown,
  S.IntersectionE<
    | S.MemberE<0, RequiredParserError<Required>>
    | S.MemberE<1, PartialParserError<Partial>>
  >,
  RequiredParsedShape<Required> & PartialParsedShape<Partial>,
  RequiredConstructorInput<Required> & PartialConstructorInput<Partial>,
  S.IntersectionE<
    | S.MemberE<0, RequiredConstructorError<Required>>
    | S.MemberE<1, PartialConstructorError<Partial>>
  >,
  RequiredConstructedShape<Required> & PartialConstructedShape<Partial>,
  RequiredEncoded<Required> & PartialEncoded<Partial>,
  {
    fields: RequiredApi<Required> & PartialApi<Partial>
    omit: <KS extends readonly (keyof Required | keyof Partial)[]>(
      ...ks: KS
    ) => StructSchema<
      { [k in Exclude<keyof Required, KS[number]>]: Required[k] },
      { [k in Exclude<keyof Partial, KS[number]>]: Partial[k] }
    >
    pick: <KS extends readonly (keyof Required | keyof Partial)[]>(
      ...ks: KS
    ) => StructSchema<
      { [k in KS[number] & keyof Required]: Required[k] },
      { [k in KS[number] & keyof Partial]: Partial[k] }
    >
  }
>

export const structIdentifier = Symbol.for("@effect-ts/schema/ids/struct")

export function struct<
  Required extends Record<
    string,
    S.Schema<unknown, S.SchemaError<any>, any, any, S.SchemaError<any>, any, any, any>
  >,
  Partial extends Record<
    string,
    S.Schema<unknown, S.SchemaError<any>, any, any, S.SchemaError<any>, any, any, any>
  >
>(_: { required: Required; optional: Partial }): StructSchema<Required, Partial>
export function struct<
  Required extends Record<
    string,
    S.Schema<unknown, S.SchemaError<any>, any, any, S.SchemaError<any>, any, any, any>
  >
>(_: { required: Required }): RequiredSchema<Required>
export function struct<
  Partial extends Record<
    string,
    S.Schema<unknown, S.SchemaError<any>, any, any, S.SchemaError<any>, any, any, any>
  >
>(_: { optional: Partial }): PartialSchema<Partial>
export function struct<
  Required extends Record<
    string,
    S.Schema<unknown, S.SchemaError<any>, any, any, S.SchemaError<any>, any, any, any>
  >,
  Partial extends Record<
    string,
    S.Schema<unknown, S.SchemaError<any>, any, any, S.SchemaError<any>, any, any, any>
  >
>(_: { required?: Required; optional?: Partial }): unknown {
  const { optional: propsPartial, required: props } = _
  if (propsPartial && props) {
    const l = required(props)
    const r = partial(propsPartial)
    return S.identified(
      structIdentifier,
      _
    )(
      intersect_(l, r)["|>"](
        S.mapApi(() => ({
          omit: (...ks: string[]) => {
            const nr = {}
            for (const k of Object.keys(props)) {
              if (!ks.includes(k)) {
                nr[k] = props[k]
              }
            }
            const np = {}
            for (const k of Object.keys(propsPartial)) {
              if (!ks.includes(k)) {
                np[k] = propsPartial[k]
              }
            }
            return struct({ required: nr, optional: np })
          },
          pick: (...ks: string[]) => {
            const nr = {}
            for (const k of Object.keys(props)) {
              if (ks.includes(k)) {
                nr[k] = props[k]
              }
            }
            const np = {}
            for (const k of Object.keys(propsPartial)) {
              if (ks.includes(k)) {
                np[k] = propsPartial[k]
              }
            }
            return struct({ required: nr, optional: np })
          },
          fields: { ...l.Api.fields, ...r.Api.fields }
        }))
      )
    )
  }
  if (props) {
    return S.identified(structIdentifier, _)(required(props))
  }
  if (propsPartial) {
    return S.identified(structIdentifier, _)(partial(propsPartial))
  }
  throw new Error("Bug")
}
