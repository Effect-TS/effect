/**
 * @since 0.67.0
 */

import * as Arr from "effect/Array"
import * as Option from "effect/Option"
import * as Predicate from "effect/Predicate"
import * as AST from "./AST.js"
import * as FastCheck from "./FastCheck.js"
import * as errors_ from "./internal/errors.js"
import * as filters_ from "./internal/filters.js"
import * as util_ from "./internal/util.js"
import type * as Schema from "./Schema.js"

/**
 * @category model
 * @since 0.67.0
 */
export interface LazyArbitrary<A> {
  (fc: typeof FastCheck): FastCheck.Arbitrary<A>
}

/**
 * @category hooks
 * @since 0.67.0
 */
export const ArbitraryHookId: unique symbol = Symbol.for("@effect/schema/ArbitraryHookId")

/**
 * @category hooks
 * @since 0.67.0
 */
export type ArbitraryHookId = typeof ArbitraryHookId

/**
 * @category annotations
 * @since 0.67.0
 */
export const arbitrary =
  <A>(handler: (...args: ReadonlyArray<LazyArbitrary<any>>) => LazyArbitrary<A>) =>
  <I, R>(self: Schema.Schema<A, I, R>): Schema.Schema<A, I, R> => self.annotations({ [ArbitraryHookId]: handler })

/**
 * Returns a LazyArbitrary for the `A` type of the provided schema.
 *
 * @category arbitrary
 * @since 0.67.0
 */
export const makeLazy = <A, I, R>(schema: Schema.Schema<A, I, R>): LazyArbitrary<A> => go(schema.ast, {}, [])

/**
 * Returns a fast-check Arbitrary for the `A` type of the provided schema.
 *
 * @category arbitrary
 * @since 0.67.0
 */
export const make = <A, I, R>(schema: Schema.Schema<A, I, R>): FastCheck.Arbitrary<A> => makeLazy(schema)(FastCheck)

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
  (...args: ReadonlyArray<LazyArbitrary<any>>) => LazyArbitrary<any>
>(ArbitraryHookId)

type Options = {
  readonly constraints?: Constraints
  readonly isSuspend?: boolean
}

const getRefinementFromArbitrary = (ast: AST.Refinement, options: Options, path: ReadonlyArray<PropertyKey>) => {
  const constraints = combineConstraints(options.constraints, getConstraints(ast))
  return go(ast.from, constraints ? { ...options, constraints } : options, path)
}

const go = (ast: AST.AST, options: Options, path: ReadonlyArray<PropertyKey>): LazyArbitrary<any> => {
  const hook = getHook(ast)
  if (Option.isSome(hook)) {
    switch (ast._tag) {
      case "Declaration":
        return hook.value(...ast.typeParameters.map((p) => go(p, options, path)))
      case "Refinement":
        return hook.value(getRefinementFromArbitrary(ast, options, path))
      default:
        return hook.value()
    }
  }
  switch (ast._tag) {
    case "Declaration": {
      throw new Error(errors_.getArbitraryMissingAnnotationErrorMessage(path, ast))
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
        throw new Error(errors_.getArbitraryUnsupportedErrorMessage(path, ast))
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
    case "TupleType": {
      const elements: Array<LazyArbitrary<any>> = []
      let hasOptionals = false
      let i = 0
      for (const element of ast.elements) {
        elements.push(go(element.type, options, path.concat(i++)))
        if (element.isOptional) {
          hasOptionals = true
        }
      }
      const rest = ast.rest.map((annotatedAST) => go(annotatedAST.type, options, path))
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
        if (Arr.isNonEmptyReadonlyArray(rest)) {
          const [head, ...tail] = rest
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
      const propertySignaturesTypes = ast.propertySignatures.map((ps) => go(ps.type, options, path.concat(ps.name)))
      const indexSignatures = ast.indexSignatures.map((is) =>
        [go(is.parameter, options, path), go(is.type, options, path)] as const
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
      const types = ast.types.map((t) => go(t, options, path))
      return (fc) => fc.oneof({ depthSize }, ...types.map((arb) => arb(fc)))
    }
    case "Enums": {
      if (ast.enums.length === 0) {
        throw new Error(errors_.getArbitraryEmptyEnumErrorMessage(path))
      }
      return (fc) => fc.oneof(...ast.enums.map(([_, value]) => fc.constant(value)))
    }
    case "Refinement": {
      const from = getRefinementFromArbitrary(ast, options, path)
      return (fc) => from(fc).filter((a) => Option.isNone(ast.filter(a, AST.defaultParseOption, ast)))
    }
    case "Suspend": {
      const get = util_.memoizeThunk(() => go(ast.f(), { ...options, isSuspend: true }, path))
      return (fc) => fc.constant(null).chain(() => get()(fc))
    }
    case "Transformation":
      return go(ast.to, options, path)
  }
}

/** @internal */
export class NumberConstraints {
  readonly _tag = "NumberConstraints"
  readonly constraints: FastCheck.FloatConstraints
  constructor(options: {
    readonly min?: number | undefined
    readonly max?: number | undefined
    readonly noNaN?: boolean | undefined
    readonly noDefaultInfinity?: boolean | undefined
  }) {
    this.constraints = {}
    if (Predicate.isNumber(options.min)) {
      this.constraints.min = Math.fround(options.min)
    }
    if (Predicate.isNumber(options.max)) {
      this.constraints.max = Math.fround(options.max)
    }
    if (Predicate.isBoolean(options.noNaN)) {
      this.constraints.noNaN = options.noNaN
    }
    if (Predicate.isBoolean(options.noDefaultInfinity)) {
      this.constraints.noDefaultInfinity = options.noDefaultInfinity
    }
  }
}

/** @internal */
export class StringConstraints {
  readonly _tag = "StringConstraints"
  readonly constraints: FastCheck.StringSharedConstraints
  constructor(options: {
    readonly minLength?: number | undefined
    readonly maxLength?: number | undefined
  }) {
    this.constraints = {}
    if (Predicate.isNumber(options.minLength)) {
      this.constraints.minLength = options.minLength
    }
    if (Predicate.isNumber(options.maxLength)) {
      this.constraints.maxLength = options.maxLength
    }
  }
}

/** @internal */
export class IntegerConstraints {
  readonly _tag = "IntegerConstraints"
  readonly constraints: FastCheck.IntegerConstraints
  constructor(options: {
    readonly min?: number | undefined
    readonly max?: number | undefined
  }) {
    this.constraints = {}
    if (Predicate.isNumber(options.min)) {
      this.constraints.min = options.min
    }
    if (Predicate.isNumber(options.max)) {
      this.constraints.max = options.max
    }
  }
}

/** @internal */
export class ArrayConstraints {
  readonly _tag = "ArrayConstraints"
  readonly constraints: FastCheck.ArrayConstraints
  constructor(options: {
    readonly minLength?: number | undefined
    readonly maxLength?: number | undefined
  }) {
    this.constraints = {}
    if (Predicate.isNumber(options.minLength)) {
      this.constraints.minLength = options.minLength
    }
    if (Predicate.isNumber(options.maxLength)) {
      this.constraints.maxLength = options.maxLength
    }
  }
}

/** @internal */
export class BigIntConstraints {
  readonly _tag = "BigIntConstraints"
  readonly constraints: FastCheck.BigIntConstraints
  constructor(options: {
    readonly min?: bigint | undefined
    readonly max?: bigint | undefined
  }) {
    this.constraints = {}
    if (Predicate.isBigInt(options.min)) {
      this.constraints.min = options.min
    }
    if (Predicate.isBigInt(options.max)) {
      this.constraints.max = options.max
    }
  }
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
    // int
    case filters_.IntTypeId:
      return new IntegerConstraints({})
    // number
    case filters_.GreaterThanTypeId:
    case filters_.GreaterThanOrEqualToTypeId:
    case filters_.LessThanTypeId:
    case filters_.LessThanOrEqualToTypeId:
    case filters_.BetweenTypeId:
      return new NumberConstraints({
        min: jsonSchema.exclusiveMinimum ?? jsonSchema.minimum,
        max: jsonSchema.exclusiveMaximum ?? jsonSchema.maximum
      })
    // bigint
    case filters_.GreaterThanBigintTypeId:
    case filters_.GreaterThanOrEqualToBigIntTypeId:
    case filters_.LessThanBigIntTypeId:
    case filters_.LessThanOrEqualToBigIntTypeId:
    case filters_.BetweenBigintTypeId: {
      const constraints: any = ast.annotations[TypeAnnotationId]
      return new BigIntConstraints(constraints)
    }
    // string
    case filters_.MinLengthTypeId:
    case filters_.MaxLengthTypeId:
    case filters_.LengthTypeId:
      return new StringConstraints(jsonSchema)
    // array
    case filters_.MinItemsTypeId:
    case filters_.MaxItemsTypeId:
    case filters_.ItemsCountTypeId:
      return new ArrayConstraints({
        minLength: jsonSchema.minItems,
        maxLength: jsonSchema.maxItems
      })
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
        case "ArrayConstraints":
          return new ArrayConstraints({
            minLength: getMax(c1.constraints.minLength, c2.constraints.minLength),
            maxLength: getMin(c1.constraints.maxLength, c2.constraints.maxLength)
          })
      }
      break
    }
    case "NumberConstraints": {
      switch (c2._tag) {
        case "NumberConstraints":
          return new NumberConstraints({
            min: getMax(c1.constraints.min, c2.constraints.min),
            max: getMin(c1.constraints.max, c2.constraints.max),
            noNaN: getOr(c1.constraints.noNaN, c2.constraints.noNaN),
            noDefaultInfinity: getOr(c1.constraints.noDefaultInfinity, c2.constraints.noDefaultInfinity)
          })
        case "IntegerConstraints":
          return new IntegerConstraints({
            min: getMax(c1.constraints.min, c2.constraints.min),
            max: getMin(c1.constraints.max, c2.constraints.max)
          })
      }
      break
    }
    case "BigIntConstraints": {
      switch (c2._tag) {
        case "BigIntConstraints":
          return new BigIntConstraints({
            min: getMax(c1.constraints.min, c2.constraints.min),
            max: getMin(c1.constraints.max, c2.constraints.max)
          })
      }
      break
    }
    case "StringConstraints": {
      switch (c2._tag) {
        case "StringConstraints":
          return new StringConstraints({
            minLength: getMax(c1.constraints.minLength, c2.constraints.minLength),
            maxLength: getMin(c1.constraints.maxLength, c2.constraints.maxLength)
          })
      }
      break
    }
    case "IntegerConstraints": {
      switch (c2._tag) {
        case "NumberConstraints":
        case "IntegerConstraints": {
          return new IntegerConstraints({
            min: getMax(c1.constraints.min, c2.constraints.min),
            max: getMin(c1.constraints.max, c2.constraints.max)
          })
        }
      }
      break
    }
  }
}

const getOr = (a: boolean | undefined, b: boolean | undefined): boolean | undefined => {
  return a === undefined ? b : b === undefined ? a : a || b
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
