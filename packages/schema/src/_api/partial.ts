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

export type PartialApi<Props extends Record<PropertyKey, S.SchemaUPI>> = {
  readonly [K in keyof Props]: S.ApiOf<Props[K]>
}

export type PartialParsedShape<Props extends Record<PropertyKey, S.SchemaUPI>> = {
  readonly [K in keyof Props]?: S.ParsedShapeOf<Props[K]>
}

export type PartialConstructorInput<Props extends Record<PropertyKey, S.SchemaUPI>> = {
  readonly [K in keyof Props]?: S.ConstructorInputOf<Props[K]>
}

export type PartialConstructorError<
  Props extends Record<PropertyKey, S.SchemaUPI>
> = S.StructE<
  {
    [K in keyof Props]: S.OptionalKeyE<K, S.ConstructorErrorOf<Props[K]>>
  }[keyof Props]
>

export type PartialConstructedShape<Props extends Record<PropertyKey, S.SchemaUPI>> = {
  readonly [K in keyof Props]?: S.ConstructedShapeOf<Props[K]>
}

export type PartialParserError<
  Props extends Record<PropertyKey, S.SchemaUPI>
> = S.CompositionE<
  | S.PrevE<S.LeafE<S.UnknownRecordE>>
  | S.NextE<
      S.StructE<
        {
          [K in keyof Props]: S.OptionalKeyE<K, S.ParserErrorOf<Props[K]>>
        }[keyof Props]
      >
    >
>

export type PartialEncoded<Props extends Record<PropertyKey, S.SchemaUPI>> = {
  readonly [K in keyof Props]?: S.EncodedOf<Props[K]>
}

export type PartialSchema<Props extends Record<PropertyKey, S.SchemaUPI>> = S.Schema<
  unknown,
  PartialParserError<Props>,
  PartialParsedShape<Props>,
  PartialConstructorInput<Props>,
  PartialConstructorError<Props>,
  PartialConstructedShape<Props>,
  PartialEncoded<Props>,
  {
    omit: <KS extends readonly (keyof Props)[]>(
      ...ks: KS
    ) => PartialSchema<{ [k in Exclude<keyof Props, KS[number]>]: Props[k] }>
    pick: <KS extends readonly (keyof Props)[]>(
      ...ks: KS
    ) => PartialSchema<{ [k in KS[number]]: Props[k] }>
    fields: PartialApi<Props>
  }
>

export const partialIdentifier = Symbol.for("@effect-ts/schema/ids/partial")

export function partial<Props extends Record<PropertyKey, S.SchemaUPI>>(
  props: Props
): PartialSchema<Props> {
  const keys = Object.keys(props)
  const guards = keys.map((k) => Guard.for(props[k]!))
  const parsers = keys.map((k) => Parser.for(props[k]!))
  const constructors = keys.map((k) => Constructor.for(props[k]!))
  const encoders = keys.map((k) => Encoder.for(props[k]!))

  const guard = (
    u: unknown
  ): u is {
    [K in keyof Props]?: S.ParsedShapeOf<Props[K]>
  } => {
    if (typeof u === "object" && u != null) {
      for (let i = 0; i < keys.length; i++) {
        if (keys[i]! in u && typeof u[keys[i]!] !== "undefined") {
          if (!guards[i]!(u[keys[i]!])) {
            return false
          }
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

      return _.record(arbsFC, { withDeletedKeys: true })
    }),
    S.parser(
      (u): Th.These<PartialParserError<Props>, PartialParsedShape<Props>> => {
        if (typeof u !== "object" || u == null) {
          return Th.fail(
            S.compositionE(Chunk.single(S.prevE(S.leafE(S.unknownRecordE(u)))))
          )
        }

        const val = {}

        const errorsBuilder = Chunk.builder<
          {
            [K in keyof Props]: S.OptionalKeyE<K, S.ParserErrorOf<Props[K]>>
          }[keyof Props]
        >()

        let errored = false
        let warned = false

        for (let i = 0; i < keys.length; i++) {
          if (keys[i]! in u && typeof u[keys[i]!] !== "undefined") {
            const result = Th.result(parsers[i]!(u[keys[i]!]))
            if (result._tag === "Left") {
              errorsBuilder.append(S.optionalKeyE(keys[i]!, result.left))
              errored = true
            } else {
              val[keys[i]!] = result.right.get(0)
              const w = result.right.get(1)
              if (w._tag === "Some") {
                errorsBuilder.append(S.optionalKeyE(keys[i]!, w.value))
                warned = true
              }
            }
          }
        }

        const errors = errorsBuilder.build()

        if (!errored) {
          augmentRecord(val)
          if (warned) {
            return Th.warn(
              val,
              S.compositionE(Chunk.single(S.nextE(S.structE(errors))))
            )
          }
          return Th.succeed(val as PartialParsedShape<Props>)
        }

        return Th.fail(S.compositionE(Chunk.single(S.nextE(S.structE(errors)))))
      }
    ),
    S.constructor(
      (
        u: PartialConstructorInput<Props>
      ): Th.These<PartialConstructorError<Props>, PartialConstructedShape<Props>> => {
        const val = {}

        const errorsBuilder = Chunk.builder<
          {
            [K in keyof Props]: S.OptionalKeyE<K, S.ConstructorErrorOf<Props[K]>>
          }[keyof Props]
        >()

        let errored = false
        let warned = false

        for (let i = 0; i < keys.length; i++) {
          if (keys[i]! in u && typeof u[keys[i]!] !== "undefined") {
            const result = Th.result(constructors[i]!(u[keys[i]!]))
            if (result._tag === "Left") {
              errorsBuilder.append(S.optionalKeyE(keys[i]!, result.left))
              errored = true
            } else {
              val[keys[i]!] = result.right.get(0)
              const w = result.right.get(1)
              if (w._tag === "Some") {
                errorsBuilder.append(S.optionalKeyE(keys[i]!, w.value))
                warned = true
              }
            }
          }
        }

        const errors = errorsBuilder.build()

        if (!errored) {
          augmentRecord(val)
          if (warned) {
            return Th.warn(val as PartialConstructedShape<Props>, S.structE(errors))
          }
          return Th.succeed(val as PartialConstructedShape<Props>)
        }

        return Th.fail(S.structE(errors))
      }
    ),
    S.encoder((u) => {
      const res = {}
      for (let i = 0; i < encoders.length; i++) {
        if (keys[i]! in u && typeof u[keys[i]!] !== "undefined") {
          res[keys[i]!] = encoders[i]!(u[keys[i]!])
        }
      }
      return res as PartialEncoded<Props>
    }),
    S.mapApi((_) => {
      const fields = {} as any

      for (const k of keys) {
        fields[k] = props[k]?.Api
      }

      return {
        omit: <KS extends readonly (keyof Props)[]>(
          ...ks: KS
        ): PartialSchema<Omit<Props, KS[number]>> => {
          const np = {} as Omit<Props, KS[number]>
          for (const k of Object.keys(props)) {
            if (!ks.includes(k)) {
              np[k] = props[k]
            }
          }
          return partial(np)
        },
        pick: <KS extends readonly (keyof Props)[]>(
          ...ks: KS
        ): PartialSchema<Pick<Props, KS[number]>> => {
          const np = {} as Pick<Props, KS[number]>
          for (const k of ks) {
            if (!ks.includes(k)) {
              np[k] = props[k]
            }
          }
          return partial(np)
        },
        fields
      }
    }),
    S.identified(partialIdentifier, { props })
  )
}
