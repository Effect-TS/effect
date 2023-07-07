/**
 * @since 1.0.0
 */

import * as E from "@effect/data/Either"
import { pipe } from "@effect/data/Function"
import * as O from "@effect/data/Option"
import { isNumber } from "@effect/data/Predicate"
import * as RA from "@effect/data/ReadonlyArray"
import * as AST from "@effect/schema/AST"
import * as I from "@effect/schema/internal/common"
import { eitherOrUndefined } from "@effect/schema/ParseResult"
import * as S from "@effect/schema/Schema"
import type * as FastCheck from "fast-check"

/**
 * @category model
 * @since 1.0.0
 */
export interface Arbitrary<A> {
  (fc: typeof FastCheck): FastCheck.Arbitrary<A>
}

/**
 * @category hooks
 * @since 1.0.0
 */
export const ArbitraryHookId = I.ArbitraryHookId

/**
 * @category arbitrary
 * @since 1.0.0
 */
export const to = <I, A>(
  schema: S.Schema<I, A>
): (fc: typeof FastCheck) => FastCheck.Arbitrary<A> => go(AST.to(schema.ast))

/**
 * @category arbitrary
 * @since 1.0.0
 */
export const from = <I, A>(
  schema: S.Schema<I, A>
): (fc: typeof FastCheck) => FastCheck.Arbitrary<I> => go(AST.from(schema.ast))

const record = <K extends PropertyKey, V>(
  fc: typeof FastCheck,
  key: FastCheck.Arbitrary<K>,
  value: FastCheck.Arbitrary<V>
): FastCheck.Arbitrary<{ readonly [k in K]: V }> =>
  fc.array(fc.tuple(key, value), { maxLength: 2 }).map((tuples) => {
    const out: { [k in K]: V } = {} as any
    for (const [k, v] of tuples) {
      out[k] = v
    }
    return out
  })

const getHook = AST.getAnnotation<
  (...args: ReadonlyArray<Arbitrary<any>>) => Arbitrary<any>
>(ArbitraryHookId)

/** @internal */
export const go = (ast: AST.AST, constraints?: Constraints): Arbitrary<any> => {
  switch (ast._tag) {
    case "Declaration":
      return pipe(
        getHook(ast),
        O.match({
          onNone: () => go(ast.type),
          onSome: (handler) => handler(...ast.typeParameters.map((p) => go(p)))
        })
      )
    case "Literal":
      return (fc) => fc.constant(ast.literal)
    case "UniqueSymbol":
      return (fc) => fc.constant(ast.symbol)
    case "UndefinedKeyword":
      return (fc) => fc.constant(undefined)
    case "VoidKeyword":
      return (fc) => fc.constant(undefined)
    case "NeverKeyword":
      return () => {
        throw new Error("cannot build an Arbitrary for `never`")
      }
    case "UnknownKeyword":
      return (fc) => fc.anything()
    case "AnyKeyword":
      return (fc) => fc.anything()
    case "StringKeyword":
      return (fc) => {
        if (constraints) {
          switch (constraints._tag) {
            case "StringConstraints":
              return fc.string(constraints.constraints)
          }
        }
        return fc.string()
      }
    case "NumberKeyword":
      return (fc) => {
        if (constraints) {
          switch (constraints._tag) {
            case "NumberConstraints":
              return fc.float(constraints.constraints)
            case "IntegerConstraints":
              return fc.integer(constraints.constraints)
          }
        }
        return fc.float()
      }
    case "BooleanKeyword":
      return (fc) => fc.boolean()
    case "BigIntKeyword":
      return (fc) => fc.bigInt()
    case "SymbolKeyword":
      return (fc) => fc.string().map((s) => Symbol.for(s))
    case "ObjectKeyword":
      return (fc) => fc.oneof(fc.object(), fc.array(fc.anything()))
    case "TemplateLiteral": {
      return (fc) => {
        const components = [fc.constant(ast.head)]
        for (const span of ast.spans) {
          components.push(fc.string({ maxLength: 5 }))
          components.push(fc.constant(span.literal))
        }
        return fc.tuple(...components).map((spans) => spans.join(""))
      }
    }
    case "Tuple": {
      const elements = ast.elements.map((e) => go(e.type))
      const rest = pipe(ast.rest, O.map(RA.mapNonEmpty((e) => go(e))))
      return (fc) => {
        // ---------------------------------------------
        // handle elements
        // ---------------------------------------------
        let output = fc.tuple(...elements.map((arb) => arb(fc)))
        if (elements.length > 0 && O.isNone(rest)) {
          const firstOptionalIndex = ast.elements.findIndex((e) => e.isOptional)
          if (firstOptionalIndex !== -1) {
            output = output.chain((as) =>
              fc.integer({ min: firstOptionalIndex, max: elements.length - 1 }).map((i) =>
                as.slice(0, i)
              )
            )
          }
        }

        // ---------------------------------------------
        // handle rest element
        // ---------------------------------------------
        if (O.isSome(rest)) {
          const head = RA.headNonEmpty(rest.value)
          const tail = RA.tailNonEmpty(rest.value)
          output = output.chain((as) =>
            fc.array(head(fc), { maxLength: 2 }).map((rest) => [...as, ...rest])
          )
          // ---------------------------------------------
          // handle post rest elements
          // ---------------------------------------------
          for (let j = 0; j < tail.length; j++) {
            output = output.chain((as) => tail[j](fc).map((a) => [...as, a]))
          }
        }

        return output
      }
    }
    case "TypeLiteral": {
      const propertySignaturesTypes = ast.propertySignatures.map((f) => go(f.type))
      const indexSignatures = ast.indexSignatures.map((is) =>
        [go(is.parameter), go(is.type)] as const
      )
      return (fc) => {
        const arbs: any = {}
        const requiredKeys: Array<PropertyKey> = []
        // ---------------------------------------------
        // handle property signatures
        // ---------------------------------------------
        for (let i = 0; i < propertySignaturesTypes.length; i++) {
          const ps = ast.propertySignatures[i]
          const name = ps.name
          if (!ps.isOptional) {
            requiredKeys.push(name)
          }
          arbs[name] = propertySignaturesTypes[i](fc)
        }
        let output = fc.record<any, any>(arbs, { requiredKeys })
        // ---------------------------------------------
        // handle index signatures
        // ---------------------------------------------
        for (let i = 0; i < indexSignatures.length; i++) {
          const parameter = indexSignatures[i][0](fc)
          const type = indexSignatures[i][1](fc)
          output = output.chain((o) => {
            return record(fc, parameter, type).map((d) => ({ ...d, ...o }))
          })
        }

        return output
      }
    }
    case "Union": {
      const types = ast.types.map((t) => go(t))
      return (fc) => fc.oneof(...types.map((arb) => arb(fc)))
    }
    case "Lazy":
      return pipe(
        getHook(ast),
        O.match({
          onNone: () => {
            const get = I.memoizeThunk(() => go(ast.f()))
            return (fc) => fc.constant(null).chain(() => get()(fc))
          },
          onSome: (handler) => handler()
        })
      )
    case "Enums": {
      if (ast.enums.length === 0) {
        throw new Error("cannot build an Arbitrary for an empty enum")
      }
      return (fc) => fc.oneof(...ast.enums.map(([_, value]) => fc.constant(value)))
    }
    case "Refinement": {
      const from = go(ast.from, combineConstraints(constraints, getConstraints(ast)))
      return pipe(
        getHook(ast),
        O.match({
          onNone: () =>
            (fc) =>
              from(fc).filter((a) => {
                const eu = eitherOrUndefined(ast.decode(a))
                if (eu) {
                  return E.isRight(eu)
                }
                throw new Error("cannot build an Arbitrary for effectful refinements")
              }),
          onSome: (handler) => handler(from)
        })
      )
    }
    case "Transform":
      throw new Error("cannot build an Arbitrary for transformations")
  }
}

interface NumberConstraints {
  readonly _tag: "NumberConstraints"
  readonly constraints: FastCheck.FloatConstraints
}

interface StringConstraints {
  readonly _tag: "StringConstraints"
  readonly constraints: FastCheck.StringSharedConstraints
}

interface IntegerConstraints {
  readonly _tag: "IntegerConstraints"
  readonly constraints: FastCheck.IntegerConstraints
}

type Constraints = NumberConstraints | StringConstraints | IntegerConstraints

/** @internal */
export const getConstraints = (ast: AST.Refinement): Constraints | undefined => {
  const TypeAnnotationId = ast.annotations[AST.TypeAnnotationId]
  const jsonSchema: any = ast.annotations[AST.JSONSchemaAnnotationId]
  switch (TypeAnnotationId) {
    case S.GreaterThanTypeId:
    case S.GreaterThanOrEqualToTypeId:
      return {
        _tag: "NumberConstraints",
        constraints: { min: jsonSchema.exclusiveMinimum ?? jsonSchema.minimum }
      }
    case S.LessThanTypeId:
    case S.LessThanOrEqualToTypeId:
      return {
        _tag: "NumberConstraints",
        constraints: { max: jsonSchema.exclusiveMaximum ?? jsonSchema.maximum }
      }
    case S.PositiveTypeId:
    case S.NonNegativeTypeId:
      return { _tag: "NumberConstraints", constraints: { min: 0 } }
    case S.NegativeTypeId:
    case S.NonPositiveTypeId:
      return { _tag: "NumberConstraints", constraints: { max: 0 } }
    case S.IntTypeId:
      return { _tag: "IntegerConstraints", constraints: {} }
    case S.BetweenTypeId: {
      const min = jsonSchema.minimum
      const max = jsonSchema.maximum
      const constraints: NumberConstraints["constraints"] = {}
      if (isNumber(min)) {
        constraints.min = min
      }
      if (isNumber(max)) {
        constraints.max = max
      }
      return { _tag: "NumberConstraints", constraints }
    }
    case S.MinLengthTypeId:
      return { _tag: "StringConstraints", constraints: { minLength: jsonSchema.minLength } }
    case S.MaxLengthTypeId:
      return { _tag: "StringConstraints", constraints: { maxLength: jsonSchema.maxLength } }
  }
}

/** @internal */
export const combineConstraints = (
  c1: Constraints | undefined,
  c2: Constraints | undefined
): Constraints | undefined => {
  if (c1 === undefined) {
    return c2
  }
  if (c2 === undefined) {
    return c1
  }
  switch (c1._tag) {
    case "NumberConstraints": {
      switch (c2._tag) {
        case "NumberConstraints": {
          const out: NumberConstraints = {
            _tag: "NumberConstraints",
            constraints: { ...c1.constraints, ...c2.constraints }
          }
          const min = getMax(c1.constraints.min, c2.constraints.min)
          if (isNumber(min)) {
            out.constraints.min = min
          }
          const max = getMin(c1.constraints.max, c2.constraints.max)
          if (isNumber(max)) {
            out.constraints.max = max
          }
          return out
        }
        case "IntegerConstraints": {
          const out: IntegerConstraints = { ...c2 }
          const min = getMax(c1.constraints.min, c2.constraints.min)
          if (isNumber(min)) {
            out.constraints.min = min
          }
          const max = getMin(c1.constraints.max, c2.constraints.max)
          if (isNumber(max)) {
            out.constraints.max = max
          }
          return out
        }
      }
      break
    }
    case "StringConstraints": {
      switch (c2._tag) {
        case "StringConstraints": {
          const out: StringConstraints = {
            _tag: "StringConstraints",
            constraints: { ...c1.constraints, ...c2.constraints }
          }
          const min = getMax(c1.constraints.minLength, c2.constraints.minLength)
          if (isNumber(min)) {
            out.constraints.minLength = min
          }
          const max = getMin(c1.constraints.maxLength, c2.constraints.maxLength)
          if (isNumber(max)) {
            out.constraints.maxLength = max
          }
          return out
        }
      }
      break
    }
    case "IntegerConstraints": {
      switch (c2._tag) {
        case "NumberConstraints":
        case "IntegerConstraints": {
          const out: IntegerConstraints = { ...c1 }
          const min = getMax(c1.constraints.min, c2.constraints.min)
          if (isNumber(min)) {
            out.constraints.min = min
          }
          const max = getMin(c1.constraints.max, c2.constraints.max)
          if (isNumber(max)) {
            out.constraints.max = max
          }
          return out
        }
      }
      break
    }
  }
}

const getMax = (n1: number | undefined, n2: number | undefined): number | undefined =>
  n1 === undefined ? n2 : n2 === undefined ? n1 : Math.max(n1, n2)

const getMin = (n1: number | undefined, n2: number | undefined): number | undefined =>
  n1 === undefined ? n2 : n2 === undefined ? n1 : Math.min(n1, n2)
