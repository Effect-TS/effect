/**
 * @since 1.0.0
 */

import { pipe } from "effect/Function"
import * as Option from "effect/Option"
import * as Predicate from "effect/Predicate"
import * as ReadonlyArray from "effect/ReadonlyArray"
import type * as FastCheck from "fast-check"
import * as AST from "./AST.js"
import * as Internal from "./internal/ast.js"
import * as filters from "./internal/filters.js"
import * as hooks from "./internal/hooks.js"
import * as Parser from "./Parser.js"
import type * as Schema from "./Schema.js"

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
export const ArbitraryHookId: unique symbol = hooks.ArbitraryHookId

/**
 * @category hooks
 * @since 1.0.0
 */
export type ArbitraryHookId = typeof ArbitraryHookId

/** @internal */
export const unsafe = <I, A>(
  schema: Schema.Schema<I, A>
): (fc: typeof FastCheck) => FastCheck.Arbitrary<A> => go(schema.ast, {})

/**
 * @category arbitrary
 * @since 1.0.0
 */
export const to = <I, A>(
  schema: Schema.Schema<I, A>
): (fc: typeof FastCheck) => FastCheck.Arbitrary<A> => go(AST.to(schema.ast), {})

/**
 * @category arbitrary
 * @since 1.0.0
 */
export const from = <I, A>(
  schema: Schema.Schema<I, A>
): (fc: typeof FastCheck) => FastCheck.Arbitrary<I> => go(AST.from(schema.ast), {})

const depthSize = 1

const record = <K extends PropertyKey, V>(
  fc: typeof FastCheck,
  key: FastCheck.Arbitrary<K>,
  value: FastCheck.Arbitrary<V>,
  options: Options
): FastCheck.Arbitrary<{ readonly [k in K]: V }> => {
  return (options.isSuspend ?
    fc.oneof(
      { depthSize },
      fc.constant([]),
      fc.array(fc.tuple(key, value), { minLength: 1, maxLength: 2 })
    ) :
    fc.array(fc.tuple(key, value))).map((tuples) => {
      const out: { [k in K]: V } = {} as any
      for (const [k, v] of tuples) {
        out[k] = v
      }
      return out
    })
}

const getHook = AST.getAnnotation<
  (...args: ReadonlyArray<Arbitrary<any>>) => Arbitrary<any>
>(ArbitraryHookId)

type Options = {
  readonly constraints?: Constraints
  readonly isSuspend?: boolean
}

/** @internal */
export const go = (ast: AST.AST, options: Options): Arbitrary<any> => {
  switch (ast._tag) {
    case "Declaration": {
      const hook = getHook(ast)
      if (Option.isSome(hook)) {
        return hook.value(...ast.typeParameters.map((p) => go(p, options)))
      }
      throw new Error("cannot build an Arbitrary for a declaration without annotations")
    }
    case "Literal":
      return (fc) => fc.constant(ast.literal)
    case "UniqueSymbol":
      return (fc) => fc.constant(ast.symbol)
    case "UndefinedKeyword":
    case "VoidKeyword":
      return (fc) => fc.constant(undefined)
    case "NeverKeyword":
      return () => {
        throw new Error("cannot build an Arbitrary for `never`")
      }
    case "UnknownKeyword":
    case "AnyKeyword":
      return (fc) => fc.anything()
    case "StringKeyword":
      return (fc) => {
        if (options.constraints) {
          switch (options.constraints._tag) {
            case "StringConstraints":
              return fc.string(options.constraints.constraints)
          }
        }
        return fc.string()
      }
    case "NumberKeyword":
      return (fc) => {
        if (options.constraints) {
          switch (options.constraints._tag) {
            case "NumberConstraints":
              return fc.float(options.constraints.constraints)
            case "IntegerConstraints":
              return fc.integer(options.constraints.constraints)
          }
        }
        return fc.float()
      }
    case "BooleanKeyword":
      return (fc) => fc.boolean()
    case "BigIntKeyword":
      return (fc) => {
        if (options.constraints) {
          switch (options.constraints._tag) {
            case "BigIntConstraints":
              return fc.bigInt(options.constraints.constraints)
          }
        }
        return fc.bigInt()
      }
    case "SymbolKeyword":
      return (fc) => fc.string().map((s) => Symbol.for(s))
    case "ObjectKeyword":
      return (fc) => fc.oneof(fc.object(), fc.array(fc.anything()))
    case "TemplateLiteral": {
      return (fc) => {
        const string = fc.string({ maxLength: 5 })
        const number = fc.float({ noDefaultInfinity: true }).filter((n) => !Number.isNaN(n))
        const components: Array<FastCheck.Arbitrary<string | number>> = [fc.constant(ast.head)]
        for (const span of ast.spans) {
          if (AST.isStringKeyword(span.type)) {
            components.push(string)
          } else {
            components.push(number)
          }
          components.push(fc.constant(span.literal))
        }
        return fc.tuple(...components).map((spans) => spans.join(""))
      }
    }
    case "Tuple": {
      const elements: Array<Arbitrary<any>> = []
      let hasOptionals = false
      for (const element of ast.elements) {
        elements.push(go(element.type, options))
        if (element.isOptional) {
          hasOptionals = true
        }
      }
      const rest = Option.map(ast.rest, ReadonlyArray.map((e) => go(e, options)))
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
          const [head, ...tail] = rest.value
          const arb = head(fc)
          const constraints = options.constraints
          output = output.chain((as) => {
            let out = fc.array(arb)
            if (options.isSuspend) {
              out = fc.oneof(
                { depthSize },
                fc.constant([]),
                fc.array(arb, { minLength: 1, maxLength: 2 })
              )
            } else if (constraints && constraints._tag === "ArrayConstraints") {
              out = fc.array(arb, constraints.constraints)
            }
            return out.map((rest) => [...as, ...rest])
          })
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
      const propertySignaturesTypes = ast.propertySignatures.map((f) => go(f.type, options))
      const indexSignatures = ast.indexSignatures.map((is) =>
        [go(is.parameter, options), go(is.type, options)] as const
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
            return record(fc, parameter, type, options).map((d) => ({ ...d, ...o }))
          })
        }

        return output
      }
    }
    case "Union": {
      const types = ast.types.map((t) => go(t, options))
      return (fc) => fc.oneof({ depthSize }, ...types.map((arb) => arb(fc)))
    }
    case "Enums": {
      if (ast.enums.length === 0) {
        throw new Error("cannot build an Arbitrary for an empty enum")
      }
      return (fc) => fc.oneof(...ast.enums.map(([_, value]) => fc.constant(value)))
    }
    case "Refinement": {
      const constraints = combineConstraints(options.constraints, getConstraints(ast))
      const from = go(ast.from, constraints ? { ...options, constraints } : options)
      return pipe(
        getHook(ast),
        Option.match({
          onNone: () => (fc) =>
            from(fc).filter((a) => Option.isNone(ast.filter(a, Parser.defaultParseOption, ast))),
          onSome: (handler) => handler(from)
        })
      )
    }
    case "Suspend": {
      return pipe(
        getHook(ast),
        Option.match({
          onNone: () => {
            const get = Internal.memoizeThunk(() => go(ast.f(), { ...options, isSuspend: true }))
            return (fc) => fc.constant(null).chain(() => get()(fc))
          },
          onSome: (handler) => handler()
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

/** @internal */
export const numberConstraints = (
  constraints: NumberConstraints["constraints"]
): NumberConstraints => {
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

/** @internal */
export const stringConstraints = (
  constraints: StringConstraints["constraints"]
): StringConstraints => {
  return { _tag: "StringConstraints", constraints }
}

interface IntegerConstraints {
  readonly _tag: "IntegerConstraints"
  readonly constraints: FastCheck.IntegerConstraints
}

/** @internal */
export const integerConstraints = (
  constraints: IntegerConstraints["constraints"]
): IntegerConstraints => {
  return { _tag: "IntegerConstraints", constraints }
}

interface ArrayConstraints {
  readonly _tag: "ArrayConstraints"
  readonly constraints: FastCheck.ArrayConstraints
}

/** @internal */
export const arrayConstraints = (
  constraints: ArrayConstraints["constraints"]
): ArrayConstraints => {
  return { _tag: "ArrayConstraints", constraints }
}

interface BigIntConstraints {
  readonly _tag: "BigIntConstraints"
  readonly constraints: FastCheck.BigIntConstraints
}

/** @internal */
export const bigintConstraints = (
  constraints: BigIntConstraints["constraints"]
): BigIntConstraints => {
  return { _tag: "BigIntConstraints", constraints }
}

/** @internal */
export type Constraints =
  | NumberConstraints
  | StringConstraints
  | IntegerConstraints
  | ArrayConstraints
  | BigIntConstraints

/** @internal */
export const getConstraints = (ast: AST.Refinement): Constraints | undefined => {
  const TypeAnnotationId = ast.annotations[AST.TypeAnnotationId]
  const jsonSchema: any = ast.annotations[AST.JSONSchemaAnnotationId]
  switch (TypeAnnotationId) {
    // number
    case filters.GreaterThanTypeId:
    case filters.GreaterThanOrEqualToTypeId:
      return numberConstraints({ min: jsonSchema.exclusiveMinimum ?? jsonSchema.minimum })
    case filters.LessThanTypeId:
    case filters.LessThanOrEqualToTypeId:
      return numberConstraints({ max: jsonSchema.exclusiveMaximum ?? jsonSchema.maximum })
    case filters.IntTypeId:
      return integerConstraints({})
    case filters.BetweenTypeId: {
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
    // bigint
    case filters.GreaterThanBigintTypeId:
    case filters.GreaterThanOrEqualToBigintTypeId: {
      const params: any = ast.annotations[TypeAnnotationId]
      return bigintConstraints({ min: params.min })
    }
    case filters.LessThanBigintTypeId:
    case filters.LessThanOrEqualToBigintTypeId: {
      const params: any = ast.annotations[TypeAnnotationId]
      return bigintConstraints({ max: params.max })
    }
    case filters.BetweenBigintTypeId: {
      const params: any = ast.annotations[TypeAnnotationId]
      const min = params.min
      const max = params.max
      const constraints: BigIntConstraints["constraints"] = {}
      if (Predicate.isBigInt(min)) {
        constraints.min = min
      }
      if (Predicate.isBigInt(max)) {
        constraints.max = max
      }
      return bigintConstraints(constraints)
    }
    // string
    case filters.MinLengthTypeId:
      return stringConstraints({ minLength: jsonSchema.minLength })
    case filters.MaxLengthTypeId:
      return stringConstraints({ maxLength: jsonSchema.maxLength })
    case filters.LengthTypeId:
      return stringConstraints({ minLength: jsonSchema.minLength, maxLength: jsonSchema.maxLength })
    // array
    case filters.MinItemsTypeId:
      return arrayConstraints({ minLength: jsonSchema.minItems })
    case filters.MaxItemsTypeId:
      return arrayConstraints({ maxLength: jsonSchema.maxItems })
    case filters.ItemsCountTypeId:
      return arrayConstraints({ minLength: jsonSchema.minItems, maxLength: jsonSchema.maxItems })
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
    case "ArrayConstraints": {
      switch (c2._tag) {
        case "ArrayConstraints": {
          const c: ArrayConstraints["constraints"] = {
            ...c1.constraints,
            ...c2.constraints
          }
          const minLength = getMax(c1.constraints.minLength, c2.constraints.minLength)
          if (Predicate.isNumber(minLength)) {
            c.minLength = minLength
          }
          const maxLength = getMin(c1.constraints.maxLength, c2.constraints.maxLength)
          if (Predicate.isNumber(maxLength)) {
            c.maxLength = maxLength
          }
          return arrayConstraints(c)
        }
      }
      break
    }
    case "NumberConstraints": {
      switch (c2._tag) {
        case "NumberConstraints": {
          const c: NumberConstraints["constraints"] = {
            ...c1.constraints,
            ...c2.constraints
          }
          const min = getMax(c1.constraints.min, c2.constraints.min)
          if (Predicate.isNumber(min)) {
            c.min = min
          }
          const max = getMin(c1.constraints.max, c2.constraints.max)
          if (Predicate.isNumber(max)) {
            c.max = max
          }
          return numberConstraints(c)
        }
        case "IntegerConstraints": {
          const c: IntegerConstraints["constraints"] = { ...c2.constraints }
          const min = getMax(c1.constraints.min, c2.constraints.min)
          if (Predicate.isNumber(min)) {
            c.min = min
          }
          const max = getMin(c1.constraints.max, c2.constraints.max)
          if (Predicate.isNumber(max)) {
            c.max = max
          }
          return integerConstraints(c)
        }
      }
      break
    }
    case "BigIntConstraints": {
      switch (c2._tag) {
        case "BigIntConstraints": {
          const c: BigIntConstraints["constraints"] = {
            ...c1.constraints,
            ...c2.constraints
          }
          const min = getMax(c1.constraints.min, c2.constraints.min)
          if (Predicate.isBigInt(min)) {
            c.min = min
          }
          const max = getMin(c1.constraints.max, c2.constraints.max)
          if (Predicate.isBigInt(max)) {
            c.max = max
          }
          return bigintConstraints(c)
        }
      }
      break
    }
    case "StringConstraints": {
      switch (c2._tag) {
        case "StringConstraints": {
          const c: StringConstraints["constraints"] = {
            ...c1.constraints,
            ...c2.constraints
          }
          const minLength = getMax(c1.constraints.minLength, c2.constraints.minLength)
          if (Predicate.isNumber(minLength)) {
            c.minLength = minLength
          }
          const maxLength = getMin(c1.constraints.maxLength, c2.constraints.maxLength)
          if (Predicate.isNumber(maxLength)) {
            c.maxLength = maxLength
          }
          return stringConstraints(c)
        }
      }
      break
    }
    case "IntegerConstraints": {
      switch (c2._tag) {
        case "NumberConstraints":
        case "IntegerConstraints": {
          const c: IntegerConstraints["constraints"] = { ...c1.constraints }
          const min = getMax(c1.constraints.min, c2.constraints.min)
          if (Predicate.isNumber(min)) {
            c.min = min
          }
          const max = getMin(c1.constraints.max, c2.constraints.max)
          if (Predicate.isNumber(max)) {
            c.max = max
          }
          return integerConstraints(c)
        }
      }
      break
    }
  }
}

function getMax(n1: bigint | undefined, n2: bigint | undefined): bigint | undefined
function getMax(n1: number | undefined, n2: number | undefined): number | undefined
function getMax(
  n1: bigint | number | undefined,
  n2: bigint | number | undefined
): bigint | number | undefined {
  return n1 === undefined ? n2 : n2 === undefined ? n1 : n1 <= n2 ? n2 : n1
}

function getMin(n1: bigint | undefined, n2: bigint | undefined): bigint | undefined
function getMin(n1: number | undefined, n2: number | undefined): number | undefined
function getMin(
  n1: bigint | number | undefined,
  n2: bigint | number | undefined
): bigint | number | undefined {
  return n1 === undefined ? n2 : n2 === undefined ? n1 : n1 <= n2 ? n1 : n2
}
