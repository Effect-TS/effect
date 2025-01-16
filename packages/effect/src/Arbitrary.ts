/**
 * @since 3.10.0
 */

import * as Arr from "./Array.js"
import * as FastCheck from "./FastCheck.js"
import { globalValue } from "./GlobalValue.js"
import * as errors_ from "./internal/schema/errors.js"
import * as schemaId_ from "./internal/schema/schemaId.js"
import * as util_ from "./internal/schema/util.js"
import * as Option from "./Option.js"
import * as Predicate from "./Predicate.js"
import type * as Schema from "./Schema.js"
import * as AST from "./SchemaAST.js"
import type * as Types from "./Types.js"

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
  readonly maxDepth: number
  readonly depthIdentifier?: string
  readonly constraints?: StringConstraints | NumberConstraints | BigIntConstraints | DateConstraints | ArrayConstraints
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

type Op = Succeed | Deferred

/**
 * Represents an arbitrary with optional filters.
 */
class Succeed {
  readonly _tag = "Succeed"
  constructor(
    readonly lazyArbitrary: LazyArbitrary<any>,
    readonly filters: Array<Predicate.Predicate<any>> = []
  ) {}

  toLazyArbitrary(): LazyArbitrary<any> {
    return (fc) => {
      let out = this.lazyArbitrary(fc)
      for (const f of this.filters) {
        out = out.filter(f)
      }
      return out
    }
  }
}

/**
 * Represents a deferred arbitrary value generator with optional filters.
 */
class Deferred {
  readonly _tag = "Deferred"
  constructor(
    readonly config: Config,
    readonly filters: Array<Predicate.Predicate<any>> = []
  ) {}

  toLazyArbitrary(ctx: ArbitraryGenerationContext, path: ReadonlyArray<PropertyKey>): LazyArbitrary<any> {
    const config = this.config
    switch (config._tag) {
      case "StringConstraints": {
        const pattern = config.pattern
        return pattern !== undefined ?
          (fc) => fc.stringMatching(new RegExp(pattern)) :
          (fc) => fc.string(config.constraints)
      }
      case "NumberConstraints": {
        return config.isInteger ?
          (fc) => fc.integer(config.constraints) :
          (fc) => fc.float(config.constraints)
      }
      case "BigIntConstraints":
        return (fc) => fc.bigInt(config.constraints)
      case "DateConstraints":
        return (fc) => fc.date(config.constraints)
      case "ArrayConstraints":
        return goTupleType(config.ast, ctx, path, config.constraints)
    }
  }
}

interface StringConstraints {
  readonly _tag: "StringConstraints"
  readonly constraints: FastCheck.StringSharedConstraints
  readonly pattern?: string
}

/** @internal */
export const makeStringConstraints = (options: {
  readonly minLength?: number | undefined
  readonly maxLength?: number | undefined
  readonly pattern?: string | undefined
}): StringConstraints => {
  const out: Types.Mutable<StringConstraints> = {
    _tag: "StringConstraints",
    constraints: {}
  }
  if (Predicate.isNumber(options.minLength)) {
    out.constraints.minLength = options.minLength
  }
  if (Predicate.isNumber(options.maxLength)) {
    out.constraints.maxLength = options.maxLength
  }
  if (Predicate.isString(options.pattern)) {
    out.pattern = options.pattern
  }
  return out
}

interface NumberConstraints {
  readonly _tag: "NumberConstraints"
  readonly constraints: FastCheck.FloatConstraints
  readonly isInteger: boolean
}

/** @internal */
export const makeNumberConstraints = (options: {
  readonly isInteger?: boolean | undefined
  readonly min?: number | undefined
  readonly minExcluded?: boolean | undefined
  readonly max?: number | undefined
  readonly maxExcluded?: boolean | undefined
  readonly noNaN?: boolean | undefined
  readonly noDefaultInfinity?: boolean | undefined
}): NumberConstraints => {
  const out: Types.Mutable<NumberConstraints> = {
    _tag: "NumberConstraints",
    constraints: {},
    isInteger: options.isInteger ?? false
  }
  if (Predicate.isNumber(options.min)) {
    out.constraints.min = Math.fround(options.min)
  }
  if (Predicate.isBoolean(options.minExcluded)) {
    out.constraints.minExcluded = options.minExcluded
  }
  if (Predicate.isNumber(options.max)) {
    out.constraints.max = Math.fround(options.max)
  }
  if (Predicate.isBoolean(options.maxExcluded)) {
    out.constraints.maxExcluded = options.maxExcluded
  }
  if (Predicate.isBoolean(options.noNaN)) {
    out.constraints.noNaN = options.noNaN
  }
  if (Predicate.isBoolean(options.noDefaultInfinity)) {
    out.constraints.noDefaultInfinity = options.noDefaultInfinity
  }
  return out
}

interface BigIntConstraints {
  readonly _tag: "BigIntConstraints"
  readonly constraints: FastCheck.BigIntConstraints
}

/** @internal */
export const makeBigIntConstraints = (options: {
  readonly min?: bigint | undefined
  readonly max?: bigint | undefined
}): BigIntConstraints => {
  const out: Types.Mutable<BigIntConstraints> = {
    _tag: "BigIntConstraints",
    constraints: {}
  }
  if (Predicate.isBigInt(options.min)) {
    out.constraints.min = options.min
  }
  if (Predicate.isBigInt(options.max)) {
    out.constraints.max = options.max
  }
  return out
}

interface ArrayConstraints {
  readonly _tag: "ArrayConstraints"
  readonly constraints: FastCheck.ArrayConstraints
}

/** @internal */
export const makeArrayConstraints = (options: {
  readonly minLength?: number | undefined
  readonly maxLength?: number | undefined
}): ArrayConstraints => {
  const out: Types.Mutable<ArrayConstraints> = {
    _tag: "ArrayConstraints",
    constraints: {}
  }
  if (Predicate.isNumber(options.minLength)) {
    out.constraints.minLength = options.minLength
  }
  if (Predicate.isNumber(options.maxLength)) {
    out.constraints.maxLength = options.maxLength
  }
  return out
}

interface DateConstraints {
  readonly _tag: "DateConstraints"
  readonly constraints: FastCheck.DateConstraints
}

/** @internal */
export const makeDateConstraints = (options: {
  readonly min?: Date | undefined
  readonly max?: Date | undefined
  readonly noInvalidDate?: boolean | undefined
}): DateConstraints => {
  const out: Types.Mutable<DateConstraints> = {
    _tag: "DateConstraints",
    constraints: {
      noInvalidDate: options.noInvalidDate ?? false
    }
  }
  if (Predicate.isDate(options.min)) {
    out.constraints.min = options.min
  }
  if (Predicate.isDate(options.max)) {
    out.constraints.max = options.max
  }
  return out
}

interface ArrayConfig extends ArrayConstraints {
  readonly ast: AST.TupleType
}

const makeArrayConfig = (options: {
  readonly minLength?: number | undefined
  readonly maxLength?: number | undefined
}, ast: AST.TupleType): ArrayConfig => {
  return {
    ast,
    ...makeArrayConstraints(options)
  }
}

type Config = StringConstraints | NumberConstraints | BigIntConstraints | DateConstraints | ArrayConfig

const arbitraryMemoMap = globalValue(
  Symbol.for("effect/Arbitrary/arbitraryMemoMap"),
  () => new WeakMap<AST.AST, LazyArbitrary<any>>()
)

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
        const op = toOp(ast, ctx, path)
        ctx = op._tag === "Deferred" ? { ...ctx, constraints: op.config } : ctx
        const from = go(ast.from, ctx, path)
        return new Succeed(hook.value(from, ctx), op.filters).toLazyArbitrary()
      }
      default:
        return hook.value(ctx)
    }
  }
  if (AST.isDeclaration(ast)) {
    throw new Error(errors_.getArbitraryMissingAnnotationErrorMessage(path, ast))
  }
  const op = toOp(ast, ctx, path)
  switch (op._tag) {
    case "Succeed":
      return op.toLazyArbitrary()
    case "Deferred":
      return new Succeed(op.toLazyArbitrary(ctx, path), op.filters).toLazyArbitrary()
  }
}

const constStringConstraints = makeStringConstraints({})
const constNumberConstraints = makeNumberConstraints({})
const constBigIntConstraints = makeBigIntConstraints({})
const defaultSuspendedArrayConstraints: FastCheck.ArrayConstraints = { maxLength: 2 }

/** @internal */
export const toOp = (
  ast: AST.AST,
  ctx: ArbitraryGenerationContext,
  path: ReadonlyArray<PropertyKey>
): Op => {
  switch (ast._tag) {
    case "Declaration": {
      const TypeAnnotationId: any = ast.annotations[AST.SchemaIdAnnotationId]
      switch (TypeAnnotationId) {
        case schemaId_.DateFromSelfSchemaId:
          return new Deferred(makeDateConstraints(ast.annotations[TypeAnnotationId] as any))
      }
      return new Succeed(go(ast, ctx, path))
    }
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
      return new Deferred(constStringConstraints)
    case "NumberKeyword":
      return new Deferred(constNumberConstraints)
    case "BooleanKeyword":
      return new Succeed((fc) => fc.boolean())
    case "BigIntKeyword":
      return new Deferred(constBigIntConstraints)
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
        const number = fc.float({ noDefaultInfinity: true, noNaN: true })

        const getTemplateLiteralArb = (ast: AST.TemplateLiteral) => {
          const components: Array<FastCheck.Arbitrary<string | number>> = ast.head !== "" ? [fc.constant(ast.head)] : []

          const getTemplateLiteralSpanTypeArb = (
            ast: AST.TemplateLiteralSpan["type"]
          ): FastCheck.Arbitrary<string | number> => {
            switch (ast._tag) {
              case "StringKeyword":
                return string
              case "NumberKeyword":
                return number
              case "Literal":
                return fc.constant(String(ast.literal))
              case "Union":
                return fc.oneof(...ast.types.map(getTemplateLiteralSpanTypeArb))
              case "TemplateLiteral":
                return getTemplateLiteralArb(ast)
            }
          }

          ast.spans.forEach((span) => {
            components.push(getTemplateLiteralSpanTypeArb(span.type))
            if (span.literal !== "") {
              components.push(fc.constant(span.literal))
            }
          })

          return fc.tuple(...components).map((spans) => spans.join(""))
        }

        return getTemplateLiteralArb(ast)
      })
    case "Refinement": {
      const from = toOp(ast.from, ctx, path)
      const filters: Op["filters"] = [
        ...from.filters,
        (a) => Option.isNone(ast.filter(a, AST.defaultParseOption, ast))
      ]
      switch (from._tag) {
        case "Succeed": {
          return new Succeed(from.lazyArbitrary, filters)
        }
        case "Deferred": {
          return new Deferred(merge(from.config, getConstraints(from.config._tag, ast)), filters)
        }
      }
    }
    case "TupleType":
      return new Deferred(makeArrayConfig({}, ast))
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
            /*

              `getSuspendedArray` is used to generate less key/value pairs in
              the context of a recursive schema. Without it, the following schema
              would generate an big amount of values possibly leading to a stack
              overflow:

              ```ts
              type A = { [_: string]: A }

              const schema = S.Record({ key: S.String, value: S.suspend((): S.Schema<A> => schema) })
              ```

            */
            const arr = ctx.depthIdentifier !== undefined ?
              getSuspendedArray(fc, ctx.depthIdentifier, ctx.maxDepth, item, defaultSuspendedArrayConstraints) :
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
      const memo = arbitraryMemoMap.get(ast)
      if (memo) {
        return new Succeed(memo)
      }
      const get = util_.memoizeThunk(() => {
        return go(ast.f(), getSuspendedContext(ctx, ast), path)
      })
      const out: LazyArbitrary<any> = (fc) => fc.constant(null).chain(() => get()(fc))
      arbitraryMemoMap.set(ast, out)
      return new Succeed(out)
    }
    case "Transformation":
      return toOp(ast.to, ctx, path)
  }
}

function subtractElementsLength(
  constraints: FastCheck.ArrayConstraints,
  elementsLength: number
): FastCheck.ArrayConstraints {
  if (elementsLength === 0 || (constraints.minLength === undefined && constraints.maxLength === undefined)) {
    return constraints
  }
  const out = { ...constraints }
  if (out.minLength !== undefined) {
    out.minLength = Math.max(out.minLength - elementsLength, 0)
  }
  if (out.maxLength !== undefined) {
    out.maxLength = Math.max(out.maxLength - elementsLength, 0)
  }
  return out
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
        const len = as.length
        // We must adjust the constraints for the rest element
        // because the elements might have generated some values
        const restArrayConstraints = subtractElementsLength(constraints, len)
        if (restArrayConstraints.maxLength === 0) {
          return fc.constant(as)
        }
        /*

          `getSuspendedArray` is used to generate less values in
          the context of a recursive schema. Without it, the following schema
          would generate an big amount of values possibly leading to a stack
          overflow:

          ```ts
          type A = ReadonlyArray<A | null>

          const schema = S.Array(
            S.NullOr(S.suspend((): S.Schema<A> => schema))
          )
          ```

        */
        const arr = ctx.depthIdentifier !== undefined
          ? getSuspendedArray(fc, ctx.depthIdentifier, ctx.maxDepth, item, restArrayConstraints)
          : fc.array(item, restArrayConstraints)
        if (len === 0) {
          return arr
        }
        return arr.map((rest) => [...as, ...rest])
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

type Constraints = StringConstraints | NumberConstraints | BigIntConstraints | DateConstraints | ArrayConstraints

const getConstraints = (_tag: Constraints["_tag"], ast: AST.Refinement): Constraints | undefined => {
  const TypeAnnotationId: any = ast.annotations[AST.SchemaIdAnnotationId]
  const jsonSchema: Record<string, any> = Option.getOrElse(AST.getJSONSchemaAnnotation(ast), () => ({}))

  switch (_tag) {
    case "StringConstraints":
      return makeStringConstraints(jsonSchema)
    case "NumberConstraints": {
      switch (TypeAnnotationId) {
        case schemaId_.NonNaNSchemaId:
          return makeNumberConstraints({ noNaN: true })
        default:
          return makeNumberConstraints({
            isInteger: "type" in jsonSchema && jsonSchema.type === "integer",
            noNaN: "type" in jsonSchema && jsonSchema.type === "number" ? true : undefined,
            noDefaultInfinity: "type" in jsonSchema && jsonSchema.type === "number" ? true : undefined,
            min: jsonSchema.exclusiveMinimum ?? jsonSchema.minimum,
            minExcluded: "exclusiveMinimum" in jsonSchema ? true : undefined,
            max: jsonSchema.exclusiveMaximum ?? jsonSchema.maximum,
            maxExcluded: "exclusiveMaximum" in jsonSchema ? true : undefined
          })
      }
    }
    case "BigIntConstraints":
      return makeBigIntConstraints(ast.annotations[TypeAnnotationId] as any)
    case "DateConstraints":
      return makeDateConstraints(ast.annotations[TypeAnnotationId] as any)
    case "ArrayConstraints":
      return makeArrayConstraints({
        minLength: jsonSchema.minItems,
        maxLength: jsonSchema.maxItems
      })
  }
}

function getMax(n1: Date | undefined, n2: Date | undefined): Date | undefined
function getMax(n1: bigint | undefined, n2: bigint | undefined): bigint | undefined
function getMax(n1: number | undefined, n2: number | undefined): number | undefined
function getMax(
  n1: bigint | number | Date | undefined,
  n2: bigint | number | Date | undefined
): bigint | number | Date | undefined {
  return n1 === undefined ? n2 : n2 === undefined ? n1 : n1 <= n2 ? n2 : n1
}

function getMin(n1: Date | undefined, n2: Date | undefined): Date | undefined
function getMin(n1: bigint | undefined, n2: bigint | undefined): bigint | undefined
function getMin(n1: number | undefined, n2: number | undefined): number | undefined
function getMin(
  n1: bigint | number | Date | undefined,
  n2: bigint | number | Date | undefined
): bigint | number | Date | undefined {
  return n1 === undefined ? n2 : n2 === undefined ? n1 : n1 <= n2 ? n1 : n2
}

const getOr = (a: boolean | undefined, b: boolean | undefined): boolean | undefined => {
  return a === undefined ? b : b === undefined ? a : a || b
}

function mergePattern(pattern1: string | undefined, pattern2: string | undefined): string | undefined {
  if (pattern1 === undefined) {
    return pattern2
  }
  if (pattern2 === undefined) {
    return pattern1
  }
  return `(?:${pattern1})|(?:${pattern2})`
}

const merge = (c1: Config, c2: Constraints | undefined): Config => {
  if (c2) {
    switch (c1._tag) {
      case "StringConstraints": {
        if (c2._tag === "StringConstraints") {
          return makeStringConstraints({
            minLength: getMax(c1.constraints.minLength, c2.constraints.minLength),
            maxLength: getMin(c1.constraints.maxLength, c2.constraints.maxLength),
            pattern: mergePattern(c1.pattern, c2.pattern)
          })
        }
        break
      }
      case "NumberConstraints": {
        if (c2._tag === "NumberConstraints") {
          return makeNumberConstraints({
            isInteger: c1.isInteger || c2.isInteger,
            min: getMax(c1.constraints.min, c2.constraints.min),
            minExcluded: getOr(c1.constraints.minExcluded, c2.constraints.minExcluded),
            max: getMin(c1.constraints.max, c2.constraints.max),
            maxExcluded: getOr(c1.constraints.maxExcluded, c2.constraints.maxExcluded),
            noNaN: getOr(c1.constraints.noNaN, c2.constraints.noNaN),
            noDefaultInfinity: getOr(c1.constraints.noDefaultInfinity, c2.constraints.noDefaultInfinity)
          })
        }
        break
      }
      case "BigIntConstraints": {
        if (c2._tag === "BigIntConstraints") {
          return makeBigIntConstraints({
            min: getMax(c1.constraints.min, c2.constraints.min),
            max: getMin(c1.constraints.max, c2.constraints.max)
          })
        }
        break
      }
      case "DateConstraints": {
        if (c2._tag === "DateConstraints") {
          return makeDateConstraints({
            min: getMax(c1.constraints.min, c2.constraints.min),
            max: getMin(c1.constraints.max, c2.constraints.max),
            noInvalidDate: getOr(c1.constraints.noInvalidDate, c2.constraints.noInvalidDate)
          })
        }
        break
      }
      case "ArrayConstraints": {
        if (c2._tag === "ArrayConstraints") {
          return makeArrayConfig({
            minLength: getMax(c1.constraints.minLength, c2.constraints.minLength),
            maxLength: getMin(c1.constraints.maxLength, c2.constraints.maxLength)
          }, c1.ast)
        }
        break
      }
    }
  }
  return c1
}

const getSuspendedArray = (
  fc: typeof FastCheck,
  depthIdentifier: string,
  maxDepth: number,
  item: FastCheck.Arbitrary<any>,
  constraints: FastCheck.ArrayConstraints
) => {
  // In the context of a recursive schema, we don't want a `maxLength` greater than 2.
  // The only exception is when `minLength` is also set, in which case we set
  // `maxLength` to the minimum value, which is `minLength`.
  const maxLengthLimit = Math.max(2, constraints.minLength ?? 0)
  if (constraints.maxLength !== undefined && constraints.maxLength > maxLengthLimit) {
    constraints = { ...constraints, maxLength: maxLengthLimit }
  }
  return fc.oneof(
    { maxDepth, depthIdentifier },
    fc.constant([]),
    fc.array(item, constraints)
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
