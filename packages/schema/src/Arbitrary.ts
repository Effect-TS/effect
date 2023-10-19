/**
 * @since 1.0.0
 */

import { pipe } from "effect/Function"
import * as Option from "effect/Option"
import * as Predicate from "effect/Predicate"
import * as ReadonlyArray from "effect/ReadonlyArray"
import type * as FastCheck from "fast-check"
import * as AST from "./AST"
import * as Internal from "./internal/common"
import * as Parser from "./Parser"
import * as Schema from "./Schema"

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
export const ArbitraryHookId = Internal.ArbitraryHookId

/**
 * @category arbitrary
 * @since 1.0.0
 */
export const to = <I, A>(
  schema: Schema.Schema<I, A>
): (fc: typeof FastCheck) => FastCheck.Arbitrary<A> => go(AST.to(schema.ast))

/**
 * @category arbitrary
 * @since 1.0.0
 */
export const from = <I, A>(
  schema: Schema.Schema<I, A>
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
        Option.match({
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
      const elements: Array<Arbitrary<any>> = []
      let hasOptionals = false
      for (const element of ast.elements) {
        elements.push(go(element.type))
        if (element.isOptional) {
          hasOptionals = true
        }
      }
      const rest = pipe(ast.rest, Option.map(ReadonlyArray.mapNonEmpty((e) => go(e))))
      return (fc) => {
        // ---------------------------------------------
        // handle elements
        // ---------------------------------------------
        let output = fc.tuple(...elements.map((arb) => arb(fc)))
        if (hasOptionals) {
          const indexes = fc.tuple(
            ...ast.elements.map((element) => element.isOptional ? fc.boolean() : fc.constant(true))
          )
          output = output.chain((tuple) =>
            indexes.map((booleans) => {
              for (const [i, b] of booleans.reverse().entries()) {
                if (!b) {
                  tuple.splice(booleans.length - i, 1)
                }
              }
              return tuple
            })
          )
        }

        // ---------------------------------------------
        // handle rest element
        // ---------------------------------------------
        if (Option.isSome(rest)) {
          const head = ReadonlyArray.headNonEmpty(rest.value)
          const tail = ReadonlyArray.tailNonEmpty(rest.value)
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
        Option.match({
          onNone: () => {
            const get = Internal.memoizeThunk(() => go(ast.f()))
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
        Option.match({
          onNone: () => (fc) =>
            from(fc).filter((a) => Option.isNone(ast.filter(a, Parser.defaultParseOption, ast))),
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

const numberConstraints = (constraints: NumberConstraints["constraints"]): NumberConstraints => {
  if (Predicate.isNumber(constraints.min)) {
    constraints.min = Math.fround(constraints.min)
  }
  if (Predicate.isNumber(constraints.max)) {
    constraints.max = Math.fround(constraints.max)
  }
  return { _tag: "NumberConstraints", constraints }
}

interface StringConstraints {
  readonly _tag: "StringConstraints"
  readonly constraints: FastCheck.StringSharedConstraints
}

const stringConstraints = (constraints: StringConstraints["constraints"]): StringConstraints => {
  return { _tag: "StringConstraints", constraints }
}

interface IntegerConstraints {
  readonly _tag: "IntegerConstraints"
  readonly constraints: FastCheck.IntegerConstraints
}

const integerConstraints = (constraints: IntegerConstraints["constraints"]): IntegerConstraints => {
  return { _tag: "IntegerConstraints", constraints }
}

type Constraints = NumberConstraints | StringConstraints | IntegerConstraints

/** @internal */
export const getConstraints = (ast: AST.Refinement): Constraints | undefined => {
  const TypeAnnotationId = ast.annotations[AST.TypeAnnotationId]
  const jsonSchema: any = ast.annotations[AST.JSONSchemaAnnotationId]
  switch (TypeAnnotationId) {
    case Schema.GreaterThanTypeId:
    case Schema.GreaterThanOrEqualToTypeId:
      return numberConstraints({ min: jsonSchema.exclusiveMinimum ?? jsonSchema.minimum })
    case Schema.LessThanTypeId:
    case Schema.LessThanOrEqualToTypeId:
      return numberConstraints({ max: jsonSchema.exclusiveMaximum ?? jsonSchema.maximum })
    case Schema.IntTypeId:
      return integerConstraints({})
    case Schema.BetweenTypeId: {
      const min = jsonSchema.minimum
      const max = jsonSchema.maximum
      const constraints: NumberConstraints["constraints"] = {}
      if (Predicate.isNumber(min)) {
        constraints.min = min
      }
      if (Predicate.isNumber(max)) {
        constraints.max = max
      }
      return numberConstraints(constraints)
    }
    case Schema.MinLengthTypeId:
      return stringConstraints({ minLength: jsonSchema.minLength })
    case Schema.MaxLengthTypeId:
      return stringConstraints({ maxLength: jsonSchema.maxLength })
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
          const constraints: NumberConstraints["constraints"] = {
            ...c1.constraints,
            ...c2.constraints
          }
          const min = getMax(c1.constraints.min, c2.constraints.min)
          if (Predicate.isNumber(min)) {
            constraints.min = min
          }
          const max = getMin(c1.constraints.max, c2.constraints.max)
          if (Predicate.isNumber(max)) {
            constraints.max = max
          }
          return numberConstraints(constraints)
        }
        case "IntegerConstraints": {
          const out: IntegerConstraints = { ...c2 }
          const min = getMax(c1.constraints.min, c2.constraints.min)
          if (Predicate.isNumber(min)) {
            out.constraints.min = min
          }
          const max = getMin(c1.constraints.max, c2.constraints.max)
          if (Predicate.isNumber(max)) {
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
          const out: StringConstraints = stringConstraints({ ...c1.constraints, ...c2.constraints })
          const min = getMax(c1.constraints.minLength, c2.constraints.minLength)
          if (Predicate.isNumber(min)) {
            out.constraints.minLength = min
          }
          const max = getMin(c1.constraints.maxLength, c2.constraints.maxLength)
          if (Predicate.isNumber(max)) {
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
          if (Predicate.isNumber(min)) {
            out.constraints.min = min
          }
          const max = getMin(c1.constraints.max, c2.constraints.max)
          if (Predicate.isNumber(max)) {
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
