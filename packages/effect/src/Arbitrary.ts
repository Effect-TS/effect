/**
 * @since 3.10.0
 */

import * as Arr from "./Array.js"
import * as FastCheck from "./FastCheck.js"
import * as errors_ from "./internal/schema/errors.js"
import * as filters_ from "./internal/schema/filters.js"
import * as util_ from "./internal/schema/util.js"
import * as Option from "./Option.js"
import * as Predicate from "./Predicate.js"
import type * as Schema from "./Schema.js"
import * as AST from "./SchemaAST.js"

/**
 * @category model
 * @since 3.10.0
 */
export interface LazyArbitrary<A> {
  (fc: typeof FastCheck): FastCheck.Arbitrary<A>
}

/**
 * @category annotations
 * @since 3.10.0
 */
export interface ArbitraryGenerationContext {
  readonly depthIdentifier?: string
  readonly maxDepth: number
}

/**
 * @category annotations
 * @since 3.10.0
 */
export type ArbitraryAnnotation<A, TypeParameters extends ReadonlyArray<any> = readonly []> = (
  ...arbitraries: [
    ...{ readonly [K in keyof TypeParameters]: LazyArbitrary<TypeParameters[K]> },
    ctx: ArbitraryGenerationContext
  ]
) => LazyArbitrary<A>

/**
 * Returns a LazyArbitrary for the `A` type of the provided schema.
 *
 * @category arbitrary
 * @since 3.10.0
 */
export const makeLazy = <A, I, R>(schema: Schema.Schema<A, I, R>): LazyArbitrary<A> =>
  go(schema.ast, { maxDepth: 2 }, [])

/**
 * Returns a fast-check Arbitrary for the `A` type of the provided schema.
 *
 * @category arbitrary
 * @since 3.10.0
 */
export const make = <A, I, R>(schema: Schema.Schema<A, I, R>): FastCheck.Arbitrary<A> => makeLazy(schema)(FastCheck)

const getArbitraryAnnotation = AST.getAnnotation<ArbitraryAnnotation<any, any>>(AST.ArbitraryAnnotationId)

type Op = Succeed | Suspend

class Succeed {
  readonly _tag = "Succeed"
  constructor(
    readonly arb: LazyArbitrary<any>,
    readonly filters: Array<Predicate.Predicate<any>> = []
  ) {}

  toLazyArbitrary(): LazyArbitrary<any> {
    return (fc) => {
      let out = this.arb(fc)
      for (const f of this.filters) {
        out = out.filter(f)
      }
      return out
    }
  }
}

class Suspend {
  readonly _tag = "Suspend"
  constructor(
    readonly config: Config,
    readonly filters: Array<Predicate.Predicate<any>> = []
  ) {}

  toLazyArbitrary(ctx: ArbitraryGenerationContext, path: ReadonlyArray<PropertyKey>): LazyArbitrary<any> {
    const config = this.config
    switch (config._tag) {
      case "String": {
        return (fc) => fc.string(config.constraints)
      }
      case "Number": {
        return config.isInteger ?
          (fc) => fc.integer(config.constraints) :
          (fc) => fc.float(config.constraints)
      }
      case "BigInt":
        return (fc) => fc.bigInt(config.constraints)
      case "Array":
        return goTupleType(config.ast, ctx, path, config.constraints)
    }
  }
}

/** @internal */
export class StringConfig {
  readonly _tag = "String"
  readonly constraints: FastCheck.StringSharedConstraints
  readonly pattern?: string
  constructor(
    options: {
      readonly minLength?: number | undefined
      readonly maxLength?: number | undefined
      readonly pattern?: string | undefined
    }
  ) {
    this.constraints = {}
    if (Predicate.isNumber(options.minLength)) {
      this.constraints.minLength = options.minLength
    }
    if (Predicate.isNumber(options.maxLength)) {
      this.constraints.maxLength = options.maxLength
    }
    if (Predicate.isString(options.pattern)) {
      this.pattern = options.pattern
    }
  }
}

/** @internal */
export class NumberConfig {
  readonly _tag = "Number"
  readonly constraints: FastCheck.FloatConstraints
  readonly isInteger: boolean
  constructor(
    options: {
      readonly isInteger?: boolean
      readonly min?: number | undefined
      readonly minExcluded?: boolean | undefined
      readonly max?: number | undefined
      readonly maxExcluded?: boolean | undefined
      readonly noNaN?: boolean | undefined
      readonly noDefaultInfinity?: boolean | undefined
    }
  ) {
    this.constraints = {}
    this.isInteger = options.isInteger ?? false
    if (Predicate.isNumber(options.min)) {
      this.constraints.min = Math.fround(options.min)
    }
    if (Predicate.isBoolean(options.minExcluded)) {
      this.constraints.minExcluded = options.minExcluded
    }
    if (Predicate.isNumber(options.max)) {
      this.constraints.max = Math.fround(options.max)
    }
    if (Predicate.isBoolean(options.maxExcluded)) {
      this.constraints.maxExcluded = options.maxExcluded
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
export class BigIntConfig {
  readonly _tag = "BigInt"
  readonly constraints: FastCheck.BigIntConstraints
  constructor(
    options: {
      readonly min?: bigint | undefined
      readonly max?: bigint | undefined
    }
  ) {
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
export class ArrayConstraints {
  readonly _tag = "Array"
  readonly constraints: FastCheck.ArrayConstraints
  constructor(
    options: {
      readonly minLength?: number | undefined
      readonly maxLength?: number | undefined
    }
  ) {
    this.constraints = {}
    if (Predicate.isNumber(options.minLength)) {
      this.constraints.minLength = options.minLength
    }
    if (Predicate.isNumber(options.maxLength)) {
      this.constraints.maxLength = options.maxLength
    }
  }
}

class ArrayConfig extends ArrayConstraints {
  constructor(
    options: {
      readonly minLength?: number | undefined
      readonly maxLength?: number | undefined
    },
    readonly ast: AST.TupleType
  ) {
    super(options)
  }
}

type Config = StringConfig | NumberConfig | BigIntConfig | ArrayConfig

const go = (
  ast: AST.AST,
  ctx: ArbitraryGenerationContext,
  path: ReadonlyArray<PropertyKey>
): LazyArbitrary<any> => {
  const hook = getArbitraryAnnotation(ast)
  if (Option.isSome(hook)) {
    switch (ast._tag) {
      case "Declaration":
        return hook.value(...ast.typeParameters.map((p) => go(p, ctx, path)), ctx)
      case "Refinement": {
        const { filters } = toOp(ast, ctx, path)
        return new Succeed(hook.value(ctx), filters).toLazyArbitrary()
      }
      default:
        return hook.value(ctx)
    }
  }
  const op = toOp(ast, ctx, path)
  switch (op._tag) {
    case "Succeed":
      return op.toLazyArbitrary()
    case "Suspend":
      return new Succeed(op.toLazyArbitrary(ctx, path), op.filters).toLazyArbitrary()
  }
}

/** @internal */
export const toOp = (
  ast: AST.AST,
  ctx: ArbitraryGenerationContext,
  path: ReadonlyArray<PropertyKey>
): Op => {
  switch (ast._tag) {
    case "Declaration":
      throw new Error(errors_.getArbitraryMissingAnnotationErrorMessage(path, ast))
    case "Literal":
      return new Succeed((fc) => fc.constant(ast.literal))
    case "UniqueSymbol":
      return new Succeed((fc) => fc.constant(ast.symbol))
    case "UndefinedKeyword":
      return new Succeed((fc) => fc.constant(undefined))
    case "NeverKeyword":
      throw new Error(errors_.getArbitraryMissingAnnotationErrorMessage(path, ast))
    case "VoidKeyword":
    case "UnknownKeyword":
    case "AnyKeyword":
      return new Succeed((fc) => fc.anything())
    case "StringKeyword":
      return new Suspend(new StringConfig({}))
    case "NumberKeyword":
      return new Suspend(new NumberConfig({}))
    case "BooleanKeyword":
      return new Succeed((fc) => fc.boolean())
    case "BigIntKeyword":
      return new Suspend(new BigIntConfig({}))
    case "SymbolKeyword":
      return new Succeed((fc) => fc.string().map((s) => Symbol.for(s)))
    case "ObjectKeyword":
      return new Succeed((fc) => fc.oneof(fc.object(), fc.array(fc.anything())))
    case "Enums": {
      if (ast.enums.length === 0) {
        throw new Error(errors_.getArbitraryEmptyEnumErrorMessage(path))
      }
      return new Succeed((fc) => fc.oneof(...ast.enums.map(([_, value]) => fc.constant(value))))
    }
    case "TemplateLiteral":
      return new Succeed((fc) => {
        const string = fc.string({ maxLength: 5 })
        const number = fc.float({ noDefaultInfinity: true }).filter((n) => !Number.isNaN(n))

        const components: Array<FastCheck.Arbitrary<string | number>> = ast.head !== "" ? [fc.constant(ast.head)] : []

        const addArb = (ast: AST.TemplateLiteralSpan["type"]) => {
          switch (ast._tag) {
            case "StringKeyword":
              return components.push(string)
            case "NumberKeyword":
              return components.push(number)
            case "Literal":
              return components.push(fc.constant(String(ast.literal)))
            case "Union":
              return ast.types.forEach(addArb)
          }
        }

        ast.spans.forEach((span) => {
          addArb(span.type)
          if (span.literal !== "") {
            components.push(fc.constant(span.literal))
          }
        })

        return fc.tuple(...components).map((spans) => spans.join(""))
      })
    case "Refinement": {
      const from = toOp(ast.from, ctx, path)
      const filters: Op["filters"] = [
        ...from.filters,
        (a) => Option.isNone(ast.filter(a, AST.defaultParseOption, ast))
      ]
      switch (from._tag) {
        case "Succeed": {
          return new Succeed(from.arb, filters)
        }
        case "Suspend": {
          return new Suspend(merge(from.config, getConstraints(from.config._tag, ast)), filters)
        }
      }
    }
    case "TupleType":
      return new Suspend(new ArrayConfig({}, ast))
    case "TypeLiteral": {
      const propertySignaturesTypes = ast.propertySignatures.map((ps) => go(ps.type, ctx, path.concat(ps.name)))
      const indexSignatures = ast.indexSignatures.map((is) =>
        [go(is.parameter, ctx, path), go(is.type, ctx, path)] as const
      )
      return new Succeed((fc) => {
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
          const key = indexSignatures[i][0](fc)
          const value = indexSignatures[i][1](fc)
          output = output.chain((o) => {
            const item = fc.tuple(key, value)
            const arr = ctx.depthIdentifier !== undefined ?
              getSuspendedArray(fc, ctx.depthIdentifier, ctx.maxDepth, item) :
              fc.array(item)
            return arr.map((tuples) => ({ ...Object.fromEntries(tuples), ...o }))
          })
        }

        return output
      })
    }
    case "Union": {
      const types = ast.types.map((member) => go(member, ctx, path))
      return new Succeed((fc) => fc.oneof(...types.map((arb) => arb(fc))))
    }
    case "Suspend": {
      const get = util_.memoizeThunk(() => {
        return go(ast.f(), getSuspendedContext(ctx, ast), path)
      })
      return new Succeed((fc) => fc.constant(null).chain(() => get()(fc)))
    }
    case "Transformation":
      return toOp(ast.to, ctx, path)
  }
}

const goTupleType = (
  ast: AST.TupleType,
  ctx: ArbitraryGenerationContext,
  path: ReadonlyArray<PropertyKey>,
  constraints: FastCheck.ArrayConstraints
): LazyArbitrary<any> => {
  const elements: Array<LazyArbitrary<any>> = []
  let hasOptionals = false
  let i = 0
  for (const element of ast.elements) {
    elements.push(go(element.type, ctx, path.concat(i++)))
    if (element.isOptional) {
      hasOptionals = true
    }
  }
  const rest = ast.rest.map((annotatedAST) => go(annotatedAST.type, ctx, path))
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
      const item = head(fc)
      output = output.chain((as) => {
        return (ctx.depthIdentifier !== undefined
          ? getSuspendedArray(fc, ctx.depthIdentifier, ctx.maxDepth, item, constraints)
          : fc.array(item, constraints)).map((rest) => [...as, ...rest])
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

/** @internal */
export type Constraints = StringConfig | NumberConfig | BigIntConfig | ArrayConstraints

const getConstraints = (_tag: Constraints["_tag"], ast: AST.Refinement): Constraints | undefined => {
  const TypeAnnotationId: any = ast.annotations[AST.SchemaIdAnnotationId]
  const jsonSchema: Record<string, any> = Option.getOrElse(AST.getJSONSchemaAnnotation(ast), () => ({}))

  switch (_tag) {
    case "String":
      return new StringConfig(jsonSchema)
    case "Number": {
      switch (TypeAnnotationId) {
        case filters_.IntSchemaId:
          return new NumberConfig({ isInteger: true })
        case filters_.NonNaNSchemaId:
          return new NumberConfig({ noNaN: true })
        default:
          return new NumberConfig({
            noNaN: "type" in jsonSchema && jsonSchema.type === "number" ? true : undefined,
            noDefaultInfinity: "type" in jsonSchema && jsonSchema.type === "number" ? true : undefined,
            min: jsonSchema.exclusiveMinimum ?? jsonSchema.minimum,
            minExcluded: "exclusiveMinimum" in jsonSchema ? true : undefined,
            max: jsonSchema.exclusiveMaximum ?? jsonSchema.maximum,
            maxExcluded: "exclusiveMaximum" in jsonSchema ? true : undefined
          })
      }
    }
    case "BigInt":
      return new BigIntConfig(ast.annotations[TypeAnnotationId] as any)
    case "Array":
      return new ArrayConstraints({
        minLength: jsonSchema.minItems,
        maxLength: jsonSchema.maxItems
      })
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

const getOr = (a: boolean | undefined, b: boolean | undefined): boolean | undefined => {
  return a === undefined ? b : b === undefined ? a : a || b
}

const merge = (c1: Config, c2: Constraints | undefined): Config => {
  if (c2) {
    if (c1._tag === "Array" && c2._tag === "Array") {
      return new ArrayConfig({
        minLength: getMax(c1.constraints.minLength, c2.constraints.minLength),
        maxLength: getMin(c1.constraints.maxLength, c2.constraints.maxLength)
      }, c1.ast)
    }
    if (c1._tag === "String" && c2._tag === "String") {
      return new StringConfig({
        minLength: getMax(c1.constraints.minLength, c2.constraints.minLength),
        maxLength: getMin(c1.constraints.maxLength, c2.constraints.maxLength),
        pattern: c1.pattern ?? c2.pattern
      })
    }
    if (c1._tag === "Number" && c2._tag === "Number") {
      return new NumberConfig({
        isInteger: c1.isInteger || c2.isInteger,
        min: getMax(c1.constraints.min, c2.constraints.min),
        minExcluded: getOr(c1.constraints.minExcluded, c2.constraints.minExcluded),
        max: getMin(c1.constraints.max, c2.constraints.max),
        maxExcluded: getOr(c1.constraints.maxExcluded, c2.constraints.maxExcluded),
        noNaN: getOr(c1.constraints.noNaN, c2.constraints.noNaN),
        noDefaultInfinity: getOr(c1.constraints.noDefaultInfinity, c2.constraints.noDefaultInfinity)
      })
    }
    if (c1._tag === "BigInt" && c2._tag === "BigInt") {
      return new BigIntConfig({
        min: getMax(c1.constraints.min, c2.constraints.min),
        max: getMin(c1.constraints.max, c2.constraints.max)
      })
    }
  }
  return c1
}

const getSuspendedArray = (
  fc: typeof FastCheck,
  depthIdentifier: string,
  maxDepth: number,
  item: FastCheck.Arbitrary<any>,
  constraints?: FastCheck.ArrayConstraints
) => {
  let minLength = 1
  let maxLength = 2
  if (constraints && constraints.minLength !== undefined && constraints.minLength > minLength) {
    minLength = constraints.minLength
    if (minLength > maxLength) {
      maxLength = minLength
    }
  }
  return fc.oneof(
    { maxDepth, depthIdentifier },
    fc.constant([]),
    fc.array(item, { minLength, maxLength })
  )
}

const getSuspendedContext = (
  ctx: ArbitraryGenerationContext,
  ast: AST.Suspend
): ArbitraryGenerationContext => {
  if (ctx.depthIdentifier !== undefined) {
    return ctx
  }
  const depthIdentifier = AST.getIdentifierAnnotation(ast).pipe(
    Option.orElse(() => AST.getIdentifierAnnotation(ast.f())),
    Option.getOrElse(() => "SuspendDefaultDepthIdentifier")
  )
  return { ...ctx, depthIdentifier }
}
