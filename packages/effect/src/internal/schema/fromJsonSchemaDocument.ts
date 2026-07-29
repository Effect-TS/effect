import { unescapeToken } from "../../JsonPointer.ts"
import type * as JsonSchema from "../../JsonSchema.ts"
import { remainder } from "../../Number.ts"
import * as Result from "../../Result.ts"
import * as Schema from "../../Schema.ts"
import * as SchemaAST from "../../SchemaAST.ts"
import type * as SchemaRepresentation from "../../SchemaRepresentation.ts"
import { errorWithPath } from "../errors.ts"
import * as InternalRecord from "../record.ts"
import * as InternalAnnotations from "./annotations.ts"
import { fromRepresentation, fromRepresentations } from "./fromRepresentation.ts"

type Path = ReadonlyArray<string | number>
type Representation = SchemaRepresentation.Representation
type Check = SchemaRepresentation.Check

type ImportedJsonSchemaRepresentation = Extract<Representation, {
  readonly _tag:
    | "Reference"
    | "Suspend"
    | "Never"
    | "Unknown"
    | "Null"
    | "String"
    | "Number"
    | "Boolean"
    | "Literal"
    | "Arrays"
    | "Objects"
    | "Union"
}>

const never: ImportedJsonSchemaRepresentation = { _tag: "Never", checks: [] }
const unknown: ImportedJsonSchemaRepresentation = { _tag: "Unknown", checks: [] }
const string: ImportedJsonSchemaRepresentation = { _tag: "String", checks: [] }

function makeLiteral(literal: string | number | boolean): SchemaRepresentation.Literal {
  return { _tag: "Literal", literal, checks: [] }
}

function annotate(
  representation: ImportedJsonSchemaRepresentation,
  annotations: Schema.Annotations.Annotations | undefined
): ImportedJsonSchemaRepresentation {
  if (annotations === undefined) return representation
  if (representation._tag === "Reference") {
    return {
      _tag: "Suspend",
      annotations,
      checks: [],
      thunk: representation
    }
  }
  return {
    ...representation,
    annotations: {
      ...representation.annotations,
      ...annotations
    }
  }
}

const jsonSchemaTypes = new Set([
  "null",
  "string",
  "number",
  "integer",
  "boolean",
  "object",
  "array"
])

const jsonSchemaStringKeys = ["minLength", "maxLength", "pattern", "format", "contentMediaType", "contentSchema"]
const jsonSchemaNumberKeys = ["minimum", "maximum", "exclusiveMinimum", "exclusiveMaximum", "multipleOf"]
const jsonSchemaObjectKeys = [
  "properties",
  "required",
  "additionalProperties",
  "patternProperties",
  "propertyNames",
  "minProperties",
  "maxProperties"
]
const jsonSchemaArrayKeys = ["items", "prefixItems", "additionalItems", "minItems", "maxItems", "uniqueItems"]
function isImportedJsonSchemaType(input: unknown): input is JsonSchema.Type {
  return typeof input === "string" && jsonSchemaTypes.has(input)
}

function inferJsonSchemaType(schema: JsonSchema.JsonSchema): JsonSchema.Type | undefined {
  if (jsonSchemaStringKeys.some((key) => schema[key] !== undefined)) return "string"
  if (jsonSchemaNumberKeys.some((key) => schema[key] !== undefined)) return "number"
  if (jsonSchemaObjectKeys.some((key) => schema[key] !== undefined)) return "object"
  if (jsonSchemaArrayKeys.some((key) => schema[key] !== undefined)) return "array"
}

function jsonSchemaReferenceKey($ref: string): string | undefined {
  const token = $ref.slice($ref.lastIndexOf("/") + 1)
  return token.length === 0 ? undefined : unescapeToken(token)
}

function jsonSchemaFilter(
  id: string,
  payload: Schema.Json,
  schemas?: ReadonlyArray<Representation>
): Check {
  return {
    _tag: "Filter",
    aborted: false,
    representation: {
      id,
      payload,
      ...(schemas === undefined ? undefined : { schemas })
    }
  }
}

function addNumberCheck(
  checks: Array<Check>,
  value: unknown,
  id: string,
  key: string
): void {
  if (typeof value === "number") {
    checks.push(jsonSchemaFilter(id, { [key]: value }))
  }
}

type PatternCharacterSetCategory = "digit" | "nonDigit" | "word" | "nonWord" | "space" | "nonSpace"

interface PatternCharacterSet {
  readonly ascii: bigint
  readonly onlyAscii: boolean
  readonly category: PatternCharacterSetCategory | undefined
}

function patternCharacterSetCategory(source: string): PatternCharacterSetCategory | undefined {
  switch (source) {
    case "\\d":
      return "digit"
    case "\\D":
      return "nonDigit"
    case "\\w":
      return "word"
    case "\\W":
      return "nonWord"
    case "\\s":
      return "space"
    case "\\S":
      return "nonSpace"
    default:
      return undefined
  }
}

function patternCharacterSet(source: string, onlyAscii: boolean): PatternCharacterSet | undefined {
  const result = Result.try(() => new RegExp(`^(?:${source})$`))
  if (Result.isFailure(result)) return undefined
  let ascii = BigInt(0)
  for (let code = 0; code < 128; code++) {
    if (result.success.test(String.fromCharCode(code))) {
      ascii |= BigInt(1) << BigInt(code)
    }
  }
  return { ascii, onlyAscii, category: patternCharacterSetCategory(source) }
}

function isOnlyAsciiCharacterClass(source: string): boolean {
  if (source[1] === "^") return false
  for (let index = 1; index < source.length - 1; index++) {
    const character = source[index]
    if (character.charCodeAt(0) > 127) return false
    if (character === "\\") {
      const escaped = source[++index]
      if (escaped === "d" || escaped === "w" || escaped !== undefined && !/[A-Za-z0-9]/.test(escaped)) {
        continue
      }
      return false
    }
  }
  return true
}

function isOnlyAsciiAtom(source: string): boolean {
  if (source.length === 1) return source !== "." && source.charCodeAt(0) < 128
  if (source === "\\d" || source === "\\w") return true
  if (source.length === 2 && source[0] === "\\") {
    return source.charCodeAt(1) < 128 && !/[A-Za-z0-9]/.test(source[1])
  }
  return source[0] === "[" && isOnlyAsciiCharacterClass(source)
}

function areDisjoint(left: PatternCharacterSet, right: PatternCharacterSet): boolean {
  if ((left.ascii & right.ascii) !== BigInt(0)) return false
  if (left.onlyAscii || right.onlyAscii) return true
  return left.category === "digit" && right.category === "nonDigit" ||
    left.category === "nonDigit" && right.category === "digit" ||
    left.category === "word" && right.category === "nonWord" ||
    left.category === "nonWord" && right.category === "word" ||
    left.category === "space" && right.category === "nonSpace" ||
    left.category === "nonSpace" && right.category === "space"
}

function unionCharacterSets(
  sets: ReadonlyArray<PatternCharacterSet | undefined>
): PatternCharacterSet | undefined {
  if (sets.length === 0 || sets.some((set) => set === undefined)) return undefined
  let ascii = BigInt(0)
  let onlyAscii = true
  for (const set of sets as ReadonlyArray<PatternCharacterSet>) {
    ascii |= set.ascii
    onlyAscii &&= set.onlyAscii
  }
  return { ascii, onlyAscii, category: undefined }
}

// A mandatory atom only separates repetitions when its character set cannot
// overlap the repeated atoms in neighboring iterations.
function hasNestedUnboundedRepetition(pattern: string): boolean {
  interface Atom {
    readonly characterSet: PatternCharacterSet | undefined
    readonly repeatedCharacterSets: Array<PatternCharacterSet | undefined>
    isMandatory: boolean
  }
  interface Branch {
    atoms: Array<Atom>
  }
  interface Group {
    branches: Array<Branch>
    branch: Branch
  }
  function makeGroup(): Group {
    return {
      branches: [],
      branch: { atoms: [] }
    }
  }
  function addAtom(
    group: Group,
    characterSet: PatternCharacterSet | undefined,
    repeatedCharacterSets: Array<PatternCharacterSet | undefined> = []
  ): void {
    group.branch.atoms.push({ characterSet, repeatedCharacterSets, isMandatory: true })
  }
  function isUnsafeToRepeat(branch: Branch): boolean {
    if (!branch.atoms.some((atom) => atom.repeatedCharacterSets.length > 0)) return false
    const mandatoryAtoms = branch.atoms.filter((atom) => atom.isMandatory)
    if (mandatoryAtoms.length <= 1) return true
    return !mandatoryAtoms.some((candidate) => {
      if (candidate.characterSet === undefined) return false
      let compared = false
      for (const atom of branch.atoms) {
        if (atom === candidate) continue
        for (const repeated of atom.repeatedCharacterSets) {
          compared = true
          if (repeated === undefined || !areDisjoint(candidate.characterSet, repeated)) return false
        }
      }
      return compared
    })
  }

  const groups = [makeGroup()]
  let closedGroupIsUnsafeToRepeat = false
  let previousWasClosedGroup = false
  for (let index = 0; index < pattern.length; index++) {
    const character = pattern[index]
    if (character === "\\") {
      const source = pattern.slice(index, index + 2)
      addAtom(groups[groups.length - 1], patternCharacterSet(source, isOnlyAsciiAtom(source)))
      index += source.length - 1
      previousWasClosedGroup = false
      continue
    }
    if (character === "[") {
      const start = index
      for (index++; index < pattern.length; index++) {
        if (pattern[index] === "\\") index++
        else if (pattern[index] === "]") break
      }
      const source = pattern.slice(start, index + 1)
      addAtom(groups[groups.length - 1], patternCharacterSet(source, isOnlyAsciiAtom(source)))
      previousWasClosedGroup = false
      continue
    }
    if (character === "(") {
      groups.push(makeGroup())
      if (pattern[index + 1] === "?") {
        if (pattern[index + 2] === "<" && pattern[index + 3] !== "=" && pattern[index + 3] !== "!") {
          const end = pattern.indexOf(">", index + 3)
          if (end !== -1) index = end
        } else if (pattern[index + 2] === "<") {
          index += 3
        } else {
          index += 2
        }
      }
      previousWasClosedGroup = false
      continue
    }
    if (character === ")" && groups.length > 1) {
      const closed = groups.pop() as Group
      closed.branches.push(closed.branch)
      const repeatedCharacterSets = closed.branches.flatMap((branch) =>
        branch.atoms.flatMap((atom) => atom.repeatedCharacterSets)
      )
      const characterSet = unionCharacterSets(
        closed.branches.flatMap((branch) => branch.atoms.map((atom) => atom.characterSet))
      )
      closedGroupIsUnsafeToRepeat = closed.branches.some(isUnsafeToRepeat)
      addAtom(groups[groups.length - 1], characterSet, repeatedCharacterSets)
      previousWasClosedGroup = true
      continue
    }
    const group = groups[groups.length - 1]
    if (character === "|") {
      group.branches.push(group.branch)
      group.branch = { atoms: [] }
      previousWasClosedGroup = false
      continue
    }
    let isQuantifier = character === "*" || character === "+" || character === "?"
    let isUnbounded = character === "*" || character === "+"
    let minimum = character === "*" || character === "?" ? 0 : 1
    if (character === "{") {
      const end = pattern.indexOf("}", index + 1)
      if (end !== -1) {
        const content = pattern.slice(index + 1, end)
        const match = /^(\d+)(?:,(\d*))?$/.exec(content)
        if (match !== null) {
          isQuantifier = true
          minimum = Number(match[1])
          isUnbounded = content.includes(",") && match[2] === ""
          index = end
        }
      }
    }
    if (isQuantifier) {
      if (isUnbounded && previousWasClosedGroup && closedGroupIsUnsafeToRepeat) return true
      const atom = group.branch.atoms[group.branch.atoms.length - 1]
      // A lazy modifier `?` is treated as a quantifier, under-counting mandatory atoms over-conservatively.
      if (minimum === 0 && atom !== undefined) {
        atom.isMandatory = false
      }
      if (isUnbounded && atom !== undefined) {
        atom.repeatedCharacterSets.push(atom.characterSet)
      }
    } else if (character !== "^" && character !== "$") {
      const source = pattern[index]
      addAtom(group, patternCharacterSet(source, isOnlyAsciiAtom(source)))
    }
    previousWasClosedGroup = false
  }
  return false
}

function jsonSchemaAnnotations(
  schema: JsonSchema.JsonSchema
): Schema.Annotations.Annotations | undefined {
  const annotations: Record<string, Schema.Json> = {}
  if (typeof schema.title === "string") annotations.title = schema.title
  if (typeof schema.description === "string") annotations.description = schema.description
  if (Object.hasOwn(schema, "default")) annotations.default = schema.default as Schema.Json
  if (Array.isArray(schema.examples)) annotations.examples = schema.examples as ReadonlyArray<Schema.Json>
  if (typeof schema.readOnly === "boolean") annotations.readOnly = schema.readOnly
  if (typeof schema.writeOnly === "boolean") annotations.writeOnly = schema.writeOnly
  if (typeof schema.format === "string") annotations.format = schema.format
  if (typeof schema.contentEncoding === "string") annotations.contentEncoding = schema.contentEncoding
  if (typeof schema.contentMediaType === "string") annotations.contentMediaType = schema.contentMediaType
  if (SchemaAST.isJson(schema.contentSchema)) annotations.contentSchema = schema.contentSchema
  return Object.keys(annotations).length === 0 ? undefined : annotations
}

function jsonDeclaration(
  annotations: Schema.Annotations.Annotations | undefined
): Representation {
  return {
    _tag: "Declaration",
    representation: {
      id: "effect/schema/Json",
      payload: null
    },
    annotations: {
      ...annotations,
      expected: "JSON value"
    },
    checks: [],
    typeParameters: []
  }
}

function unknownJsonSchemas(representation: Representation): Representation {
  switch (representation._tag) {
    case "Unknown":
      return jsonDeclaration(representation.annotations)
    case "Suspend":
      return { ...representation, thunk: unknownJsonSchemas(representation.thunk) }
    case "Arrays":
      return {
        ...representation,
        elements: representation.elements.map((element) => ({
          ...element,
          type: unknownJsonSchemas(element.type)
        })),
        rest: representation.rest.map(unknownJsonSchemas)
      }
    case "Objects":
      return {
        ...representation,
        propertySignatures: representation.propertySignatures.map((property) => ({
          ...property,
          type: unknownJsonSchemas(property.type)
        })),
        indexSignatures: representation.indexSignatures.map((indexSignature) => ({
          parameter: unknownJsonSchemas(indexSignature.parameter),
          type: unknownJsonSchemas(indexSignature.type)
        })),
        checks: representation.checks.map(unknownJsonSchemaCheck)
      }
    case "Union":
      return { ...representation, types: representation.types.map(unknownJsonSchemas) }
    default:
      return representation
  }
}

function unknownJsonSchemaCheck(check: Check): Check {
  const representation = check.representation
  const schemas = representation?.schemas
  if (representation === undefined || schemas === undefined) {
    return check
  }
  return {
    ...check,
    representation: {
      ...representation,
      schemas: schemas.map(unknownJsonSchemas)
    }
  }
}

function translateJsonSchemaMultiDocument(
  document: JsonSchema.MultiDocument<"draft-2020-12">,
  options?: SchemaRepresentation.FromJsonSchemaOptions,
  singleRoot = false
): SchemaRepresentation.MultiDocument {
  const definitionCache = new Map<string, ImportedJsonSchemaRepresentation>()
  const definitionsInProgress = new Set<string>()
  const annotatedReferences: Array<{
    readonly reference: SchemaRepresentation.Reference
    readonly path: Path
  }> = []

  function translateDefinition(
    key: string,
    path: Path,
    recursiveReferenceError?: string
  ): ImportedJsonSchemaRepresentation {
    const cached = definitionCache.get(key)
    if (cached !== undefined) return cached
    if (!Object.hasOwn(document.definitions, key)) {
      throw errorWithPath(`Invalid reference ${key}`, [...path, "$ref"])
    }
    if (definitionsInProgress.has(key)) {
      throw errorWithPath(recursiveReferenceError ?? `Invalid reference ${key}`, [...path, "$ref"])
    }
    definitionsInProgress.add(key)
    const representation = recur(document.definitions[key], ["definitions", key])
    definitionsInProgress.delete(key)
    definitionCache.set(key, representation)
    return representation
  }

  function resolveReference(
    reference: SchemaRepresentation.Reference,
    path: Path,
    options?: { readonly recursiveReferenceError?: string },
    seen: ReadonlySet<string> = new Set()
  ): ImportedJsonSchemaRepresentation {
    if (seen.has(reference.$ref)) {
      throw errorWithPath(`Invalid reference ${reference.$ref}`, [...path, "$ref"])
    }
    const nextSeen = new Set(seen).add(reference.$ref)
    const representation = translateDefinition(reference.$ref, path, options?.recursiveReferenceError)
    if (representation._tag === "Reference") {
      return resolveReference(representation, path, options, nextSeen)
    }
    if (representation._tag === "Suspend" && representation.thunk._tag === "Reference") {
      return annotate(
        resolveReference(representation.thunk, path, options, nextSeen),
        representation.annotations
      )
    }
    return representation
  }

  function annotationsOf(
    representation: ImportedJsonSchemaRepresentation
  ): Schema.Annotations.Annotations | undefined {
    return representation._tag === "Reference" ? undefined : representation.annotations
  }

  function mergeAnnotations(
    left: Schema.Annotations.Annotations | undefined,
    right: Schema.Annotations.Annotations | undefined
  ): Schema.Annotations.Annotations | undefined {
    if (left === undefined) return right
    if (right === undefined) return left
    return { ...left, ...right }
  }

  function combinedAnnotations(
    representation: ImportedJsonSchemaRepresentation,
    left: ImportedJsonSchemaRepresentation,
    right: ImportedJsonSchemaRepresentation
  ): ImportedJsonSchemaRepresentation {
    return annotate(
      representation,
      mergeAnnotations(annotationsOf(left), annotationsOf(right))
    )
  }

  function asChecks(
    checks: ReadonlyArray<Check>,
    annotations: Schema.Annotations.Annotations | undefined
  ): ReadonlyArray<Check> | undefined {
    if (checks.length === 0) return undefined
    if (annotations === undefined) return checks
    if (checks.length === 1 && checks[0].annotations === undefined) {
      return [{
        ...checks[0],
        annotations
      }]
    }
    return [{
      _tag: "FilterGroup",
      checks: checks as [Check, ...Array<Check>],
      annotations
    }]
  }

  function combineChecks(
    left: ReadonlyArray<Check>,
    right: ReadonlyArray<Check>,
    annotations: Schema.Annotations.Annotations | undefined,
    deduplicate: ReadonlyArray<string> = []
  ): ReadonlyArray<Check> | undefined {
    for (const id of deduplicate) {
      if (left.some((check) => checkId(check) === id)) {
        right = right.filter((check) => checkId(check) !== id)
      }
    }
    const checks = asChecks(right, annotations)
    return checks === undefined ? undefined : [...left, ...checks]
  }

  function checkId(check: Check): string | undefined {
    return check._tag === "Filter" ? check.representation?.id : undefined
  }

  function satisfiesPrimitiveCheck(check: Check, value: string | number): boolean | undefined {
    if (check._tag === "FilterGroup") {
      return check.checks.every((check) => satisfiesPrimitiveCheck(check, value))
    }
    const representation = check.representation!
    const payload = representation.payload as Record<string, any>
    switch (representation.id) {
      case "effect/schema/isMinLength":
        return (value as string).length >= payload.minLength
      case "effect/schema/isMaxLength":
        return (value as string).length <= payload.maxLength
      case "effect/schema/isPattern":
        return new RegExp(payload.source as string, payload.flags as string).test(value as string)
      case "effect/schema/isFinite":
        return globalThis.Number.isFinite(value as number)
      case "effect/schema/isInt":
        return globalThis.Number.isSafeInteger(value as number)
      case "effect/schema/isMultipleOf":
        return remainder(value as number, payload.divisor) === 0
      case "effect/schema/isGreaterThan":
        return (value as number) > payload.exclusiveMinimum
      case "effect/schema/isGreaterThanOrEqualTo":
        return (value as number) >= payload.minimum
      case "effect/schema/isLessThan":
        return (value as number) < payload.exclusiveMaximum
      case "effect/schema/isLessThanOrEqualTo":
        return (value as number) <= payload.maximum
    }
  }

  function satisfiesLiteral(
    representation:
      | SchemaRepresentation.String
      | SchemaRepresentation.Number,
    literal: SchemaRepresentation.Literal
  ): boolean {
    const value = literal.literal
    if (representation._tag === "String" ? typeof value !== "string" : typeof value !== "number") {
      return false
    }
    return representation.checks.every((check) => satisfiesPrimitiveCheck(check, value as string | number))
  }

  function combinePrimitiveWithLiteral(
    primitive:
      | SchemaRepresentation.String
      | SchemaRepresentation.Number
      | SchemaRepresentation.Boolean,
    literal: SchemaRepresentation.Literal
  ): ImportedJsonSchemaRepresentation {
    const satisfies = primitive._tag === "Boolean"
      ? typeof literal.literal === "boolean"
      : satisfiesLiteral(primitive, literal)
    return satisfies ? combinedAnnotations(literal, primitive, literal) : never
  }

  function combineArrays(
    left: SchemaRepresentation.Arrays,
    right: SchemaRepresentation.Arrays,
    path: Path
  ): Pick<SchemaRepresentation.Arrays, "elements" | "rest"> | undefined {
    const elements: Array<SchemaRepresentation.Element> = []
    const length = Math.max(left.elements.length, right.elements.length)
    for (let index = 0; index < length; index++) {
      const leftElement = left.elements[index]
      const rightElement = right.elements[index]
      const isOptional = leftElement?.isOptional !== false && rightElement?.isOptional !== false
      const leftType = leftElement?.type ?? left.rest[0]
      const rightType = rightElement?.type ?? right.rest[0]
      if (leftType === undefined || rightType === undefined) {
        return isOptional ? { elements, rest: [] } : undefined
      }
      const type = combine(
        leftType as ImportedJsonSchemaRepresentation,
        rightType as ImportedJsonSchemaRepresentation,
        [...path, "elements", index, "type"]
      )
      if (type._tag === "Never") {
        return isOptional ? { elements, rest: [] } : undefined
      }
      elements.push({
        isOptional,
        type
      })
    }

    const leftRest = left.rest[0]
    const rightRest = right.rest[0]
    if (leftRest === undefined || rightRest === undefined) {
      return { elements, rest: [] }
    }
    const rest = combine(
      leftRest as ImportedJsonSchemaRepresentation,
      rightRest as ImportedJsonSchemaRepresentation,
      [...path, "rest", 0]
    )
    return { elements, rest: rest._tag === "Never" ? [] : [rest] }
  }

  function combineProperties(
    left: ReadonlyArray<SchemaRepresentation.PropertySignature>,
    right: ReadonlyArray<SchemaRepresentation.PropertySignature>,
    path: Path
  ): Array<SchemaRepresentation.PropertySignature> {
    const rightByName = new Map(right.map((property) => [property.name, property]))
    const names = new Set<PropertyKey>()
    const properties = left.map((property) => {
      const name = property.name
      names.add(name)
      const other = rightByName.get(name)
      if (other === undefined) return property
      return {
        name: property.name,
        type: combine(
          property.type as ImportedJsonSchemaRepresentation,
          other.type as ImportedJsonSchemaRepresentation,
          [...path, "properties", globalThis.String(name)]
        ),
        isOptional: property.isOptional && other.isOptional,
        isMutable: false
      }
    })
    for (const property of right) {
      if (!names.has(property.name)) properties.push(property)
    }
    return properties
  }

  function isUnconstrainedString(representation: Representation): boolean {
    return representation._tag === "String" && representation.checks.length === 0 &&
      representation.annotations === undefined
  }

  function combineIndexSignatures(
    left: ReadonlyArray<SchemaRepresentation.IndexSignature>,
    right: ReadonlyArray<SchemaRepresentation.IndexSignature>,
    path: Path
  ): Array<SchemaRepresentation.IndexSignature> {
    if (left.length === 0 || right.length === 0) return []
    const signatures = [...left]
    for (const signature of right) {
      if (isUnconstrainedString(signature.parameter)) {
        const index = signatures.findIndex((candidate) => isUnconstrainedString(candidate.parameter))
        if (index !== -1) {
          signatures[index] = {
            parameter: signatures[index].parameter,
            type: combine(
              signatures[index].type as ImportedJsonSchemaRepresentation,
              signature.type as ImportedJsonSchemaRepresentation,
              [...path, "indexSignatures", index, "type"]
            )
          }
        } else {
          signatures.push(signature)
        }
      } else {
        signatures.push(signature)
      }
    }
    return signatures
  }

  function combine(
    left: ImportedJsonSchemaRepresentation,
    right: ImportedJsonSchemaRepresentation,
    path: Path
  ): ImportedJsonSchemaRepresentation {
    if (left._tag === "Never") return left
    if (right._tag === "Never") return right
    if (left._tag === "Unknown") return combinedAnnotations(right, left, right)
    if (right._tag === "Unknown") return combinedAnnotations(left, left, right)
    if (left._tag === "Reference") return combine(resolveReference(left, path), right, path)
    if (right._tag === "Reference") return combine(left, resolveReference(right, path), path)
    if (left._tag === "Suspend") {
      return annotate(
        combine(left.thunk as ImportedJsonSchemaRepresentation, right, path),
        left.annotations
      )
    }
    if (right._tag === "Suspend") {
      return annotate(
        combine(left, right.thunk as ImportedJsonSchemaRepresentation, path),
        right.annotations
      )
    }
    if (left._tag === "Union") {
      const types = left.types
        .map((type, index) => combine(type as ImportedJsonSchemaRepresentation, right, [...path, "types", index]))
        .filter((type) => type._tag !== "Never")
      if (types.length === 0) return never
      return annotate({
        _tag: "Union",
        types,
        mode: left.mode,
        checks: left.checks
      }, left.annotations)
    }
    if (right._tag === "Union") return combine(right, left, path)

    switch (left._tag) {
      case "Null":
        return right._tag === "Null"
          ? combinedAnnotations({ _tag: "Null", checks: [...left.checks, ...right.checks] }, left, right)
          : never
      case "String":
        if (right._tag === "Literal") {
          return combinePrimitiveWithLiteral(left, right)
        }
        if (right._tag !== "String") return never
        const stringChecks = combineChecks(left.checks, right.checks, right.annotations)
        return annotate(
          {
            _tag: "String",
            checks: stringChecks ?? left.checks
          },
          mergeAnnotations(left.annotations, stringChecks === undefined ? right.annotations : undefined)
        )
      case "Number":
        if (right._tag === "Literal") {
          return combinePrimitiveWithLiteral(left, right)
        }
        if (right._tag !== "Number") return never
        const numberChecks = combineChecks(left.checks, right.checks, right.annotations, [
          "effect/schema/isFinite",
          "effect/schema/isInt"
        ])
        return annotate(
          {
            _tag: "Number",
            checks: numberChecks ?? left.checks
          },
          mergeAnnotations(left.annotations, numberChecks === undefined ? right.annotations : undefined)
        )
      case "Boolean":
        if (right._tag === "Literal") {
          return combinePrimitiveWithLiteral(left, right)
        }
        return right._tag === "Boolean"
          ? combinedAnnotations(
            {
              _tag: "Boolean",
              checks: [...left.checks, ...right.checks]
            },
            left,
            right
          )
          : never
      case "Literal":
        if (right._tag === "Literal") {
          return left.literal === right.literal
            ? combinedAnnotations(
              {
                ...left,
                checks: [...left.checks, ...right.checks]
              },
              left,
              right
            )
            : never
        }
        if (
          (right._tag === "String" || right._tag === "Number") && satisfiesLiteral(right, left) ||
          right._tag === "Boolean" && typeof left.literal === "boolean"
        ) {
          return combinedAnnotations(left, left, right)
        }
        return never
      case "Arrays": {
        if (right._tag !== "Arrays") return never
        const arrays = combineArrays(left, right, path)
        if (arrays === undefined) return never
        const arrayChecks = combineChecks(left.checks, right.checks, right.annotations, ["effect/schema/isUnique"])
        return annotate(
          {
            _tag: "Arrays",
            elements: arrays.elements,
            rest: arrays.rest,
            checks: arrayChecks ?? left.checks
          },
          mergeAnnotations(left.annotations, arrayChecks === undefined ? right.annotations : undefined)
        )
      }
      case "Objects": {
        if (right._tag !== "Objects") return never
        const objectChecks = combineChecks(left.checks, right.checks, right.annotations)
        return annotate(
          {
            _tag: "Objects",
            propertySignatures: combineProperties(left.propertySignatures, right.propertySignatures, path),
            indexSignatures: combineIndexSignatures(left.indexSignatures, right.indexSignatures, path),
            checks: objectChecks ?? left.checks
          },
          mergeAnnotations(left.annotations, objectChecks === undefined ? right.annotations : undefined)
        )
      }
    }
  }

  function enter(input: unknown): JsonSchema.JsonSchema | undefined {
    if (typeof input !== "object" || input === null || Array.isArray(input)) {
      return undefined
    }
    const schema = input as JsonSchema.JsonSchema
    return options?.onEnter === undefined ? schema : options.onEnter(schema)
  }

  function recur(input: unknown, path: Path): ImportedJsonSchemaRepresentation {
    if (input === false) {
      return never
    }
    const schema = enter(input)
    if (schema === undefined) {
      return unknown
    }

    let representation = on(schema, path)
    if (representation._tag === "Reference") {
      const siblingSchema: JsonSchema.JsonSchema = { ...schema, $ref: undefined }
      for (const key of InternalAnnotations.jsonSchemaAnnotationKeys) {
        delete siblingSchema[key]
      }
      const sibling = on(siblingSchema, path)
      if (sibling._tag !== "Unknown") {
        const reference = representation
        representation = combine(
          resolveReference(reference, path, {
            recursiveReferenceError: `Unsupported assertion siblings on recursive reference ${reference.$ref}`
          }),
          sibling,
          path
        )
      }
    }
    const annotations = jsonSchemaAnnotations(schema)
    if (annotations !== undefined && representation._tag === "Reference") {
      annotatedReferences.push({ reference: representation, path })
    }
    representation = annotate(representation, annotations)

    if (Array.isArray(schema.allOf)) {
      for (let index = 0; index < schema.allOf.length; index++) {
        representation = combine(
          representation,
          recur(schema.allOf[index], [...path, "allOf", index]),
          [...path, "allOf", index]
        )
      }
    }

    for (const mode of ["anyOf", "oneOf"] as const) {
      const members = schema[mode]
      if (Array.isArray(members)) {
        const union: ImportedJsonSchemaRepresentation = {
          _tag: "Union",
          types: members.map((member, index) => recur(member, [...path, mode, index])),
          mode,
          checks: []
        }
        representation = combine(union, representation, [...path, mode])
      }
    }
    return representation
  }

  function on(schema: JsonSchema.JsonSchema, path: Path): ImportedJsonSchemaRepresentation {
    if (typeof schema.$ref === "string") {
      const $ref = jsonSchemaReferenceKey(schema.$ref)
      if ($ref !== undefined) {
        return { _tag: "Reference", $ref }
      }
    }
    if (Object.hasOwn(schema, "const")) {
      if (schema.const === null) {
        return { _tag: "Null", checks: [] }
      }
      if (typeof schema.const === "string" || typeof schema.const === "number" || typeof schema.const === "boolean") {
        return makeLiteral(schema.const)
      }
    }
    if (Array.isArray(schema.enum)) {
      const types: Array<ImportedJsonSchemaRepresentation> = []
      for (let index = 0; index < schema.enum.length; index++) {
        const value = schema.enum[index]
        if (value === null) {
          types.push({ _tag: "Null", checks: [] })
        } else if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
          types.push(makeLiteral(value))
        } else {
          types.push(recur(value, [...path, "enum", index]))
        }
      }
      if (types.length === 1) {
        return types[0]
      }
      return { _tag: "Union", types, mode: "anyOf", checks: [] }
    }

    if (Array.isArray(schema.type) && schema.type.every(isImportedJsonSchemaType)) {
      return {
        _tag: "Union",
        types: schema.type.map((type) => on({ ...schema, type }, path)),
        mode: "anyOf",
        checks: []
      }
    }

    const type = isImportedJsonSchemaType(schema.type) ? schema.type : inferJsonSchemaType(schema)
    switch (type) {
      case "null":
        return { _tag: "Null", checks: [] }
      case "string":
        return {
          _tag: "String",
          checks: collectStringChecks(schema, path)
        }
      case "number":
      case "integer":
        return {
          _tag: "Number",
          checks: [
            jsonSchemaFilter(type === "number" ? "effect/schema/isFinite" : "effect/schema/isInt", null),
            ...collectNumberChecks(schema)
          ]
        }
      case "boolean":
        return { _tag: "Boolean", checks: [] }
      case "array": {
        const minItems = typeof schema.minItems === "number" ? schema.minItems : 0
        const elements = Array.isArray(schema.prefixItems)
          ? schema.prefixItems.map((element, index) => ({
            isOptional: index + 1 > minItems,
            type: recur(element, [...path, "prefixItems", index])
          }))
          : []
        const rest = schema.items !== undefined
          ? [recur(schema.items, [...path, "items"])]
          : schema.prefixItems !== undefined && typeof schema.maxItems === "number"
          ? []
          : [unknown]
        return {
          _tag: "Arrays",
          elements,
          rest,
          checks: collectArrayChecks(schema)
        }
      }
      case "object":
        return {
          _tag: "Objects",
          propertySignatures: collectProperties(schema, path),
          indexSignatures: collectIndexSignatures(schema, path),
          checks: collectObjectChecks(schema, path)
        }
      default:
        return unknown
    }
  }

  function collectStringChecks(schema: JsonSchema.JsonSchema, path: Path): Array<Check> {
    const checks: Array<Check> = []
    addNumberCheck(checks, schema.minLength, "effect/schema/isMinLength", "minLength")
    addNumberCheck(checks, schema.maxLength, "effect/schema/isMaxLength", "maxLength")
    if (typeof schema.pattern === "string") {
      if (options?.unsafeAllowComplexPatterns !== true && hasNestedUnboundedRepetition(schema.pattern)) {
        throw errorWithPath("Potentially unsafe pattern with nested unbounded repetition", [...path, "pattern"])
      }
      checks.push(jsonSchemaFilter("effect/schema/isPattern", { source: schema.pattern, flags: "" }))
    }
    return checks
  }

  function collectNumberChecks(schema: JsonSchema.JsonSchema): Array<Check> {
    const checks: Array<Check> = []
    addNumberCheck(checks, schema.minimum, "effect/schema/isGreaterThanOrEqualTo", "minimum")
    addNumberCheck(checks, schema.maximum, "effect/schema/isLessThanOrEqualTo", "maximum")
    addNumberCheck(checks, schema.exclusiveMinimum, "effect/schema/isGreaterThan", "exclusiveMinimum")
    addNumberCheck(checks, schema.exclusiveMaximum, "effect/schema/isLessThan", "exclusiveMaximum")
    addNumberCheck(checks, schema.multipleOf, "effect/schema/isMultipleOf", "divisor")
    return checks
  }

  function collectArrayChecks(schema: JsonSchema.JsonSchema): Array<Check> {
    const checks: Array<Check> = []
    if (schema.prefixItems === undefined) {
      addNumberCheck(checks, schema.minItems, "effect/schema/isMinLength", "minLength")
      addNumberCheck(checks, schema.maxItems, "effect/schema/isMaxLength", "maxLength")
    }
    if (typeof schema.uniqueItems === "boolean") {
      checks.push(jsonSchemaFilter("effect/schema/isUnique", null))
    }
    return checks
  }

  function collectProperties(
    schema: JsonSchema.JsonSchema,
    path: Path
  ): Array<SchemaRepresentation.PropertySignature> {
    const properties =
      typeof schema.properties === "object" && schema.properties !== null && !Array.isArray(schema.properties)
        ? schema.properties as Record<string, unknown>
        : {}
    const required = Array.isArray(schema.required)
      ? schema.required.filter((key): key is string => typeof key === "string")
      : []
    const keys = new Set([...Object.keys(properties), ...required])
    return Array.from(keys, (name) => ({
      name,
      type: recur(properties[name], [...path, "properties", name]),
      isOptional: !required.includes(name),
      isMutable: false
    }))
  }

  function collectIndexSignatures(
    schema: JsonSchema.JsonSchema,
    path: Path
  ): Array<SchemaRepresentation.IndexSignature> {
    const signatures: Array<SchemaRepresentation.IndexSignature> = []
    if (
      typeof schema.patternProperties === "object" &&
      schema.patternProperties !== null &&
      !Array.isArray(schema.patternProperties)
    ) {
      for (const [pattern, value] of Object.entries(schema.patternProperties)) {
        if (options?.unsafeAllowComplexPatterns !== true && hasNestedUnboundedRepetition(pattern)) {
          throw errorWithPath("Potentially unsafe pattern with nested unbounded repetition", [
            ...path,
            "patternProperties",
            pattern
          ])
        }
        signatures.push({
          parameter: {
            _tag: "String",
            checks: [jsonSchemaFilter("effect/schema/isPattern", { source: pattern, flags: "" })]
          },
          type: recur(value, [...path, "patternProperties", pattern])
        })
      }
    }
    if (schema.additionalProperties === undefined || schema.additionalProperties === true) {
      signatures.push({
        parameter: string,
        type: unknown
      })
    } else if (typeof schema.additionalProperties === "object" && schema.additionalProperties !== null) {
      signatures.push({
        parameter: string,
        type: recur(schema.additionalProperties, [...path, "additionalProperties"])
      })
    }
    return signatures
  }

  function collectObjectChecks(
    schema: JsonSchema.JsonSchema,
    path: Path
  ): Array<Check> {
    const checks: Array<Check> = []
    addNumberCheck(checks, schema.minProperties, "effect/schema/isMinProperties", "minProperties")
    addNumberCheck(checks, schema.maxProperties, "effect/schema/isMaxProperties", "maxProperties")
    if (schema.propertyNames !== undefined) {
      checks.push(jsonSchemaFilter(
        "effect/schema/isPropertyNames",
        null,
        [recur(schema.propertyNames, [...path, "propertyNames"])]
      ))
    }
    return checks
  }

  const references: Record<string, Representation> = {}
  for (const key of Object.keys(document.definitions)) {
    InternalRecord.assignProperty(references, key, unknownJsonSchemas(translateDefinition(key, ["definitions", key])))
  }
  const representations = document.schemas.map((schema, index) =>
    unknownJsonSchemas(recur(schema, singleRoot ? ["schema"] : ["schemas", index]))
  ) as [Representation, ...Array<Representation>]
  for (const { reference, path } of annotatedReferences) {
    resolveReference(reference, path)
  }
  return { representations, references }
}

/** @internal */
function toRepresentation(
  document: JsonSchema.Document<"draft-2020-12">,
  options?: SchemaRepresentation.FromJsonSchemaOptions
): SchemaRepresentation.Document {
  const translated = translateJsonSchemaMultiDocument(
    {
      dialect: document.dialect,
      schemas: [document.schema],
      definitions: document.definitions
    },
    options,
    true
  )
  return {
    representation: translated.representations[0],
    references: translated.references
  }
}

const jsonSchemaRevivers: ReadonlyArray<SchemaRepresentation.AnyReviver> = [
  Schema.JsonReviver,
  Schema.isPatternReviver,
  Schema.isFiniteReviver,
  Schema.isGreaterThanReviver,
  Schema.isGreaterThanOrEqualToReviver,
  Schema.isLessThanReviver,
  Schema.isLessThanOrEqualToReviver,
  Schema.isMultipleOfReviver,
  Schema.isIntReviver,
  Schema.isMinLengthReviver,
  Schema.isMaxLengthReviver,
  Schema.isMinPropertiesReviver,
  Schema.isMaxPropertiesReviver,
  Schema.isPropertyNamesReviver,
  Schema.isUniqueReviver
]

/** @internal */
export function fromJsonSchemaDocument(
  document: JsonSchema.Document<"draft-2020-12">,
  options?: SchemaRepresentation.FromJsonSchemaOptions
): Schema.Top {
  return fromRepresentation(toRepresentation(document, options), jsonSchemaRevivers)
}

/** @internal */
export function fromJsonSchemaMultiDocument(
  document: JsonSchema.MultiDocument<"draft-2020-12">,
  options?: SchemaRepresentation.FromJsonSchemaOptions
): SchemaRepresentation.SchemaMultiDocument {
  return fromRepresentations(translateJsonSchemaMultiDocument(document, options), jsonSchemaRevivers)
}
