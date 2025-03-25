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
import * as SchemaAST from "./SchemaAST.js"
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
export const makeLazy = <A, I, R>(schema: Schema.Schema<A, I, R>): LazyArbitrary<A> => {
  const description = getDescription(schema.ast, [])
  return go(description, { maxDepth: 2 })
}

/**
 * Returns a fast-check Arbitrary for the `A` type of the provided schema.
 *
 * @category arbitrary
 * @since 3.10.0
 */
export const make = <A, I, R>(schema: Schema.Schema<A, I, R>): FastCheck.Arbitrary<A> => makeLazy(schema)(FastCheck)

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

type Refinements = ReadonlyArray<SchemaAST.Refinement>

interface Base {
  readonly refinements: Refinements
  readonly annotations: ReadonlyArray<ArbitraryAnnotation<any, any>>
}

interface StringKeyword extends Base {
  readonly _tag: "StringKeyword"
  readonly constraints: ReadonlyArray<StringConstraints>
}

interface NumberKeyword extends Base {
  readonly _tag: "NumberKeyword"
  readonly constraints: ReadonlyArray<NumberConstraints>
}

interface BigIntKeyword extends Base {
  readonly _tag: "BigIntKeyword"
  readonly constraints: ReadonlyArray<BigIntConstraints>
}

interface DateDeclaration extends Base {
  readonly _tag: "DateDeclaration"
  readonly constraints: ReadonlyArray<DateConstraints>
}

interface Declaration extends Base {
  readonly _tag: "Declaration"
  readonly typeParameters: ReadonlyArray<Description>
  readonly error: string
}

interface TupleType extends Base {
  readonly _tag: "TupleType"
  readonly constraints: ReadonlyArray<ArrayConstraints>
  readonly elements: ReadonlyArray<{
    readonly isOptional: boolean
    readonly description: Description
  }>
  readonly rest: ReadonlyArray<Description>
}

interface TypeLiteral extends Base {
  readonly _tag: "TypeLiteral"
  readonly propertySignatures: ReadonlyArray<{
    readonly isOptional: boolean
    readonly name: PropertyKey
    readonly value: Description
  }>
  readonly indexSignatures: ReadonlyArray<{
    readonly parameter: Description
    readonly value: Description
  }>
}

interface Union extends Base {
  readonly _tag: "Union"
  readonly members: ReadonlyArray<Description>
}

interface Suspend extends Base {
  readonly _tag: "Suspend"
  readonly id: string
  readonly ast: SchemaAST.AST
  readonly description: Description
}

interface Ref extends Base {
  readonly _tag: "Ref"
  readonly id: string
  readonly ast: SchemaAST.AST
}

interface NeverKeyword extends Base {
  readonly _tag: "NeverKeyword"
  readonly error: string
}

interface Keyword extends Base {
  readonly _tag: "Keyword"
  readonly value:
    | "UndefinedKeyword"
    | "VoidKeyword"
    | "UnknownKeyword"
    | "AnyKeyword"
    | "BooleanKeyword"
    | "SymbolKeyword"
    | "ObjectKeyword"
}

interface Literal extends Base {
  readonly _tag: "Literal"
  readonly literal: SchemaAST.LiteralValue
}

interface UniqueSymbol extends Base {
  readonly _tag: "UniqueSymbol"
  readonly symbol: symbol
}

interface Enums extends Base {
  readonly _tag: "Enums"
  readonly enums: ReadonlyArray<readonly [string, string | number]>
  readonly error: string | undefined
}

interface TemplateLiteral extends Base {
  readonly _tag: "TemplateLiteral"
  readonly head: string
  readonly spans: ReadonlyArray<{
    readonly description: Description
    readonly literal: string
  }>
}

type Description =
  | Declaration
  | NeverKeyword
  | Keyword
  | Literal
  | UniqueSymbol
  | Enums
  | TemplateLiteral
  | StringKeyword
  | NumberKeyword
  | BigIntKeyword
  | DateDeclaration
  | TupleType
  | TypeLiteral
  | Union
  | Suspend
  | Ref

const getArbitraryAnnotation = SchemaAST.getAnnotation<ArbitraryAnnotation<any, any>>(SchemaAST.ArbitraryAnnotationId)

const getASTConstraints = (ast: SchemaAST.AST) => {
  const TypeAnnotationId = ast.annotations[SchemaAST.SchemaIdAnnotationId]
  if (Predicate.isPropertyKey(TypeAnnotationId)) {
    const out = ast.annotations[TypeAnnotationId]
    if (Predicate.isReadonlyRecord(out)) {
      return out
    }
  }
}

const idMemoMap = globalValue(
  Symbol.for("effect/Arbitrary/IdMemoMap"),
  () => new Map<SchemaAST.AST, string>()
)

let counter = 0

function wrap<A, B, C>(f: (a: A, c: C) => C, g: (a: A, b: B) => C): (a: A, b: B) => C {
  return (a, b) => f(a, g(a, b))
}

/** @internal */
export const getDescription = wrap((ast, description) => {
  const annotation = getArbitraryAnnotation(ast)
  if (Option.isSome(annotation)) {
    return {
      ...description,
      annotations: [...description.annotations, annotation.value]
    }
  }
  return description
}, (ast: SchemaAST.AST, path: ReadonlyArray<PropertyKey>): Description => {
  const jsonSchema: Record<string, any> = Option.getOrElse(SchemaAST.getJSONSchemaAnnotation(ast), () => ({}))
  const TypeAnnotationId = ast.annotations[SchemaAST.SchemaIdAnnotationId]
  switch (ast._tag) {
    case "Refinement": {
      const from = getDescription(ast.from, path)
      switch (from._tag) {
        case "StringKeyword":
          return {
            ...from,
            constraints: [...from.constraints, makeStringConstraints(jsonSchema)],
            refinements: [...from.refinements, ast]
          }
        case "NumberKeyword": {
          const c = TypeAnnotationId === schemaId_.NonNaNSchemaId ?
            makeNumberConstraints({ noNaN: true }) :
            makeNumberConstraints({
              isInteger: "type" in jsonSchema && jsonSchema.type === "integer",
              noNaN: "type" in jsonSchema && jsonSchema.type === "number" ? true : undefined,
              noDefaultInfinity: "type" in jsonSchema && jsonSchema.type === "number" ? true : undefined,
              min: jsonSchema.exclusiveMinimum ?? jsonSchema.minimum,
              minExcluded: "exclusiveMinimum" in jsonSchema ? true : undefined,
              max: jsonSchema.exclusiveMaximum ?? jsonSchema.maximum,
              maxExcluded: "exclusiveMaximum" in jsonSchema ? true : undefined
            })
          return {
            ...from,
            constraints: [...from.constraints, c],
            refinements: [...from.refinements, ast]
          }
        }
        case "BigIntKeyword": {
          const c = getASTConstraints(ast)
          return {
            ...from,
            constraints: c !== undefined ? [...from.constraints, makeBigIntConstraints(c)] : from.constraints,
            refinements: [...from.refinements, ast]
          }
        }
        case "TupleType":
          return {
            ...from,
            constraints: [
              ...from.constraints,
              makeArrayConstraints({
                minLength: jsonSchema.minItems,
                maxLength: jsonSchema.maxItems
              })
            ],
            refinements: [...from.refinements, ast]
          }
        case "DateDeclaration":
          return {
            ...from,
            constraints: [...from.constraints, makeDateConstraints(jsonSchema)],
            refinements: [...from.refinements, ast]
          }
        default:
          return {
            ...from,
            refinements: [...from.refinements, ast]
          }
      }
    }
    case "Declaration": {
      if (TypeAnnotationId === schemaId_.DateFromSelfSchemaId) {
        return {
          _tag: "DateDeclaration",
          constraints: [makeDateConstraints(jsonSchema)],
          refinements: [],
          annotations: []
        }
      }
      return {
        _tag: "Declaration",
        typeParameters: ast.typeParameters.map((ast) => getDescription(ast, path)),
        refinements: [],
        annotations: [],
        error: errors_.getArbitraryMissingAnnotationErrorMessage(path, ast)
      }
    }
    case "Literal": {
      return {
        _tag: "Literal",
        literal: ast.literal,
        refinements: [],
        annotations: []
      }
    }
    case "UniqueSymbol": {
      return {
        _tag: "UniqueSymbol",
        symbol: ast.symbol,
        refinements: [],
        annotations: []
      }
    }
    case "Enums": {
      return {
        _tag: "Enums",
        enums: ast.enums,
        refinements: [],
        annotations: [],
        error: ast.enums.length === 0 ? errors_.getArbitraryEmptyEnumErrorMessage(path) : undefined
      }
    }
    case "TemplateLiteral": {
      return {
        _tag: "TemplateLiteral",
        head: ast.head,
        spans: ast.spans.map((span) => ({
          description: getDescription(span.type, path),
          literal: span.literal
        })),
        refinements: [],
        annotations: []
      }
    }
    case "StringKeyword":
      return {
        _tag: "StringKeyword",
        constraints: [],
        refinements: [],
        annotations: []
      }
    case "NumberKeyword":
      return {
        _tag: "NumberKeyword",
        constraints: [],
        refinements: [],
        annotations: []
      }
    case "BigIntKeyword":
      return {
        _tag: "BigIntKeyword",
        constraints: [],
        refinements: [],
        annotations: []
      }
    case "TupleType":
      return {
        _tag: "TupleType",
        constraints: [],
        elements: ast.elements.map((element, i) => ({
          isOptional: element.isOptional,
          description: getDescription(element.type, [...path, i])
        })),
        rest: ast.rest.map((element, i) => getDescription(element.type, [...path, i])),
        refinements: [],
        annotations: []
      }
    case "TypeLiteral":
      return {
        _tag: "TypeLiteral",
        propertySignatures: ast.propertySignatures.map((ps) => ({
          isOptional: ps.isOptional,
          name: ps.name,
          value: getDescription(ps.type, [...path, ps.name])
        })),
        indexSignatures: ast.indexSignatures.map((is) => ({
          parameter: getDescription(is.parameter, path),
          value: getDescription(is.type, path)
        })),
        refinements: [],
        annotations: []
      }
    case "Union":
      return {
        _tag: "Union",
        members: ast.types.map((member, i) => getDescription(member, [...path, i])),
        refinements: [],
        annotations: []
      }
    case "Suspend": {
      const astf = ast.f()
      const memoId = idMemoMap.get(astf)
      if (memoId !== undefined) {
        return {
          _tag: "Ref",
          id: memoId,
          ast: astf,
          refinements: [],
          annotations: []
        }
      }
      const id = SchemaAST.getIdentifierAnnotation(ast).pipe(
        Option.orElse(() => SchemaAST.getIdentifierAnnotation(astf)),
        Option.getOrElse(() => {
          counter++
          const id = `id-${counter}`
          idMemoMap.set(astf, id)
          return id
        })
      )
      return {
        _tag: "Suspend",
        id,
        ast: astf,
        description: getDescription(astf, path),
        refinements: [],
        annotations: []
      }
    }
    case "Transformation":
      return getDescription(ast.to, path)
    case "NeverKeyword":
      return {
        _tag: "NeverKeyword",
        refinements: [],
        annotations: [],
        error: errors_.getArbitraryMissingAnnotationErrorMessage(path, ast)
      }
    default: {
      return {
        _tag: "Keyword",
        value: ast._tag,
        refinements: [],
        annotations: []
      }
    }
  }
})

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

const constStringConstraints = makeStringConstraints({})

function mergeStringConstraints(c1: StringConstraints, c2: StringConstraints): StringConstraints {
  return makeStringConstraints({
    minLength: getMax(c1.constraints.minLength, c2.constraints.minLength),
    maxLength: getMin(c1.constraints.maxLength, c2.constraints.maxLength),
    pattern: mergePattern(c1.pattern, c2.pattern)
  })
}

function buildStringConstraints(description: StringKeyword): StringConstraints | undefined {
  return description.constraints.length === 0
    ? undefined
    : description.constraints.reduce(mergeStringConstraints)
}

const constNumberConstraints = makeNumberConstraints({})

function mergeNumberConstraints(c1: NumberConstraints, c2: NumberConstraints): NumberConstraints {
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

function buildNumberConstraints(description: NumberKeyword): NumberConstraints | undefined {
  return description.constraints.length === 0
    ? undefined
    : description.constraints.reduce(mergeNumberConstraints)
}

const constBigIntConstraints = makeBigIntConstraints({})

function mergeBigIntConstraints(c1: BigIntConstraints, c2: BigIntConstraints): BigIntConstraints {
  return makeBigIntConstraints({
    min: getMax(c1.constraints.min, c2.constraints.min),
    max: getMin(c1.constraints.max, c2.constraints.max)
  })
}

function buildBigIntConstraints(description: BigIntKeyword): BigIntConstraints | undefined {
  return description.constraints.length === 0
    ? undefined
    : description.constraints.reduce(mergeBigIntConstraints)
}

const constDateConstraints = makeDateConstraints({})

function mergeDateConstraints(c1: DateConstraints, c2: DateConstraints): DateConstraints {
  return makeDateConstraints({
    min: getMax(c1.constraints.min, c2.constraints.min),
    max: getMin(c1.constraints.max, c2.constraints.max),
    noInvalidDate: getOr(c1.constraints.noInvalidDate, c2.constraints.noInvalidDate)
  })
}

function buildDateConstraints(description: DateDeclaration): DateConstraints | undefined {
  return description.constraints.length === 0
    ? undefined
    : description.constraints.reduce(mergeDateConstraints)
}

const constArrayConstraints = makeArrayConstraints({})

function mergeArrayConstraints(c1: ArrayConstraints, c2: ArrayConstraints): ArrayConstraints {
  return makeArrayConstraints({
    minLength: getMax(c1.constraints.minLength, c2.constraints.minLength),
    maxLength: getMin(c1.constraints.maxLength, c2.constraints.maxLength)
  })
}

function buildArrayConstraints(description: TupleType): ArrayConstraints | undefined {
  return description.constraints.length === 0
    ? undefined
    : description.constraints.reduce(mergeArrayConstraints)
}

const arbitraryMemoMap = globalValue(
  Symbol.for("effect/Arbitrary/arbitraryMemoMap"),
  () => new WeakMap<SchemaAST.AST, LazyArbitrary<any>>()
)

function applyFilters(filters: ReadonlyArray<Predicate.Predicate<any>>, arb: LazyArbitrary<any>): LazyArbitrary<any> {
  return (fc) => filters.reduce((arb, filter) => arb.filter(filter), arb(fc))
}

function absurd(message: string): LazyArbitrary<any> {
  return () => {
    throw new Error(message)
  }
}

function getContextConstraints(description: Description): ArbitraryGenerationContext["constraints"] {
  switch (description._tag) {
    case "StringKeyword":
      return buildStringConstraints(description)
    case "NumberKeyword":
      return buildNumberConstraints(description)
    case "BigIntKeyword":
      return buildBigIntConstraints(description)
    case "DateDeclaration":
      return buildDateConstraints(description)
    case "TupleType":
      return buildArrayConstraints(description)
  }
}

const go = wrap((description, lazyArb): LazyArbitrary<any> => {
  const annotation: ArbitraryAnnotation<any, any> | undefined =
    description.annotations[description.annotations.length - 1]

  // error handling
  if (annotation === undefined) {
    switch (description._tag) {
      case "Declaration":
      case "NeverKeyword":
        throw new Error(description.error)
      case "Enums":
        if (description.error !== undefined) {
          throw new Error(description.error)
        }
    }
  }

  const filters = description.refinements.map((ast) => (a: any) =>
    Option.isNone(ast.filter(a, SchemaAST.defaultParseOption, ast))
  )
  if (annotation === undefined) {
    return applyFilters(filters, lazyArb)
  }

  const constraints = getContextConstraints(description)
  const ctx: ArbitraryGenerationContext = {
    maxDepth: 2,
    ...(constraints !== undefined ? { constraints } : {})
  }

  if (description._tag === "Declaration") {
    return applyFilters(filters, annotation(...description.typeParameters.map((p) => go(p, ctx)), ctx))
  }
  return applyFilters(filters, annotation(ctx))
}, (description: Description, ctx: ArbitraryGenerationContext): LazyArbitrary<any> => {
  switch (description._tag) {
    case "Declaration":
    case "NeverKeyword":
      return absurd(`BUG: cannot generate an arbitrary for ${description._tag}`)
    case "Literal":
      return (fc) => fc.constant(description.literal)
    case "UniqueSymbol":
      return (fc) => fc.constant(description.symbol)
    case "Keyword": {
      switch (description.value) {
        case "UndefinedKeyword":
          return (fc) => fc.constant(undefined)
        case "VoidKeyword":
        case "UnknownKeyword":
        case "AnyKeyword":
          return (fc) => fc.anything()
        case "BooleanKeyword":
          return (fc) => fc.boolean()
        case "SymbolKeyword":
          return (fc) => fc.string().map((s) => Symbol.for(s))
        case "ObjectKeyword":
          return (fc) => fc.oneof(fc.object(), fc.array(fc.anything()))
      }
    }
    case "Enums":
      return (fc) => fc.oneof(...description.enums.map(([_, value]) => fc.constant(value)))
    case "TemplateLiteral": {
      return (fc) => {
        const string = fc.string({ maxLength: 5 })
        const number = fc.float({ noDefaultInfinity: true, noNaN: true })

        const getTemplateLiteralArb = (description: TemplateLiteral) => {
          const components: Array<FastCheck.Arbitrary<string | number>> = description.head !== ""
            ? [fc.constant(description.head)]
            : []

          const getTemplateLiteralSpanTypeArb = (
            description: Description
          ): FastCheck.Arbitrary<string | number> => {
            switch (description._tag) {
              case "StringKeyword":
                return string
              case "NumberKeyword":
                return number
              case "Literal":
                return fc.constant(String(description.literal))
              case "Union":
                return fc.oneof(...description.members.map(getTemplateLiteralSpanTypeArb))
              case "TemplateLiteral":
                return getTemplateLiteralArb(description)
              default:
                return fc.constant("")
            }
          }

          description.spans.forEach((span) => {
            components.push(getTemplateLiteralSpanTypeArb(span.description))
            if (span.literal !== "") {
              components.push(fc.constant(span.literal))
            }
          })

          return fc.tuple(...components).map((spans) => spans.join(""))
        }

        return getTemplateLiteralArb(description)
      }
    }
    case "StringKeyword": {
      const constraints = buildStringConstraints(description) ?? constStringConstraints
      const pattern = constraints.pattern
      return pattern !== undefined ?
        (fc) => fc.stringMatching(new RegExp(pattern)) :
        (fc) => fc.string(constraints.constraints)
    }
    case "NumberKeyword": {
      const constraints = buildNumberConstraints(description) ?? constNumberConstraints
      return constraints.isInteger ?
        (fc) => fc.integer(constraints.constraints) :
        (fc) => fc.float(constraints.constraints)
    }
    case "BigIntKeyword": {
      const constraints = buildBigIntConstraints(description) ?? constBigIntConstraints
      return (fc) => fc.bigInt(constraints.constraints)
    }
    case "DateDeclaration": {
      const constraints = buildDateConstraints(description) ?? constDateConstraints
      return (fc) => fc.date(constraints.constraints)
    }
    case "TupleType": {
      const elements: Array<LazyArbitrary<any>> = []
      let hasOptionals = false
      for (const element of description.elements) {
        elements.push(go(element.description, ctx))
        if (element.isOptional) {
          hasOptionals = true
        }
      }
      const rest = description.rest.map((d) => go(d, ctx))
      return (fc) => {
        // ---------------------------------------------
        // handle elements
        // ---------------------------------------------
        let output = fc.tuple(...elements.map((arb) => arb(fc)))
        if (hasOptionals) {
          const indexes = fc.tuple(
            ...description.elements.map((element) => element.isOptional ? fc.boolean() : fc.constant(true))
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
          const constraints = buildArrayConstraints(description) ?? constArrayConstraints
          const [head, ...tail] = rest
          const item = head(fc)
          output = output.chain((as) => {
            const len = as.length
            // We must adjust the constraints for the rest element
            // because the elements might have generated some values
            const restArrayConstraints = subtractElementsLength(constraints.constraints, len)
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
            const arr = ctx.depthIdentifier !== undefined // TODO: where is this set?
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
    case "TypeLiteral": {
      const propertySignatures: Array<LazyArbitrary<any>> = []
      const requiredKeys: Array<PropertyKey> = []
      for (const ps of description.propertySignatures) {
        if (!ps.isOptional) {
          requiredKeys.push(ps.name)
        }
        propertySignatures.push(go(ps.value, ctx))
      }
      const indexSignatures = description.indexSignatures.map((is) =>
        [go(is.parameter, ctx), go(is.value, ctx)] as const
      )
      return (fc) => {
        const pps: any = {}
        for (let i = 0; i < propertySignatures.length; i++) {
          const ps = description.propertySignatures[i]
          pps[ps.name] = propertySignatures[i](fc)
        }
        let output = fc.record<any, any>(pps, { requiredKeys })
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
              getSuspendedArray(fc, ctx.depthIdentifier, ctx.maxDepth, item, { maxLength: 2 }) :
              fc.array(item)
            return arr.map((tuples) => ({ ...Object.fromEntries(tuples), ...o }))
          })
        }

        return output
      }
    }
    case "Union": {
      const members = description.members.map((member) => go(member, ctx))
      return (fc) => fc.oneof(...members.map((arb) => arb(fc)))
    }
    case "Suspend": {
      const memo = arbitraryMemoMap.get(description.ast)
      if (memo) {
        return memo
      }
      const get = util_.memoizeThunk(() => {
        return go(description.description, ctx)
      })
      const out: LazyArbitrary<any> = (fc) => fc.constant(null).chain(() => get()(fc))
      arbitraryMemoMap.set(description.ast, out)
      return out
    }
    case "Ref": {
      const memo = arbitraryMemoMap.get(description.ast)
      if (memo) {
        return memo
      }
      throw new Error(`BUG: Ref ${JSON.stringify(description.id)} not found`)
    }
  }
})

function subtractElementsLength(
  constraints: FastCheck.ArrayConstraints,
  len: number
): FastCheck.ArrayConstraints {
  if (len === 0 || (constraints.minLength === undefined && constraints.maxLength === undefined)) {
    return constraints
  }
  const out = { ...constraints }
  if (out.minLength !== undefined) {
    out.minLength = Math.max(out.minLength - len, 0)
  }
  if (out.maxLength !== undefined) {
    out.maxLength = Math.max(out.maxLength - len, 0)
  }
  return out
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
