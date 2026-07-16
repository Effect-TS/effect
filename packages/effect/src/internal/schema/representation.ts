import * as Arr from "../../Array.ts"
import * as Equal from "../../Equal.ts"
import { formatPropertyKey } from "../../Formatter.ts"
import { escapeToken, unescapeToken } from "../../JsonPointer.ts"
import type * as JsonSchema from "../../JsonSchema.ts"
import { remainder } from "../../Number.ts"
import * as RegEx from "../../RegExp.ts"
import type * as Schema from "../../Schema.ts"
import * as SchemaAST from "../../SchemaAST.ts"
import type * as SchemaRepresentation from "../../SchemaRepresentation.ts"
import { errorWithPath } from "../errors.ts"
import * as InternalRecord from "../record.ts"
import * as InternalAnnotations from "./annotations.ts"
import * as InternalSchema from "./schema.ts"

type Path = ReadonlyArray<string | number>
type NodeAnnotations = SchemaRepresentation.Declaration["annotations"]
type FilterAnnotations = SchemaRepresentation.Filter["annotations"]
type KeyAnnotations = SchemaRepresentation.Element["annotations"]
type RepresentationAnnotation = SchemaRepresentation.RepresentationAnnotation<SchemaRepresentation.Representation>
type RebindRepresentation<A> =
  & Omit<A, "representation">
  & { readonly representation?: RepresentationAnnotation | undefined }

type ArrayDataResult =
  | { readonly _tag: "Success"; readonly values: ReadonlyArray<unknown> }
  | { readonly _tag: "Failure" }

function invalidStructuralValue(path: Path): never {
  throw errorWithPath("Invalid structural value", path)
}

function isDataDescriptor(descriptor: PropertyDescriptor | undefined): descriptor is PropertyDescriptor & {
  readonly value: unknown
} {
  return descriptor !== undefined && Object.hasOwn(descriptor, "value")
}

function readArrayData(input: ReadonlyArray<unknown>): ArrayDataResult {
  if (Object.getPrototypeOf(input) !== Array.prototype) {
    return { _tag: "Failure" }
  }

  const descriptors = Object.getOwnPropertyDescriptors(input)
  const length = Object.getOwnPropertyDescriptor(input, "length")
  if (
    !isDataDescriptor(length) ||
    typeof length.value !== "number" ||
    !Number.isSafeInteger(length.value) ||
    length.value < 0 ||
    length.enumerable !== false ||
    length.configurable !== false ||
    length.writable !== true ||
    Reflect.ownKeys(descriptors).length !== length.value + 1
  ) {
    return { _tag: "Failure" }
  }

  const values = new Array<unknown>(length.value)
  for (let index = 0; index < length.value; index++) {
    const descriptor = descriptors[index]
    if (!isDataDescriptor(descriptor) || descriptor.enumerable !== true) {
      return { _tag: "Failure" }
    }
    values[index] = descriptor.value
  }
  return { _tag: "Success", values }
}

function projectArray<A, B>(
  input: ReadonlyArray<A>,
  path: Path,
  f: (value: A, path: Path) => B
): ReadonlyArray<B> {
  return input.map((value, index) => f(value, [...path, index]))
}

function annotationsField<A>(annotations: A | undefined): { readonly annotations?: A | undefined } {
  return annotations === undefined ? {} : { annotations }
}

function projectRepresentationAnnotation(
  input: RepresentationAnnotation,
  path: Path,
  ancestors: ReadonlySet<object>
): RepresentationAnnotation {
  if (input.schemas === undefined) return { id: input.id, payload: input.payload }
  const schemas = projectArray(
    input.schemas,
    [...path, "schemas"],
    (representation, representationPath) => projectRepresentation(representation, representationPath, ancestors)
  )
  return { id: input.id, payload: input.payload, schemas }
}

function projectAnnotationBag(
  input: Readonly<Record<string, unknown>> | undefined,
  path: Path,
  ancestors: ReadonlySet<object>,
  excludedKeys: ReadonlySet<string> = new Set()
): NodeAnnotations {
  if (input === undefined) return undefined

  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(input)) {
    if (value === undefined || excludedKeys.has(key)) continue
    if (key === "representation") {
      const representation = projectRepresentationAnnotation(
        value as RepresentationAnnotation,
        [...path, key],
        ancestors
      )
      InternalRecord.set(out, "representation", representation)
    } else {
      if (SchemaAST.isJson(value)) InternalRecord.set(out, key, value)
    }
  }

  return Object.keys(out).length === 0
    ? undefined
    : out as NonNullable<NodeAnnotations>
}

function projectNodeAnnotations(
  input: NodeAnnotations | undefined,
  path: Path,
  ancestors: ReadonlySet<object>,
  excludedKeys?: ReadonlySet<string>
): NodeAnnotations | undefined {
  return projectAnnotationBag(input, path, ancestors, excludedKeys)
}

function projectFilterAnnotations(
  input: FilterAnnotations | undefined,
  path: Path,
  ancestors: ReadonlySet<object>
): FilterAnnotations | undefined {
  return projectAnnotationBag(input, path, ancestors) as FilterAnnotations
}

function projectKeyAnnotations(
  input: KeyAnnotations | undefined,
  path: Path,
  ancestors: ReadonlySet<object>
): KeyAnnotations | undefined {
  const annotations = projectAnnotationBag(input, path, ancestors)
  return annotations as KeyAnnotations | undefined
}

function projectChecks(
  checks: ReadonlyArray<SchemaRepresentation.Check>,
  path: Path,
  ancestors: ReadonlySet<object>
): ReadonlyArray<SchemaRepresentation.Check> {
  return projectArray(checks, path, (check, checkPath) => projectCheck(check, checkPath, ancestors))
}

function projectCheck(
  check: SchemaRepresentation.Check,
  path: Path,
  ancestors: ReadonlySet<object>
): SchemaRepresentation.Check {
  if (ancestors.has(check)) return invalidStructuralValue(path)
  const nextAncestors = new Set(ancestors)
  nextAncestors.add(check)

  switch (check._tag) {
    case "Filter": {
      const annotations = projectFilterAnnotations(
        check.annotations,
        [...path, "annotations"],
        nextAncestors
      )
      return {
        _tag: "Filter",
        aborted: check.aborted,
        ...annotationsField(annotations)
      }
    }
    case "FilterGroup": {
      const annotations = projectFilterAnnotations(
        check.annotations,
        [...path, "annotations"],
        nextAncestors
      )
      const checks = projectChecks(check.checks, [...path, "checks"], nextAncestors)
      return {
        _tag: "FilterGroup",
        checks: checks as readonly [
          SchemaRepresentation.Check,
          ...Array<SchemaRepresentation.Check>
        ],
        ...annotationsField(annotations)
      }
    }
  }
}

function projectRepresentation(
  representation: SchemaRepresentation.Representation,
  path: Path,
  ancestors: ReadonlySet<object> = new Set()
): SchemaRepresentation.Representation {
  if (ancestors.has(representation)) return invalidStructuralValue(path)
  const nextAncestors = new Set(ancestors)
  nextAncestors.add(representation)

  switch (representation._tag) {
    case "Reference":
      return representation
    case "Declaration": {
      const annotations = projectNodeAnnotations(
        representation.annotations,
        [...path, "annotations"],
        nextAncestors
      )
      const typeParameters = projectArray(
        representation.typeParameters,
        [...path, "typeParameters"],
        (typeParameter, typeParameterPath) => projectRepresentation(typeParameter, typeParameterPath, nextAncestors)
      )
      const checks = projectChecks(representation.checks, [...path, "checks"], nextAncestors)
      return {
        _tag: "Declaration",
        typeParameters,
        checks,
        ...annotationsField(annotations)
      }
    }
    case "Suspend": {
      const annotations = projectNodeAnnotations(
        representation.annotations,
        [...path, "annotations"],
        nextAncestors
      )
      const thunk = projectRepresentation(representation.thunk, [...path, "thunk"], nextAncestors)
      return {
        _tag: "Suspend",
        checks: [],
        thunk,
        ...annotationsField(annotations)
      }
    }
    case "Null":
    case "Undefined":
    case "Void":
    case "Never":
    case "Unknown":
    case "Any":
    case "Number":
    case "Boolean":
    case "BigInt":
    case "Symbol":
    case "ObjectKeyword": {
      const annotations = projectNodeAnnotations(
        representation.annotations,
        [...path, "annotations"],
        nextAncestors
      )
      const checks = projectChecks(representation.checks, [...path, "checks"], nextAncestors)
      return {
        _tag: representation._tag,
        checks,
        ...annotationsField(annotations)
      } as SchemaRepresentation.Representation
    }
    case "String": {
      const annotations = projectNodeAnnotations(
        representation.annotations,
        [...path, "annotations"],
        nextAncestors,
        new Set(["contentMediaType", "contentSchema"])
      )
      const checks = projectChecks(representation.checks, [...path, "checks"], nextAncestors)
      const contentSchema = representation.contentSchema === undefined
        ? undefined
        : projectRepresentation(representation.contentSchema, [...path, "contentSchema"], nextAncestors)
      return {
        _tag: "String",
        checks,
        ...annotationsField(annotations),
        ...(representation.contentMediaType === undefined
          ? undefined
          : { contentMediaType: representation.contentMediaType }),
        ...(contentSchema === undefined ? undefined : { contentSchema })
      }
    }
    case "Literal": {
      const annotations = projectNodeAnnotations(
        representation.annotations,
        [...path, "annotations"],
        nextAncestors
      )
      const checks = projectChecks(representation.checks, [...path, "checks"], nextAncestors)
      return {
        _tag: "Literal",
        literal: representation.literal,
        checks,
        ...annotationsField(annotations)
      }
    }
    case "UniqueSymbol": {
      const annotations = projectNodeAnnotations(
        representation.annotations,
        [...path, "annotations"],
        nextAncestors
      )
      const checks = projectChecks(representation.checks, [...path, "checks"], nextAncestors)
      return {
        _tag: "UniqueSymbol",
        symbol: representation.symbol,
        checks,
        ...annotationsField(annotations)
      }
    }
    case "Enum": {
      const annotations = projectNodeAnnotations(
        representation.annotations,
        [...path, "annotations"],
        nextAncestors
      )
      const checks = projectChecks(representation.checks, [...path, "checks"], nextAncestors)
      return {
        _tag: "Enum",
        enums: representation.enums,
        checks,
        ...annotationsField(annotations)
      }
    }
    case "TemplateLiteral": {
      const annotations = projectNodeAnnotations(
        representation.annotations,
        [...path, "annotations"],
        nextAncestors
      )
      const checks = projectChecks(representation.checks, [...path, "checks"], nextAncestors)
      const parts = projectArray(
        representation.parts,
        [...path, "parts"],
        (part, partPath) => projectRepresentation(part, partPath, nextAncestors)
      )
      return {
        _tag: "TemplateLiteral",
        parts,
        checks,
        ...annotationsField(annotations)
      }
    }
    case "Arrays": {
      const annotations = projectNodeAnnotations(
        representation.annotations,
        [...path, "annotations"],
        nextAncestors
      )
      const checks = projectChecks(representation.checks, [...path, "checks"], nextAncestors)
      const elements = projectArray<
        SchemaRepresentation.Element,
        SchemaRepresentation.Element
      >(representation.elements, [...path, "elements"], (element, elementPath) => {
        const type = projectRepresentation(element.type, [...elementPath, "type"], nextAncestors)
        const elementAnnotations = projectKeyAnnotations(
          element.annotations,
          [...elementPath, "annotations"],
          nextAncestors
        )
        return {
          isOptional: element.isOptional,
          type,
          ...annotationsField(elementAnnotations)
        }
      })
      const rest = projectArray(
        representation.rest,
        [...path, "rest"],
        (rest, restPath) => projectRepresentation(rest, restPath, nextAncestors)
      )
      return {
        _tag: "Arrays",
        elements,
        rest,
        checks,
        ...annotationsField(annotations)
      }
    }
    case "Objects": {
      const annotations = projectNodeAnnotations(
        representation.annotations,
        [...path, "annotations"],
        nextAncestors
      )
      const checks = projectChecks(representation.checks, [...path, "checks"], nextAncestors)
      const propertySignatures = projectArray<
        SchemaRepresentation.PropertySignature,
        SchemaRepresentation.PropertySignature
      >(
        representation.propertySignatures,
        [...path, "propertySignatures"],
        (property, propertyPath) => {
          const type = projectRepresentation(property.type, [...propertyPath, "type"], nextAncestors)
          const propertyAnnotations = projectKeyAnnotations(
            property.annotations,
            [...propertyPath, "annotations"],
            nextAncestors
          )
          return {
            name: property.name,
            type,
            isOptional: property.isOptional,
            isMutable: property.isMutable,
            ...annotationsField(propertyAnnotations)
          }
        }
      )
      const indexSignatures = projectArray<
        SchemaRepresentation.IndexSignature,
        SchemaRepresentation.IndexSignature
      >(
        representation.indexSignatures,
        [...path, "indexSignatures"],
        (index, indexPath) => {
          const parameter = projectRepresentation(index.parameter, [...indexPath, "parameter"], nextAncestors)
          const type = projectRepresentation(index.type, [...indexPath, "type"], nextAncestors)
          return { parameter, type }
        }
      )
      return {
        _tag: "Objects",
        propertySignatures,
        indexSignatures,
        checks,
        ...annotationsField(annotations)
      }
    }
    case "Union": {
      const annotations = projectNodeAnnotations(
        representation.annotations,
        [...path, "annotations"],
        nextAncestors
      )
      const checks = projectChecks(representation.checks, [...path, "checks"], nextAncestors)
      const types = projectArray(
        representation.types,
        [...path, "types"],
        (type, typePath) => projectRepresentation(type, typePath, nextAncestors)
      )
      return {
        _tag: "Union",
        types,
        mode: representation.mode,
        checks,
        ...annotationsField(annotations)
      }
    }
  }
}

function projectReferences(
  references: SchemaRepresentation.References,
  path: Path
): SchemaRepresentation.References {
  const out: Record<string, SchemaRepresentation.Representation> = {}
  for (const [key, value] of Object.entries(references)) {
    const representation = projectRepresentation(value, [...path, key])
    InternalRecord.set(out, key, representation)
  }
  return out
}

/** @internal */
export function projectDocument(
  document: SchemaRepresentation.Document
): SchemaRepresentation.Document {
  const representation = projectRepresentation(document.representation, ["representation"])
  const references = projectReferences(document.references, ["references"])
  return { representation, references }
}

/** @internal */
export function projectMultiDocument(
  document: SchemaRepresentation.MultiDocument
): SchemaRepresentation.MultiDocument {
  const representations = projectArray(
    document.representations,
    ["representations"],
    (representation, path) => projectRepresentation(representation, path)
  )
  const references = projectReferences(document.references, ["references"])
  return {
    representations: representations as readonly [
      SchemaRepresentation.Representation,
      ...Array<SchemaRepresentation.Representation>
    ],
    references
  }
}

type Representation = SchemaRepresentation.Representation
type Check = SchemaRepresentation.Check
type Document = SchemaRepresentation.Document
type MultiDocument = SchemaRepresentation.MultiDocument

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

const jsonSchemaTypes: ReadonlySet<string> = new Set([
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
  if (jsonSchemaStringKeys.some((key) => schema[key] !== undefined)) {
    return "string"
  }
  if (jsonSchemaNumberKeys.some((key) => schema[key] !== undefined)) {
    return "number"
  }
  if (jsonSchemaObjectKeys.some((key) => schema[key] !== undefined)) {
    return "object"
  }
  if (jsonSchemaArrayKeys.some((key) => schema[key] !== undefined)) {
    return "array"
  }
}

function jsonSchemaReferenceKey($ref: string): string | undefined {
  const token = $ref.split("/").at(-1)!
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
    annotations: {
      representation: {
        id,
        payload,
        ...(schemas === undefined ? undefined : { schemas })
      }
    }
  }
}

function jsonSchemaAnnotations(
  schema: JsonSchema.JsonSchema
): NodeAnnotations | undefined {
  const annotations: Record<string, Schema.Json> = {}
  if (typeof schema.title === "string") annotations.title = schema.title
  if (typeof schema.description === "string") annotations.description = schema.description
  if (Object.hasOwn(schema, "default")) annotations.default = schema.default as Schema.Json
  if (Array.isArray(schema.examples)) annotations.examples = schema.examples as ReadonlyArray<Schema.Json>
  if (typeof schema.readOnly === "boolean") annotations.readOnly = schema.readOnly
  if (typeof schema.writeOnly === "boolean") annotations.writeOnly = schema.writeOnly
  if (typeof schema.format === "string") annotations.format = schema.format
  if (typeof schema.contentEncoding === "string") annotations.contentEncoding = schema.contentEncoding
  return Object.keys(annotations).length === 0 ? undefined : annotations
}

function annotateJsonSchemaRepresentation(
  representation: ImportedJsonSchemaRepresentation,
  annotations: NodeAnnotations | undefined
): ImportedJsonSchemaRepresentation {
  if (annotations === undefined) {
    return representation
  }
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

function jsonDeclaration(
  annotations: NodeAnnotations | undefined
): Representation {
  return {
    _tag: "Declaration",
    annotations: {
      ...annotations,
      expected: "JSON value",
      representation: {
        id: "effect/schema/Json",
        payload: null
      }
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
    case "String":
      return representation.contentSchema === undefined
        ? representation
        : { ...representation, contentSchema: unknownJsonSchemas(representation.contentSchema) }
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
  const annotations = check.annotations
  const representation = annotations?.representation
  const schemas = representation?.schemas
  if (representation === undefined || schemas === undefined) {
    return check
  }
  return {
    ...check,
    annotations: {
      ...annotations,
      representation: {
        ...representation,
        schemas: schemas.map(unknownJsonSchemas)
      }
    }
  }
}

function translateJsonSchemaMultiDocument(
  document: JsonSchema.MultiDocument<"draft-2020-12">,
  options?: SchemaRepresentation.FromJsonSchemaOptions,
  singleRoot = false
): MultiDocument {
  const definitionCache = new Map<string, ImportedJsonSchemaRepresentation>()
  const definitionsInProgress = new Set<string>()

  function translateDefinition(key: string, path: Path): ImportedJsonSchemaRepresentation {
    const cached = definitionCache.get(key)
    if (cached !== undefined) {
      return cached
    }
    if (!Object.hasOwn(document.definitions, key) || definitionsInProgress.has(key)) {
      throw errorWithPath(`Invalid reference ${key}`, [...path, "$ref"])
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
    seen: ReadonlySet<string> = new Set()
  ): ImportedJsonSchemaRepresentation {
    if (seen.has(reference.$ref)) {
      throw errorWithPath(`Invalid reference ${reference.$ref}`, [...path, "$ref"])
    }
    const nextSeen = new Set(seen)
    nextSeen.add(reference.$ref)
    const representation = translateDefinition(reference.$ref, path)
    if (representation._tag === "Reference") {
      return resolveReference(representation, path, nextSeen)
    }
    if (representation._tag === "Suspend" && representation.thunk._tag === "Reference") {
      return annotateJsonSchemaRepresentation(
        resolveReference(representation.thunk, path, nextSeen),
        representation.annotations
      )
    }
    return representation
  }

  function annotationsOf(
    representation: ImportedJsonSchemaRepresentation
  ): NodeAnnotations | undefined {
    return representation._tag === "Reference" ? undefined : representation.annotations
  }

  function mergeAnnotations(
    left: NodeAnnotations | undefined,
    right: NodeAnnotations | undefined
  ): NodeAnnotations | undefined {
    if (left === undefined) return right
    if (right === undefined) return left
    return { ...left, ...right }
  }

  function combinedAnnotations(
    representation: ImportedJsonSchemaRepresentation,
    left: ImportedJsonSchemaRepresentation,
    right: ImportedJsonSchemaRepresentation
  ): ImportedJsonSchemaRepresentation {
    return annotateJsonSchemaRepresentation(
      representation,
      mergeAnnotations(annotationsOf(left), annotationsOf(right))
    )
  }

  function hasOrdinaryCheckAnnotations(
    annotations: FilterAnnotations | undefined
  ): boolean {
    return annotations !== undefined && Object.keys(annotations).some((key) => key !== "representation")
  }

  function asChecks(
    checks: ReadonlyArray<Check>,
    annotations: NodeAnnotations | undefined
  ): ReadonlyArray<Check> | undefined {
    if (checks.length === 0) return undefined
    if (annotations === undefined) return checks
    if (checks.length === 1 && !hasOrdinaryCheckAnnotations(checks[0].annotations)) {
      return [{
        ...checks[0],
        annotations: {
          ...checks[0].annotations,
          ...annotations
        }
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
    annotations: NodeAnnotations | undefined
  ): ReadonlyArray<Check> | undefined {
    const checks = asChecks(right, annotations)
    return checks === undefined ? undefined : [...left, ...checks]
  }

  function checkId(check: Check): string | undefined {
    return check._tag === "Filter" ? check.annotations?.representation?.id : undefined
  }

  function combineNumberChecks(
    left: ReadonlyArray<Check>,
    right: ReadonlyArray<Check>,
    annotations: NodeAnnotations | undefined
  ): ReadonlyArray<Check> | undefined {
    if (left.some((check) => checkId(check) === "effect/schema/isFinite")) {
      right = right.filter((check) => checkId(check) !== "effect/schema/isFinite")
    }
    if (left.some((check) => checkId(check) === "effect/schema/isInt")) {
      right = right.filter((check) => checkId(check) !== "effect/schema/isInt")
    }
    return combineChecks(left, right, annotations)
  }

  function combineArrayChecks(
    left: ReadonlyArray<Check>,
    right: ReadonlyArray<Check>,
    annotations: NodeAnnotations | undefined
  ): ReadonlyArray<Check> | undefined {
    if (left.some((check) => checkId(check) === "effect/schema/isUnique")) {
      right = right.filter((check) => checkId(check) !== "effect/schema/isUnique")
    }
    return combineChecks(left, right, annotations)
  }

  function satisfiesPrimitiveCheck(check: Check, value: string | number): boolean | undefined {
    if (check._tag === "FilterGroup") {
      return check.checks.every((check) => satisfiesPrimitiveCheck(check, value))
    }
    const representation = check.annotations!.representation!
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
    const names = new Set<PropertyKey | number>()
    const properties = left.map((property) => {
      names.add(property.name)
      const other = rightByName.get(property.name)
      if (other === undefined) return property
      return {
        name: property.name,
        type: combine(
          property.type as ImportedJsonSchemaRepresentation,
          other.type as ImportedJsonSchemaRepresentation,
          [...path, "properties", property.name as string]
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
      representation.annotations === undefined && representation.contentMediaType === undefined &&
      representation.contentSchema === undefined
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
      return annotateJsonSchemaRepresentation(
        combine(left.thunk as ImportedJsonSchemaRepresentation, right, path),
        left.annotations
      )
    }
    if (right._tag === "Suspend") {
      return annotateJsonSchemaRepresentation(
        combine(left, right.thunk as ImportedJsonSchemaRepresentation, path),
        right.annotations
      )
    }
    if (left._tag === "Union") {
      const types = left.types
        .map((type, index) => combine(type as ImportedJsonSchemaRepresentation, right, [...path, "types", index]))
        .filter((type) => type._tag !== "Never")
      if (types.length === 0) return { _tag: "Never", checks: [] }
      return annotateJsonSchemaRepresentation({
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
          : { _tag: "Never", checks: [] }
      case "String":
        if (right._tag === "Literal") {
          return satisfiesLiteral(left, right)
            ? combinedAnnotations(
              {
                _tag: "Literal",
                literal: right.literal,
                checks: right.checks
              },
              left,
              right
            )
            : { _tag: "Never", checks: [] }
        }
        if (right._tag !== "String") return { _tag: "Never", checks: [] }
        const stringChecks = combineChecks(left.checks, right.checks, right.annotations)
        return annotateJsonSchemaRepresentation(
          {
            _tag: "String",
            checks: stringChecks ?? left.checks,
            ...(right.contentMediaType ?? left.contentMediaType) === undefined
              ? undefined
              : { contentMediaType: right.contentMediaType ?? left.contentMediaType },
            ...(right.contentSchema ?? left.contentSchema) === undefined
              ? undefined
              : { contentSchema: right.contentSchema ?? left.contentSchema }
          },
          mergeAnnotations(left.annotations, stringChecks === undefined ? right.annotations : undefined)
        )
      case "Number":
        if (right._tag === "Literal") {
          return satisfiesLiteral(left, right)
            ? combinedAnnotations(
              {
                _tag: "Literal",
                literal: right.literal,
                checks: right.checks
              },
              left,
              right
            )
            : { _tag: "Never", checks: [] }
        }
        if (right._tag !== "Number") return { _tag: "Never", checks: [] }
        const numberChecks = combineNumberChecks(left.checks, right.checks, right.annotations)
        return annotateJsonSchemaRepresentation(
          {
            _tag: "Number",
            checks: numberChecks ?? left.checks
          },
          mergeAnnotations(left.annotations, numberChecks === undefined ? right.annotations : undefined)
        )
      case "Boolean":
        if (right._tag === "Literal") {
          return typeof right.literal === "boolean"
            ? combinedAnnotations(
              {
                _tag: "Literal",
                literal: right.literal,
                checks: right.checks
              },
              left,
              right
            )
            : { _tag: "Never", checks: [] }
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
          : { _tag: "Never", checks: [] }
      case "Literal":
        if (right._tag === "Literal") {
          return left.literal === right.literal
            ? combinedAnnotations(
              {
                _tag: "Literal",
                literal: left.literal,
                checks: [...left.checks, ...right.checks]
              },
              left,
              right
            )
            : { _tag: "Never", checks: [] }
        }
        if (
          (right._tag === "String" || right._tag === "Number") && satisfiesLiteral(right, left) ||
          right._tag === "Boolean" && typeof left.literal === "boolean"
        ) {
          return combinedAnnotations(
            {
              _tag: "Literal",
              literal: left.literal,
              checks: left.checks
            },
            left,
            right
          )
        }
        return { _tag: "Never", checks: [] }
      case "Arrays": {
        if (right._tag !== "Arrays") return { _tag: "Never", checks: [] }
        const arrays = combineArrays(left, right, path)
        if (arrays === undefined) return { _tag: "Never", checks: [] }
        const arrayChecks = combineArrayChecks(left.checks, right.checks, right.annotations)
        return annotateJsonSchemaRepresentation(
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
        if (right._tag !== "Objects") return { _tag: "Never", checks: [] }
        const objectChecks = combineChecks(left.checks, right.checks, right.annotations)
        return annotateJsonSchemaRepresentation(
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

  function enter(input: unknown, path: Path): JsonSchema.JsonSchema | undefined {
    if (typeof input !== "object" || input === null || Array.isArray(input)) {
      return undefined
    }
    if (!SchemaAST.isJson(input)) {
      throw errorWithPath("Invalid schema representation document", path)
    }
    const schema = input as JsonSchema.JsonSchema
    return options?.onEnter === undefined ? schema : options.onEnter(schema)
  }

  function recur(input: unknown, path: Path): ImportedJsonSchemaRepresentation {
    if (input === false) {
      return { _tag: "Never", checks: [] }
    }
    const schema = enter(input, path)
    if (schema === undefined) {
      return { _tag: "Unknown", checks: [] }
    }

    let representation = on(schema, path)
    const annotations = jsonSchemaAnnotations(schema)
    if (annotations !== undefined && representation._tag === "Reference") {
      resolveReference(representation, path)
    }
    representation = annotateJsonSchemaRepresentation(representation, annotations)

    if (Array.isArray(schema.allOf)) {
      for (let index = 0; index < schema.allOf.length; index++) {
        representation = combine(
          representation,
          recur(schema.allOf[index], [...path, "allOf", index]),
          [...path, "allOf", index]
        )
      }
    }

    if (Array.isArray(schema.anyOf)) {
      const union: ImportedJsonSchemaRepresentation = {
        _tag: "Union",
        types: schema.anyOf.map((member, index) => recur(member, [...path, "anyOf", index])),
        mode: "anyOf",
        checks: []
      }
      representation = combine(union, representation, [...path, "anyOf"])
    }
    if (Array.isArray(schema.oneOf)) {
      const union: ImportedJsonSchemaRepresentation = {
        _tag: "Union",
        types: schema.oneOf.map((member, index) => recur(member, [...path, "oneOf", index])),
        mode: "oneOf",
        checks: []
      }
      representation = combine(union, representation, [...path, "oneOf"])
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
        return { _tag: "Literal", literal: schema.const, checks: [] }
      }
    }
    if (Array.isArray(schema.enum)) {
      const types: Array<ImportedJsonSchemaRepresentation> = []
      for (let index = 0; index < schema.enum.length; index++) {
        const value = schema.enum[index]
        if (value === null) {
          types.push({ _tag: "Null", checks: [] })
        } else if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
          types.push({ _tag: "Literal", literal: value, checks: [] })
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
          checks: collectStringChecks(schema),
          ...(typeof schema.contentMediaType === "string" ? { contentMediaType: schema.contentMediaType } : undefined),
          ...(schema.contentSchema === undefined
            ? undefined
            : { contentSchema: recur(schema.contentSchema, [...path, "contentSchema"]) })
        }
      case "number":
        return {
          _tag: "Number",
          checks: [jsonSchemaFilter("effect/schema/isFinite", null), ...collectNumberChecks(schema)]
        }
      case "integer":
        return {
          _tag: "Number",
          checks: [jsonSchemaFilter("effect/schema/isInt", null), ...collectNumberChecks(schema)]
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
          : [{ _tag: "Unknown", checks: [] } as ImportedJsonSchemaRepresentation]
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
        return { _tag: "Unknown", checks: [] }
    }
  }

  function collectStringChecks(schema: JsonSchema.JsonSchema): Array<Check> {
    const checks: Array<Check> = []
    if (typeof schema.minLength === "number") {
      checks.push(jsonSchemaFilter("effect/schema/isMinLength", { minLength: schema.minLength }))
    }
    if (typeof schema.maxLength === "number") {
      checks.push(jsonSchemaFilter("effect/schema/isMaxLength", { maxLength: schema.maxLength }))
    }
    if (typeof schema.pattern === "string") {
      checks.push(jsonSchemaFilter("effect/schema/isPattern", { source: schema.pattern, flags: "" }))
    }
    return checks
  }

  function collectNumberChecks(schema: JsonSchema.JsonSchema): Array<Check> {
    const checks: Array<Check> = []
    if (typeof schema.minimum === "number") {
      checks.push(jsonSchemaFilter("effect/schema/isGreaterThanOrEqualTo", { minimum: schema.minimum }))
    }
    if (typeof schema.maximum === "number") {
      checks.push(jsonSchemaFilter("effect/schema/isLessThanOrEqualTo", { maximum: schema.maximum }))
    }
    if (typeof schema.exclusiveMinimum === "number") {
      checks.push(jsonSchemaFilter("effect/schema/isGreaterThan", { exclusiveMinimum: schema.exclusiveMinimum }))
    }
    if (typeof schema.exclusiveMaximum === "number") {
      checks.push(jsonSchemaFilter("effect/schema/isLessThan", { exclusiveMaximum: schema.exclusiveMaximum }))
    }
    if (typeof schema.multipleOf === "number") {
      checks.push(jsonSchemaFilter("effect/schema/isMultipleOf", { divisor: schema.multipleOf }))
    }
    return checks
  }

  function collectArrayChecks(schema: JsonSchema.JsonSchema): Array<Check> {
    const checks: Array<Check> = []
    if (schema.prefixItems === undefined) {
      if (typeof schema.minItems === "number") {
        checks.push(jsonSchemaFilter("effect/schema/isMinLength", { minLength: schema.minItems }))
      }
      if (typeof schema.maxItems === "number") {
        checks.push(jsonSchemaFilter("effect/schema/isMaxLength", { maxLength: schema.maxItems }))
      }
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
        parameter: { _tag: "String", checks: [] },
        type: { _tag: "Unknown", checks: [] }
      })
    } else if (typeof schema.additionalProperties === "object" && schema.additionalProperties !== null) {
      signatures.push({
        parameter: { _tag: "String", checks: [] },
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
    if (typeof schema.minProperties === "number") {
      checks.push(jsonSchemaFilter("effect/schema/isMinProperties", { minProperties: schema.minProperties }))
    }
    if (typeof schema.maxProperties === "number") {
      checks.push(jsonSchemaFilter("effect/schema/isMaxProperties", { maxProperties: schema.maxProperties }))
    }
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
    InternalRecord.set(references, key, unknownJsonSchemas(translateDefinition(key, ["definitions", key])))
  }
  const representations = document.schemas.map((schema, index) =>
    unknownJsonSchemas(recur(schema, singleRoot ? ["schema"] : ["schemas", index]))
  ) as [Representation, ...Array<Representation>]
  return { representations, references }
}

/** @internal */
export function fromJsonSchemaDocument(
  document: JsonSchema.Document<"draft-2020-12">,
  options?: SchemaRepresentation.FromJsonSchemaOptions
): Document {
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

/** @internal */
export function fromJsonSchemaMultiDocument(
  document: JsonSchema.MultiDocument<"draft-2020-12">,
  options?: SchemaRepresentation.FromJsonSchemaOptions
): MultiDocument {
  return translateJsonSchemaMultiDocument(document, options)
}

const jsonSchemaExcludedAnnotationKeys: ReadonlySet<string> = new Set([
  "title",
  "description",
  "default",
  "examples",
  "readOnly",
  "writeOnly",
  "format",
  "contentEncoding",
  "contentMediaType",
  "contentSchema",
  "representation",
  "toJsonSchema",
  "toCode",
  "arbitrary",
  "toArbitrary",
  "toEquivalence",
  "toFormatter",
  "toCodec",
  "toCodecJson",
  "toCodecIso",
  "identifier",
  "brands",
  "expected"
])

function getDataAnnotation(
  annotations: Schema.Annotations.Annotations | undefined,
  key: string
): unknown {
  return annotations?.[key]
}

function getJsonSchemaAnnotation(input: unknown): Schema.Json | undefined {
  return SchemaAST.isJson(input) ? input : undefined
}

function collectJsonSchemaAnnotations(
  annotations: Schema.Annotations.Annotations | undefined,
  options: Schema.ToJsonSchemaOptions | undefined
): JsonSchema.JsonSchema | undefined {
  if (annotations === undefined) {
    return undefined
  }

  const out: JsonSchema.JsonSchema = {}
  const title = getDataAnnotation(annotations, "title")
  if (typeof title === "string") out.title = title
  const description = getDataAnnotation(annotations, "description")
  const expected = getDataAnnotation(annotations, "expected")
  if (typeof description === "string") out.description = description
  else if (options?.generateDescriptions === true && typeof expected === "string") out.description = expected

  const defaultValue = getJsonSchemaAnnotation(getDataAnnotation(annotations, "default"))
  if (defaultValue !== undefined) out.default = defaultValue
  const examples = getDataAnnotation(annotations, "examples")
  const validExamples = Array.isArray(examples) ? getJsonSchemaAnnotation(examples) : undefined
  if (validExamples !== undefined) out.examples = validExamples
  const readOnly = getDataAnnotation(annotations, "readOnly")
  if (typeof readOnly === "boolean") out.readOnly = readOnly
  const writeOnly = getDataAnnotation(annotations, "writeOnly")
  if (typeof writeOnly === "boolean") out.writeOnly = writeOnly
  const format = getDataAnnotation(annotations, "format")
  if (typeof format === "string") out.format = format
  const contentEncoding = getDataAnnotation(annotations, "contentEncoding")
  if (typeof contentEncoding === "string") out.contentEncoding = contentEncoding
  const contentMediaType = getDataAnnotation(annotations, "contentMediaType")
  if (typeof contentMediaType === "string") out.contentMediaType = contentMediaType

  if (options?.includeAnnotationKey !== undefined) {
    const descriptors = Object.getOwnPropertyDescriptors(annotations)
    for (const key of Reflect.ownKeys(descriptors)) {
      if (
        typeof key !== "string" ||
        key.startsWith("~") ||
        jsonSchemaExcludedAnnotationKeys.has(key) ||
        !options.includeAnnotationKey(key)
      ) {
        continue
      }
      const descriptor = descriptors[key]
      if (!isDataDescriptor(descriptor) || descriptor.enumerable !== true || descriptor.value === undefined) {
        continue
      }
      const value = getJsonSchemaAnnotation(descriptor.value)
      if (value !== undefined) {
        out[key] = value
      }
    }
  }

  return Object.keys(out).length === 0 ? undefined : out
}

type JsonSchemaNumberType = "number" | "integer"

function extractJsonSchemaNumberType(schema: JsonSchema.JsonSchema): {
  readonly type: JsonSchemaNumberType | undefined
  readonly schema: JsonSchema.JsonSchema
} {
  let type: JsonSchemaNumberType | undefined = schema.type === "number" || schema.type === "integer"
    ? schema.type
    : undefined
  let out = type === undefined ? schema : Object.fromEntries(Object.entries(schema).filter(([key]) => key !== "type"))
  if (Array.isArray(out.allOf)) {
    const members: Array<JsonSchema.JsonSchema> = []
    let changed = false
    for (const member of out.allOf) {
      const extracted = extractJsonSchemaNumberType(member)
      if (extracted.type !== undefined) {
        changed = true
        if (type === undefined || extracted.type === "integer") type = extracted.type
      }
      if (Object.keys(extracted.schema).length > 0) members.push(extracted.schema)
    }
    if (changed) {
      const { allOf: _, ...rest } = out
      out = members.length === 0 ? rest : { ...rest, allOf: members }
    }
  }
  return { type, schema: out }
}

function isJsonSchemaNumberEncoding(schema: JsonSchema.JsonSchema): boolean {
  return Array.isArray(schema.anyOf) && schema.anyOf.length === 4 && schema.anyOf[0]?.type === "number" &&
    schema.anyOf.slice(1).every((member) => member.type === "string")
}

function appendJsonSchema(
  left: JsonSchema.JsonSchema,
  right: JsonSchema.JsonSchema
): JsonSchema.JsonSchema {
  if (Object.keys(left).length === 0) return right
  const rightKeys = Object.keys(right)
  if (rightKeys.length === 0) return left
  const leftType = left.type === "number" || left.type === "integer" ? left.type : undefined
  if (leftType !== undefined || isJsonSchemaNumberEncoding(left)) {
    const extracted = extractJsonSchemaNumberType(right)
    if (extracted.type !== undefined) {
      const type = leftType === "integer" || extracted.type === "integer" ? "integer" : "number"
      const base = isJsonSchemaNumberEncoding(left)
        ? { ...Object.fromEntries(Object.entries(left).filter(([key]) => key !== "anyOf")), type }
        : { ...left, type }
      return Object.keys(extracted.schema).length === 0 ? base : appendJsonSchema(base, extracted.schema)
    }
  }
  const members = Array.isArray(right.allOf) && rightKeys.length === 1 ? right.allOf : [right]
  if (Array.isArray(left.allOf)) {
    return { ...left, allOf: [...left.allOf, ...members] }
  }
  if (typeof left.$ref === "string") {
    return { allOf: [left, ...members] }
  }
  return { ...left, allOf: members }
}

function compileJsonSchema(
  representations: readonly [
    SchemaRepresentation.Representation,
    ...Array<SchemaRepresentation.Representation>
  ],
  rootPaths: ReadonlyArray<Path>,
  references: SchemaRepresentation.References,
  options: Schema.ToJsonSchemaOptions | undefined
): JsonSchema.MultiDocument<"draft-2020-12"> {
  const definitions: Record<string, JsonSchema.JsonSchema> = {}
  for (const key of Object.keys(references)) {
    definitions[key] = recur(references[key], ["references", key])
  }
  const schemas = Arr.map(representations, (representation, index) => recur(representation, rootPaths[index]))
  return { dialect: "draft-2020-12", schemas, definitions }

  function annotationSchemas(
    annotations: Schema.Annotations.Annotations | undefined,
    path: Path
  ): ReadonlyArray<JsonSchema.JsonSchema> {
    const representation = getDataAnnotation(annotations, "representation") as
      | SchemaRepresentation.RepresentationAnnotation<SchemaRepresentation.Representation>
      | undefined
    const schemas = representation?.schemas ?? []
    return schemas.map((schema, index) => recur(schema, [...path, "representation", "schemas", index]))
  }

  function compileCheck(
    check: SchemaRepresentation.Check,
    type: JsonSchema.Type | undefined,
    path: Path
  ): JsonSchema.JsonSchema | undefined {
    const annotations = check.annotations
    const callback = getDataAnnotation(annotations, "toJsonSchema")
    if (callback !== undefined) {
      const schemas = annotationSchemas(annotations, [...path, "annotations"])
      const fragment = (callback as SchemaRepresentation.ToJsonSchema.Check)({ type, schemas })
      const ordinary = collectJsonSchemaAnnotations(annotations, options)
      return ordinary === undefined ? fragment : { ...fragment, ...ordinary }
    }
    if (check._tag === "Filter") return undefined

    const children = check.checks
      .map((child, index) => compileCheck(child, type, [...path, "checks", index]))
      .filter((child): child is JsonSchema.JsonSchema => child !== undefined)
    if (children.length === 0) {
      return undefined
    }
    const ordinary = collectJsonSchemaAnnotations(annotations, options)
    const fragment: JsonSchema.JsonSchema = { allOf: children }
    return ordinary === undefined ? fragment : { ...fragment, ...ordinary }
  }

  function recur(
    representation: SchemaRepresentation.Representation,
    path: Path
  ): JsonSchema.JsonSchema {
    if (representation._tag === "Reference") {
      if (!Object.hasOwn(references, representation.$ref)) {
        throw errorWithPath(`Invalid reference ${representation.$ref}`, [...path, "$ref"])
      }
      return { $ref: `#/$defs/${escapeToken(representation.$ref)}` }
    }

    let output = on(representation, path)
    const ordinary = collectJsonSchemaAnnotations(representation.annotations, options)
    if (ordinary !== undefined) {
      output = { ...output, ...ordinary }
    }
    for (let index = 0; index < representation.checks.length; index++) {
      const type = typeof output.type === "string" && isJsonSchemaType(output.type) ? output.type : undefined
      const check = compileCheck(representation.checks[index], type, [...path, "checks", index])
      if (check !== undefined) {
        output = appendJsonSchema(output, check)
      }
    }
    return output
  }

  function on(
    representation: Exclude<SchemaRepresentation.Representation, SchemaRepresentation.Reference>,
    path: Path
  ): JsonSchema.JsonSchema {
    switch (representation._tag) {
      case "Any":
      case "Unknown":
        return {}
      case "ObjectKeyword":
        return { anyOf: [{ type: "object" }, { type: "array" }] }
      case "Void":
      case "Undefined":
        return { type: "null" }
      case "BigInt":
        return { type: "string", allOf: [{ pattern: "^-?\\d+$" }] }
      case "Symbol":
      case "UniqueSymbol":
        return { type: "string", allOf: [{ pattern: "^Symbol\\((.*)\\)$" }] }
      case "Declaration": {
        const callback = getDataAnnotation(representation.annotations, "toJsonSchema")
        const callbackPath = [...path, "annotations", "toJsonSchema"]
        if (callback === undefined) {
          throw errorWithPath("Missing JSON Schema callback", callbackPath)
        }
        const typeParameters = representation.typeParameters.map((typeParameter, index) =>
          recur(typeParameter, [...path, "typeParameters", index])
        )
        const schemas = annotationSchemas(representation.annotations, [...path, "annotations"])
        return (callback as SchemaRepresentation.ToJsonSchema.Declaration)({ typeParameters, schemas })
      }
      case "Suspend":
        return recur(representation.thunk, [...path, "thunk"])
      case "Null":
        return { type: "null" }
      case "Never":
        return { not: {} }
      case "String": {
        const out: JsonSchema.JsonSchema = { type: "string" }
        if (representation.contentMediaType !== undefined) {
          out.contentMediaType = representation.contentMediaType
        }
        if (representation.contentSchema !== undefined) {
          out.contentSchema = recur(representation.contentSchema, [...path, "contentSchema"])
        }
        return out
      }
      case "Number":
        return {
          anyOf: [
            { type: "number" },
            { type: "string", enum: ["NaN"] },
            { type: "string", enum: ["Infinity"] },
            { type: "string", enum: ["-Infinity"] }
          ]
        }
      case "Boolean":
        return { type: "boolean" }
      case "Literal":
        return typeof representation.literal === "bigint"
          ? { type: "string", enum: [globalThis.String(representation.literal)] }
          : { type: typeof representation.literal, enum: [representation.literal] }
      case "Enum": {
        const types = representation.enums.map(([title, literal]) => ({
          type: typeof literal,
          enum: [literal],
          title
        }))
        return representation.enums.length === 0 ? { not: {} } : { anyOf: types }
      }
      case "TemplateLiteral":
        return { type: "string", pattern: `^${representation.parts.map(getPartPattern).join("")}$` }
      case "Arrays": {
        if (representation.rest.length > 1) {
          throw errorWithPath("Invalid schema representation document", [...path, "rest"])
        }
        const out: JsonSchema.JsonSchema = { type: "array" }
        let minItems = representation.elements.length
        const prefixItems = representation.elements.map((element, index) => {
          if (element.isOptional) minItems--
          const compiled = recur(element.type, [...path, "elements", index, "type"])
          const annotations = collectJsonSchemaAnnotations(element.annotations, options)
          return annotations === undefined ? compiled : appendJsonSchema(compiled, annotations)
        })
        if (prefixItems.length > 0) {
          out.prefixItems = prefixItems
          out.maxItems = representation.elements.length
          if (minItems > 0) out.minItems = minItems
        } else {
          out.items = false
        }
        if (representation.rest.length === 1) {
          delete out.maxItems
          const rest = recur(representation.rest[0], [...path, "rest", 0])
          if (Object.keys(rest).length > 0) out.items = rest
          else delete out.items
        }
        return out
      }
      case "Objects": {
        if (representation.propertySignatures.length === 0 && representation.indexSignatures.length === 0) {
          return { anyOf: [{ type: "object" }, { type: "array" }] }
        }
        const out: JsonSchema.JsonSchema = { type: "object" }
        const properties: Record<string, JsonSchema.JsonSchema> = {}
        const required: Array<string> = []
        for (let index = 0; index < representation.propertySignatures.length; index++) {
          const property = representation.propertySignatures[index]
          if (typeof property.name !== "string") {
            throw errorWithPath("Invalid schema representation document", [
              ...path,
              "propertySignatures",
              index,
              "name"
            ])
          }
          const compiled = recur(property.type, [...path, "propertySignatures", index, "type"])
          const annotations = collectJsonSchemaAnnotations(property.annotations, options)
          properties[property.name] = annotations === undefined ? compiled : appendJsonSchema(compiled, annotations)
          if (!property.isOptional) required.push(property.name)
        }
        if (Object.keys(properties).length > 0) out.properties = properties
        if (required.length > 0) out.required = required
        out.additionalProperties = options?.additionalProperties ?? false
        const patternProperties: Record<string, JsonSchema.JsonSchema | false> = {}
        for (let index = 0; index < representation.indexSignatures.length; index++) {
          const signature = representation.indexSignatures[index]
          let type: JsonSchema.JsonSchema | false = recur(
            signature.type,
            [...path, "indexSignatures", index, "type"]
          )
          if (Object.keys(type).length === 1 && "not" in type) type = false
          const patterns = getParameterPatterns(
            signature.parameter,
            [...path, "indexSignatures", index, "parameter"],
            new Set()
          )
          if (patterns.length === 0) {
            out.additionalProperties = type
          } else {
            for (const pattern of patterns) patternProperties[pattern] = type
          }
        }
        if (Object.keys(patternProperties).length > 0) {
          out.patternProperties = patternProperties
          delete out.additionalProperties
        }
        if (
          typeof out.additionalProperties === "object" &&
          out.additionalProperties !== null &&
          Object.keys(out.additionalProperties).length === 0
        ) {
          delete out.additionalProperties
        }
        return out
      }
      case "Union": {
        const types = representation.types.map((type, index) => recur(type, [...path, "types", index]))
        if (types.length === 0) return { not: {} }
        if (types.length > 1) {
          const compacted = compactEnums(types)
          if (compacted !== undefined) return compacted
        }
        return representation.mode === "anyOf" ? { anyOf: types } : { oneOf: types }
      }
    }
  }

  function getParameterPatterns(
    parameter: SchemaRepresentation.Representation,
    path: Path,
    seenReferences: ReadonlySet<string>
  ): ReadonlyArray<string> {
    switch (parameter._tag) {
      case "Reference": {
        if (!Object.hasOwn(references, parameter.$ref)) {
          throw errorWithPath(`Invalid reference ${parameter.$ref}`, [...path, "$ref"])
        }
        if (seenReferences.has(parameter.$ref)) return []
        const next = new Set(seenReferences)
        next.add(parameter.$ref)
        return getParameterPatterns(references[parameter.$ref], ["references", parameter.$ref], next)
      }
      case "String":
        return collectPatterns(recur(parameter, path))
      case "TemplateLiteral":
        return [`^${parameter.parts.map(getPartPattern).join("")}$`]
      case "Union":
        return parameter.types.flatMap((type, index) =>
          getParameterPatterns(type, [...path, "types", index], seenReferences)
        )
      default:
        throw errorWithPath("Invalid schema representation document", path)
    }
  }
}

function isJsonSchemaType(input: string): input is JsonSchema.Type {
  return input === "string" || input === "number" || input === "boolean" || input === "array" ||
    input === "object" || input === "null" || input === "integer"
}

function compactEnums(
  schemas: ReadonlyArray<JsonSchema.JsonSchema>
): JsonSchema.JsonSchema | undefined {
  let sharedType: unknown = undefined
  const values: Array<unknown> = []
  for (const schema of schemas) {
    const keys = Object.keys(schema)
    if (keys.length !== 2 || schema.type === undefined || !Array.isArray(schema.enum) || schema.enum.length === 0) {
      return undefined
    }
    if (sharedType === undefined) sharedType = schema.type
    else if (schema.type !== sharedType) return undefined
    values.push(...schema.enum)
  }
  return { type: sharedType, enum: values }
}

function collectPatterns(schema: JsonSchema.JsonSchema): ReadonlyArray<string> {
  const patterns: Array<string> = []
  if (typeof schema.pattern === "string") patterns.push(schema.pattern)
  for (const key of ["allOf", "anyOf", "oneOf"] as const) {
    const members = schema[key]
    if (Array.isArray(members)) {
      for (const member of members) {
        if (typeof member === "object" && member !== null && !Array.isArray(member)) {
          patterns.push(...collectPatterns(member))
        }
      }
    }
  }
  return patterns
}

function getPartPattern(part: SchemaRepresentation.Representation): string {
  switch (part._tag) {
    case "Literal":
      return RegEx.escape(globalThis.String(part.literal))
    case "String":
      return SchemaAST.STRING_PATTERN
    case "Number":
      return SchemaAST.FINITE_PATTERN
    case "TemplateLiteral":
      return part.parts.map(getPartPattern).join("")
    case "Union":
      return part.types.map(getPartPattern).join("|")
    default:
      throw errorWithPath("Invalid schema representation document", [])
  }
}

/** @internal */
export function toJsonSchemaDocument(
  document: SchemaRepresentation.Document,
  options?: Schema.ToJsonSchemaOptions
): JsonSchema.Document<"draft-2020-12"> {
  const output = compileJsonSchema(
    [document.representation],
    [["representation"]],
    document.references,
    options
  )
  return {
    dialect: output.dialect,
    schema: output.schemas[0],
    definitions: output.definitions
  }
}

/** @internal */
export function toJsonSchemaMultiDocument(
  document: SchemaRepresentation.MultiDocument,
  options?: Schema.ToJsonSchemaOptions
): JsonSchema.MultiDocument<"draft-2020-12"> {
  return compileJsonSchema(
    document.representations,
    document.representations.map((_, index) => ["representations", index]),
    document.references,
    options
  )
}

/** @internal */
export function makeCode(runtime: string, Type: string): SchemaRepresentation.Code {
  return { runtime, Type }
}

const codeAnnotationExcludedKeys: ReadonlySet<string> = new Set([
  "representation",
  "toJsonSchema",
  "toCode",
  "arbitrary",
  "toArbitrary",
  "toEquivalence",
  "toFormatter",
  "toCodec",
  "toCodecJson",
  "toCodecIso",
  "identifier",
  "brands",
  "contentMediaType",
  "contentSchema"
])

function renderNumber(value: number): string {
  if (Object.is(value, -0)) return "-0"
  if (Number.isNaN(value)) return "NaN"
  if (value === Infinity) return "Infinity"
  if (value === -Infinity) return "-Infinity"
  return globalThis.String(value)
}

function renderEmittableAnnotation(
  input: unknown,
  ancestors: ReadonlySet<object> = new Set()
): string | undefined {
  if (input === null) return "null"
  if (typeof input === "string") return JSON.stringify(input)
  if (typeof input === "boolean") return globalThis.String(input)
  if (typeof input === "number") return renderNumber(input)
  if (typeof input === "bigint") return `${input}n`
  if (typeof input === "symbol") {
    const key = globalThis.Symbol.keyFor(input)
    return key === undefined ? undefined : `Symbol.for(${JSON.stringify(key)})`
  }
  if (typeof input !== "object" || ancestors.has(input)) return undefined

  const nextAncestors = new Set(ancestors)
  nextAncestors.add(input)
  if (Array.isArray(input)) {
    const data = readArrayData(input)
    if (data._tag === "Failure") return undefined
    const values: Array<string> = []
    for (const value of data.values) {
      const rendered = renderEmittableAnnotation(value, nextAncestors)
      if (rendered === undefined) return undefined
      values.push(rendered)
    }
    return `[${values.join(", ")}]`
  }

  const prototype = Object.getPrototypeOf(input)
  if (prototype !== Object.prototype && prototype !== null) return undefined
  const entries: Array<string> = []
  const descriptors = Object.getOwnPropertyDescriptors(input)
  for (const key of Reflect.ownKeys(descriptors)) {
    if (typeof key !== "string") return undefined
    const descriptor = descriptors[key]
    if (!isDataDescriptor(descriptor) || descriptor.enumerable !== true) return undefined
    const rendered = renderEmittableAnnotation(descriptor.value, nextAncestors)
    if (rendered === undefined) return undefined
    entries.push(`${JSON.stringify(key)}: ${rendered}`)
  }
  return `{ ${entries.join(", ")} }`
}

function renderAnnotations(
  annotations: Schema.Annotations.Annotations | undefined
): string | undefined {
  if (annotations === undefined) return undefined
  const entries: Array<string> = []
  const descriptors = Object.getOwnPropertyDescriptors(annotations)
  for (const key of Reflect.ownKeys(descriptors)) {
    if (
      typeof key !== "string" ||
      key.startsWith("~") ||
      codeAnnotationExcludedKeys.has(key)
    ) {
      continue
    }
    const descriptor = descriptors[key]
    if (!isDataDescriptor(descriptor) || descriptor.enumerable !== true || descriptor.value === undefined) {
      continue
    }
    const rendered = renderEmittableAnnotation(descriptor.value)
    if (rendered !== undefined) {
      entries.push(`${JSON.stringify(key)}: ${rendered}`)
    }
  }
  return entries.length === 0 ? undefined : `{ ${entries.join(", ")} }`
}

/** @internal */
export function sanitizeJavaScriptIdentifier(input: string): string {
  if (input.length === 0) return "_"
  const out = input.replace(/[^A-Za-z0-9_$]/gu, "_")
  const first = out[0]
  return first >= "a" && first <= "z"
    ? first.toUpperCase() + out.slice(1)
    : first >= "0" && first <= "9"
    ? `_${out}`
    : out
}

function renderLiteral(value: string | number | boolean | bigint): string {
  switch (typeof value) {
    case "string":
      return JSON.stringify(value)
    case "number":
      return renderNumber(value)
    case "boolean":
      return globalThis.String(value)
    case "bigint":
      return `${value}n`
  }
}

function isSimpleLiveLiteral(
  representation: SchemaRepresentation.Representation
): representation is SchemaRepresentation.Literal {
  return representation._tag === "Literal" && representation.checks.length === 0 &&
    representation.annotations === undefined
}

function toTypeParts(parts: ReadonlyArray<SchemaRepresentation.Representation>): ReadonlyArray<string> {
  if (parts.length === 0) return [""]
  const [first, ...rest] = parts
  const suffixes = toTypeParts(rest)
  return toTypePart(first).flatMap((prefix) => suffixes.map((suffix) => prefix + suffix))
}

function toTypePart(part: SchemaRepresentation.Representation): ReadonlyArray<string> {
  switch (part._tag) {
    case "Literal":
      return [globalThis.String(part.literal)]
    case "String":
      return ["${string}"]
    case "Number":
      return ["${number}"]
    case "BigInt":
      return ["${bigint}"]
    case "TemplateLiteral":
      return toTypeParts(part.parts)
    case "Union":
      return part.types.flatMap(toTypePart)
    default:
      return []
  }
}

export interface TopologicalSort {
  readonly nonRecursives: ReadonlyArray<{
    readonly $ref: string
    readonly representation: SchemaRepresentation.Representation
  }>
  readonly recursives: Readonly<Record<string, SchemaRepresentation.Representation>>
}

/** @internal */
export function topologicalSort(
  references: SchemaRepresentation.References
): TopologicalSort {
  const identifiers = Object.keys(references)
  const identifierSet = new Set(identifiers)

  function collectRefs(root: SchemaRepresentation.Representation): ReadonlySet<string> {
    const refs = new Set<string>()
    const visited = new WeakSet<object>()
    const stack: Array<SchemaRepresentation.Representation> = [root]

    function pushAnnotationSchemas(annotations: Schema.Annotations.Annotations | undefined): void {
      const representation = getDataAnnotation(annotations, "representation") as
        | SchemaRepresentation.RepresentationAnnotation<SchemaRepresentation.Representation>
        | undefined
      if (representation?.schemas !== undefined) stack.push(...representation.schemas)
    }

    function pushChecks(
      checks: ReadonlyArray<SchemaRepresentation.Check>
    ): void {
      for (const check of checks) {
        pushAnnotationSchemas(check.annotations)
        if (check._tag === "FilterGroup") pushChecks(check.checks)
      }
    }

    while (stack.length > 0) {
      const representation = stack.pop()!
      if (visited.has(representation)) continue
      visited.add(representation)
      if (representation._tag === "Reference") {
        if (identifierSet.has(representation.$ref)) refs.add(representation.$ref)
        continue
      }

      pushAnnotationSchemas(representation.annotations)
      pushChecks(representation.checks)
      switch (representation._tag) {
        case "Declaration":
          stack.push(...representation.typeParameters)
          break
        case "Suspend":
          stack.push(representation.thunk)
          break
        case "String":
          if (representation.contentSchema !== undefined) stack.push(representation.contentSchema)
          break
        case "TemplateLiteral":
          stack.push(...representation.parts)
          break
        case "Arrays":
          for (const element of representation.elements) stack.push(element.type)
          stack.push(...representation.rest)
          break
        case "Objects":
          for (const property of representation.propertySignatures) stack.push(property.type)
          for (const signature of representation.indexSignatures) {
            stack.push(signature.parameter, signature.type)
          }
          break
        case "Union":
          stack.push(...representation.types)
          break
      }
    }
    return refs
  }

  const dependencies = new Map<string, ReadonlySet<string>>(
    identifiers.map((identifier) => [identifier, collectRefs(references[identifier])])
  )
  const recursive = new Set<string>()
  const state = new Map<string, 0 | 1 | 2>()
  const stack: Array<string> = []
  const stackIndexes = new Map<string, number>()

  function visit(identifier: string): void {
    const current = state.get(identifier) ?? 0
    if (current === 1) {
      const start = stackIndexes.get(identifier)!
      for (let index = start; index < stack.length; index++) recursive.add(stack[index])
      return
    }
    if (current === 2) return
    state.set(identifier, 1)
    stackIndexes.set(identifier, stack.length)
    stack.push(identifier)
    for (const dependency of dependencies.get(identifier)!) visit(dependency)
    stack.pop()
    stackIndexes.delete(identifier)
    state.set(identifier, 2)
  }

  for (const identifier of identifiers) visit(identifier)

  const inDegree = new Map<string, number>()
  const dependents = new Map<string, Set<string>>()
  for (const identifier of identifiers) {
    if (!recursive.has(identifier)) {
      inDegree.set(identifier, 0)
      dependents.set(identifier, new Set())
    }
  }
  for (const [identifier, internalDependencies] of dependencies) {
    if (recursive.has(identifier)) continue
    for (const dependency of internalDependencies) {
      if (recursive.has(dependency)) continue
      inDegree.set(identifier, inDegree.get(identifier)! + 1)
      dependents.get(dependency)!.add(identifier)
    }
  }

  const queue: Array<string> = []
  for (const [identifier, degree] of inDegree) {
    if (degree === 0) queue.push(identifier)
  }
  const nonRecursives: Array<{
    readonly $ref: string
    readonly representation: SchemaRepresentation.Representation
  }> = []
  for (let index = 0; index < queue.length; index++) {
    const $ref = queue[index]
    nonRecursives.push({ $ref, representation: references[$ref] })
    for (const dependent of dependents.get($ref)!) {
      const degree = inDegree.get(dependent)! - 1
      inDegree.set(dependent, degree)
      if (degree === 0) queue.push(dependent)
    }
  }
  const recursives: Record<string, SchemaRepresentation.Representation> = {}
  for (const identifier of recursive) recursives[identifier] = references[identifier]
  return { nonRecursives, recursives }
}

function compileCodeDocument(
  document: SchemaRepresentation.MultiDocument
): SchemaRepresentation.CodeDocument {
  const artifacts: Array<SchemaRepresentation.Artifact> = []
  const sorted = topologicalSort(document.references)
  const sanitizedReferences = new Map<string, string>()
  const uniqueIdentifiers = new Set<string>()
  let compilingRecursiveDefinition = false
  let explicitSuspendDepth = 0

  for (const { $ref } of sorted.nonRecursives) ensureUniqueIdentifier($ref)
  for (const $ref of Object.keys(sorted.recursives)) ensureUniqueIdentifier($ref)

  const nonRecursives = sorted.nonRecursives.map(({ $ref, representation }) => ({
    $ref: ensureUniqueIdentifier($ref),
    code: recur(representation, ["references", $ref])
  }))
  const recursives: Record<string, SchemaRepresentation.Code> = {}
  for (const [$ref, representation] of Object.entries(sorted.recursives)) {
    compilingRecursiveDefinition = true
    recursives[ensureUniqueIdentifier($ref)] = recur(representation, ["references", $ref])
    compilingRecursiveDefinition = false
  }
  const codes = document.representations.map((representation, index) =>
    recur(representation, ["representations", index])
  )

  return {
    codes,
    references: { nonRecursives, recursives },
    artifacts
  }

  function ensureUniqueIdentifier(original: string): string {
    const existing = sanitizedReferences.get(original)
    if (existing !== undefined) return existing
    const candidate = freshIdentifier(original)
    sanitizedReferences.set(original, candidate)
    return candidate
  }

  function freshIdentifier(seed: string): string {
    const sanitized = sanitizeJavaScriptIdentifier(seed)
    let candidate = sanitized
    let suffix = 0
    while (uniqueIdentifiers.has(candidate)) candidate = `${sanitized}${++suffix}`
    uniqueIdentifiers.add(candidate)
    return candidate
  }

  function addImport(importDeclaration: string): void {
    if (!artifacts.some((artifact) => artifact._tag === "Import" && artifact.importDeclaration === importDeclaration)) {
      artifacts.push({ _tag: "Import", importDeclaration })
    }
  }

  function addImports(importDeclarations: ReadonlyArray<string>): void {
    for (const importDeclaration of importDeclarations) addImport(importDeclaration)
  }

  function addSymbol(symbol: symbol): string {
    const identifier = freshIdentifier("_symbol")
    const key = globalThis.Symbol.keyFor(symbol)
    const description = symbol.description
    artifacts.push({
      _tag: "Symbol",
      identifier,
      code: makeCode(
        key === undefined
          ? `Symbol(${description === undefined ? "" : JSON.stringify(description)})`
          : `Symbol.for(${JSON.stringify(key)})`,
        `typeof ${identifier}`
      )
    })
    return identifier
  }

  function addEnum(representation: SchemaRepresentation.Enum): string {
    const identifier = freshIdentifier("_Enum")
    artifacts.push({
      _tag: "Enum",
      identifier,
      code: makeCode(
        `enum ${identifier} { ${
          representation.enums.map(([name, value]) => `${JSON.stringify(name)} = ${renderLiteral(value)}`).join(", ")
        } }`,
        `typeof ${identifier}`
      )
    })
    return identifier
  }

  function annotationSchemas(
    annotations: Schema.Annotations.Annotations | undefined,
    path: Path
  ): ReadonlyArray<SchemaRepresentation.Code> {
    const representation = getDataAnnotation(annotations, "representation") as
      | SchemaRepresentation.RepresentationAnnotation<SchemaRepresentation.Representation>
      | undefined
    const schemas = representation?.schemas ?? []
    return schemas.map((schema, index) => recur(schema, [...path, "representation", "schemas", index]))
  }

  function checkBrands(
    check: SchemaRepresentation.Check
  ): ReadonlyArray<string> {
    const own = InternalAnnotations.collectBrands(check.annotations)
    if (
      check._tag === "FilterGroup" &&
      getDataAnnotation(check.annotations, "toCode") === undefined
    ) {
      return [...own, ...check.checks.flatMap(checkBrands)]
    }
    return own
  }

  function runtimeBrands(brands: ReadonlyArray<string>): string {
    return brands.length === 0
      ? ""
      : `.pipe(${brands.map((brand) => `Schema.brand(${JSON.stringify(brand)})`).join(", ")})`
  }

  function typeBrands(brands: ReadonlyArray<string>): string {
    if (brands.length === 0) return ""
    addImport(`import type * as Brand from "effect/Brand"`)
    return brands.map((brand) => ` & Brand.Brand<${JSON.stringify(brand)}>`).join("")
  }

  function runtimeAnnotate(
    annotations: Schema.Annotations.Annotations | undefined,
    method: "annotate" | "annotateKey" = "annotate"
  ): string {
    const rendered = renderAnnotations(annotations)
    return rendered === undefined ? "" : `.${method}(${rendered})`
  }

  function compileCheck(
    check: SchemaRepresentation.Check,
    path: Path
  ): string {
    const callback = getDataAnnotation(check.annotations, "toCode")
    const callbackPath = [...path, "annotations", "toCode"]
    let runtime: string
    if (callback !== undefined) {
      const schemas = annotationSchemas(check.annotations, [...path, "annotations"])
      const output = (callback as SchemaRepresentation.Generation.Check)({ schemas })
      addImports(output.importDeclarations ?? [])
      runtime = output.runtime
    } else if (check._tag === "Filter") {
      throw errorWithPath("Missing toCode callback", callbackPath)
    } else {
      runtime = `Schema.makeFilterGroup([${
        check.checks.map((child, index) => compileCheck(child, [...path, "checks", index])).join(", ")
      }])`
    }
    runtime += runtimeAnnotate(check.annotations)
    if (check._tag === "Filter" && check.aborted) runtime += ".abort()"
    return runtime
  }

  function applyNode(
    base: SchemaRepresentation.Code,
    representation: Exclude<SchemaRepresentation.Representation, SchemaRepresentation.Reference>,
    path: Path,
    includeTypeBrands: boolean = true
  ): SchemaRepresentation.Code {
    const nodeBrands = InternalAnnotations.collectBrands(representation.annotations)
    let runtime = base.runtime + runtimeAnnotate(representation.annotations) + runtimeBrands(nodeBrands)
    let Type = base.Type + (includeTypeBrands ? typeBrands(nodeBrands) : "")
    for (let index = 0; index < representation.checks.length; index++) {
      const check = representation.checks[index]
      const brands = checkBrands(check)
      runtime += `.check(${compileCheck(check, [...path, "checks", index])})${runtimeBrands(brands)}`
      if (includeTypeBrands) Type += typeBrands(brands)
    }
    return makeCode(runtime, Type)
  }

  function recurString(
    representation: SchemaRepresentation.String,
    path: Path
  ): SchemaRepresentation.Code {
    const contentSchema = representation.contentSchema === undefined
      ? undefined
      : recur(representation.contentSchema, [...path, "contentSchema"])
    const isJson = representation.contentMediaType === "application/json" && contentSchema !== undefined
    const structuralAnnotations: Array<string> = []
    if (representation.contentMediaType !== undefined) {
      structuralAnnotations.push(`"contentMediaType": ${JSON.stringify(representation.contentMediaType)}`)
    }
    if (contentSchema !== undefined) {
      addImport(`import * as SchemaAST from "effect/SchemaAST"`)
      structuralAnnotations.push(
        `"contentSchema": SchemaAST.toEncoded(${isJson ? "contentSchema" : contentSchema.runtime}.ast)`
      )
    }
    const structural = structuralAnnotations.length === 0
      ? ""
      : `.annotate({ ${structuralAnnotations.join(", ")} })`
    const source = applyNode(
      makeCode(`Schema.String${structural}`, "string"),
      representation,
      path,
      !isJson
    )
    if (!isJson || contentSchema === undefined) return source
    addImport(`import * as SchemaTransformation from "effect/SchemaTransformation"`)
    return makeCode(
      `(<S extends Schema.Top>(contentSchema: S) => ${source.runtime}.pipe(Schema.decodeTo(contentSchema, SchemaTransformation.fromJsonString)))(${contentSchema.runtime})`,
      contentSchema.Type
    )
  }

  function recur(
    representation: SchemaRepresentation.Representation,
    path: Path
  ): SchemaRepresentation.Code {
    if (representation._tag === "Reference") {
      if (!Object.hasOwn(document.references, representation.$ref)) {
        throw errorWithPath(`Invalid reference ${representation.$ref}`, [...path, "$ref"])
      }
      const identifier = ensureUniqueIdentifier(representation.$ref)
      if (
        compilingRecursiveDefinition && explicitSuspendDepth === 0 &&
        Object.hasOwn(sorted.recursives, representation.$ref)
      ) {
        return makeCode(`Schema.suspend((): Schema.Codec<${identifier}> => ${identifier})`, identifier)
      }
      return makeCode(identifier, identifier)
    }
    if (representation._tag === "String") return recurString(representation, path)
    return applyNode(on(representation, path), representation, path)
  }

  function on(
    representation: Exclude<
      SchemaRepresentation.Representation,
      SchemaRepresentation.Reference | SchemaRepresentation.String
    >,
    path: Path
  ): SchemaRepresentation.Code {
    switch (representation._tag) {
      case "Declaration": {
        const callback = getDataAnnotation(representation.annotations, "toCode")
        const callbackPath = [...path, "annotations", "toCode"]
        if (callback === undefined) {
          throw errorWithPath("Missing toCode callback", callbackPath)
        }
        const typeParameters = representation.typeParameters.map((typeParameter, index) =>
          recur(typeParameter, [...path, "typeParameters", index])
        )
        const schemas = annotationSchemas(representation.annotations, [...path, "annotations"])
        const output = (callback as SchemaRepresentation.Generation.Declaration)({ typeParameters, schemas })
        addImports(output.importDeclarations ?? [])
        return makeCode(output.runtime, output.Type)
      }
      case "Suspend": {
        explicitSuspendDepth++
        const thunk = recur(representation.thunk, [...path, "thunk"])
        explicitSuspendDepth--
        return makeCode(`Schema.suspend((): Schema.Codec<${thunk.Type}> => ${thunk.runtime})`, thunk.Type)
      }
      case "Null":
        return makeCode("Schema.Null", "null")
      case "Undefined":
        return makeCode("Schema.Undefined", "undefined")
      case "Void":
        return makeCode("Schema.Void", "void")
      case "Never":
        return makeCode("Schema.Never", "never")
      case "Unknown":
        return makeCode("Schema.Unknown", "unknown")
      case "Any":
        return makeCode("Schema.Any", "any")
      case "Number":
        return makeCode("Schema.Number", "number")
      case "Boolean":
        return makeCode("Schema.Boolean", "boolean")
      case "BigInt":
        return makeCode("Schema.BigInt", "bigint")
      case "Symbol":
        return makeCode("Schema.Symbol", "symbol")
      case "Literal": {
        const literal = renderLiteral(representation.literal)
        return makeCode(`Schema.Literal(${literal})`, literal)
      }
      case "UniqueSymbol": {
        const identifier = addSymbol(representation.symbol)
        return makeCode(`Schema.UniqueSymbol(${identifier})`, `typeof ${identifier}`)
      }
      case "ObjectKeyword":
        return makeCode("Schema.ObjectKeyword", "object")
      case "Enum": {
        const identifier = addEnum(representation)
        return makeCode(`Schema.Enum(${identifier})`, `typeof ${identifier}`)
      }
      case "TemplateLiteral": {
        const parts = representation.parts.map((part, index) => recur(part, [...path, "parts", index]))
        const Type = toTypeParts(representation.parts).map((part) => `\`${part}\``).join(" | ")
        return makeCode(`Schema.TemplateLiteral([${parts.map((part) => part.runtime).join(", ")}])`, Type)
      }
      case "Arrays": {
        const elements = representation.elements.map((element, index) => ({
          ...element,
          type: recur(element.type, [...path, "elements", index, "type"])
        }))
        const rest = representation.rest.map((item, index) => recur(item, [...path, "rest", index]))
        if (Arr.isArrayNonEmpty(rest)) {
          const item = rest[0]
          if (elements.length === 0 && rest.length === 1) {
            return makeCode(`Schema.Array(${item.runtime})`, `ReadonlyArray<${item.Type}>`)
          }
          const post = rest.slice(1)
          return makeCode(
            `Schema.TupleWithRest(Schema.Tuple([${
              elements.map((element) =>
                `${element.isOptional ? "Schema.optionalKey(" : ""}${element.type.runtime}${
                  element.isOptional ? ")" : ""
                }${runtimeAnnotate(element.annotations, "annotateKey")}`
              ).join(", ")
            }]), [${rest.map((item) => item.runtime).join(", ")}])`,
            `readonly [${
              elements.map((element) => `${element.type.Type}${element.isOptional ? "?" : ""}`).join(", ")
            }, ...Array<${item.Type}>${post.length > 0 ? `, ${post.map((item) => item.Type).join(", ")}` : ""}]`
          )
        }
        return makeCode(
          `Schema.Tuple([${
            elements.map((element) =>
              `${element.isOptional ? "Schema.optionalKey(" : ""}${element.type.runtime}${
                element.isOptional ? ")" : ""
              }${runtimeAnnotate(element.annotations, "annotateKey")}`
            ).join(", ")
          }])`,
          `readonly [${elements.map((element) => `${element.type.Type}${element.isOptional ? "?" : ""}`).join(", ")}]`
        )
      }
      case "Objects": {
        const properties = representation.propertySignatures.map((property, index) => {
          const isSymbol = typeof property.name === "symbol"
          const name = isSymbol
            ? addSymbol(property.name as symbol)
            : formatPropertyKey(property.name)
          const type = recur(property.type, [...path, "propertySignatures", index, "type"])
          let runtime = type.runtime
          if (property.isMutable) runtime = `Schema.mutableKey(${runtime})`
          if (property.isOptional) runtime = `Schema.optionalKey(${runtime})`
          const runtimeName = isSymbol ? `[${name}]` : name
          const typeName = `${property.isMutable ? "" : "readonly "}${runtimeName}${property.isOptional ? "?" : ""}`
          return makeCode(
            `${runtimeName}: ${runtime}${runtimeAnnotate(property.annotations, "annotateKey")}`,
            `${typeName}: ${type.Type}`
          )
        })
        const indexSignatures = representation.indexSignatures.map((signature, index) => ({
          parameter: recur(signature.parameter, [...path, "indexSignatures", index, "parameter"]),
          type: recur(signature.type, [...path, "indexSignatures", index, "type"])
        }))
        if (indexSignatures.length === 0) {
          return makeCode(
            `Schema.Struct({ ${properties.map((property) => property.runtime).join(", ")} })`,
            `{ ${properties.map((property) => property.Type).join(", ")} }`
          )
        }
        if (properties.length === 0 && indexSignatures.length === 1) {
          const signature = indexSignatures[0]
          return makeCode(
            `Schema.Record(${signature.parameter.runtime}, ${signature.type.runtime})`,
            `{ readonly [x: ${signature.parameter.Type}]: ${signature.type.Type} }`
          )
        }
        const indexRuntimes = indexSignatures.map((signature) =>
          `Schema.Record(${signature.parameter.runtime}, ${signature.type.runtime})`
        ).join(", ")
        const indexTypes = indexSignatures.map((signature) =>
          `readonly [x: ${signature.parameter.Type}]: ${signature.type.Type}`
        ).join(", ")
        return makeCode(
          `Schema.StructWithRest(Schema.Struct({ ${
            properties.map((property) => property.runtime).join(", ")
          } }), [${indexRuntimes}])`,
          `{ ${properties.map((property) => property.Type).join(", ")}${
            properties.length > 0 ? ", " : ""
          }${indexTypes} }`
        )
      }
      case "Union": {
        if (representation.types.length === 0) return makeCode("Schema.Never", "never")
        if (representation.types.every(isSimpleLiveLiteral)) {
          const literals = representation.types.map((literal) => renderLiteral(literal.literal))
          return literals.length === 1
            ? makeCode(`Schema.Literal(${literals[0]})`, literals[0])
            : makeCode(`Schema.Literals([${literals.join(", ")}])`, literals.join(" | "))
        }
        const types = representation.types.map((type, index) => recur(type, [...path, "types", index]))
        const mode = representation.mode === "anyOf" ? "" : `, { mode: "oneOf" }`
        return makeCode(
          `Schema.Union([${types.map((type) => type.runtime).join(", ")}]${mode})`,
          types.map((type) => type.Type).join(" | ")
        )
      }
    }
  }
}

/** @internal */
export function toCodeDocument(
  document: SchemaRepresentation.MultiDocument
): SchemaRepresentation.CodeDocument {
  return compileCodeDocument(document)
}

/** @internal */
export function fromSchemaMultiDocument(
  document: SchemaRepresentation.SchemaMultiDocument
): SchemaRepresentation.MultiDocument {
  const definitions = Object.entries(document.definitions).map(([key, schema]) => {
    const original = schema.ast
    const encoded = SchemaAST.toEncoded(original)
    const body = SchemaAST.isSuspend(encoded) ? encoded.thunk() : encoded
    return { key, original, encoded, body }
  })
  const asts = Arr.map(document.schemas, (schema) => SchemaAST.toEncoded(schema.ast))
  return lowerASTs(asts, definitions)
}

/** @internal */
export function fromAST(ast: SchemaAST.AST): SchemaRepresentation.Document {
  const { references, representations } = fromASTs([ast])
  return { representation: representations[0], references }
}

/** @internal */
export function fromEncodedAST(
  ast: SchemaAST.AST
): SchemaRepresentation.Document {
  const { references, representations } = fromEncodedASTs([ast])
  return { representation: representations[0], references }
}

/** @internal */
export function fromEncodedASTs(
  asts: readonly [SchemaAST.AST, ...Array<SchemaAST.AST>]
): SchemaRepresentation.MultiDocument {
  return lowerASTs(asts, [], true)
}

/** @internal */
export function fromASTs(
  asts: readonly [SchemaAST.AST, ...Array<SchemaAST.AST>]
): SchemaRepresentation.MultiDocument {
  return lowerASTs(Arr.map(asts, (ast) => SchemaAST.toType(ast)), [])
}

interface ExternalDefinition {
  readonly key: string
  readonly original: SchemaAST.AST
  readonly encoded: SchemaAST.AST
  readonly body: SchemaAST.AST
}

function lowerASTs(
  asts: readonly [SchemaAST.AST, ...Array<SchemaAST.AST>],
  externalDefinitions: ReadonlyArray<ExternalDefinition>,
  encoded = false
): SchemaRepresentation.MultiDocument {
  const references: Record<string, SchemaRepresentation.Representation> = {}
  const referenceMap = new Map<SchemaAST.AST, string>()
  const uniqueReferences = new Set(externalDefinitions.map((definition) => definition.key))
  const visiting = new Set<SchemaAST.AST>()
  const externalBodyReferences = new Map<SchemaAST.AST, string | null>()

  for (const definition of externalDefinitions) {
    referenceMap.set(definition.original, definition.key)
    referenceMap.set(definition.encoded, definition.key)
    externalBodyReferences.set(
      definition.body,
      externalBodyReferences.has(definition.body) ? null : definition.key
    )
  }

  const representations = Arr.map(asts, (ast) => recur(ast))

  for (const definition of externalDefinitions) {
    references[definition.key] = recur(definition.body, definition.key)
  }

  return { representations, references }

  function generateReference(prefix: string): string {
    let candidate = prefix
    let suffix = 0
    while (uniqueReferences.has(candidate)) {
      candidate = `${prefix}${++suffix}`
    }
    uniqueReferences.add(candidate)
    return candidate
  }

  function recur(
    ast: SchemaAST.AST,
    ownedReference?: string,
    inheritedIdentifier?: string
  ): SchemaRepresentation.Representation {
    let found = referenceMap.get(ast)
    if (found === undefined && SchemaAST.isSuspend(ast)) {
      const bodyReference = externalBodyReferences.get(ast.thunk())
      if (bodyReference !== undefined && bodyReference !== null) {
        found = bodyReference
        referenceMap.set(ast, bodyReference)
      }
    }
    if (found !== undefined && found !== ownedReference) {
      return { _tag: "Reference", $ref: found }
    }

    let identifier = inheritedIdentifier
    if (encoded) {
      const projected = SchemaAST.getLastEncoding(ast)
      identifier = InternalAnnotations.resolveIdentifier(ast) ?? identifier
      if (projected !== ast) {
        return recur(projected, ownedReference, identifier)
      }
    }

    identifier = ownedReference === undefined ? identifier ?? InternalAnnotations.resolveIdentifier(ast) : undefined
    if (identifier !== undefined) {
      const reference = generateReference(identifier)
      referenceMap.set(ast, reference)
      const representation = on(ast)
      const existing = references[identifier]
      if (existing !== undefined && Equal.equals(representation, existing)) {
        referenceMap.set(ast, identifier)
        return { _tag: "Reference", $ref: identifier }
      }
      references[reference] = representation
      return { _tag: "Reference", $ref: reference }
    }

    if (visiting.has(ast)) {
      const reference = generateReference(`${ast._tag}_`)
      referenceMap.set(ast, reference)
      return { _tag: "Reference", $ref: reference }
    }

    visiting.add(ast)
    const representation = on(ast)
    visiting.delete(ast)

    const reference = referenceMap.get(ast)
    if (reference !== undefined && reference !== ownedReference) {
      references[reference] = representation
      return { _tag: "Reference", $ref: reference }
    }

    return representation
  }

  function on(ast: SchemaAST.AST): SchemaRepresentation.Representation {
    switch (ast._tag) {
      case "Declaration":
        return {
          _tag: "Declaration",
          typeParameters: ast.typeParameters.map((ast) => recur(ast)),
          checks: fromChecks(ast.checks),
          ...fromNodeAnnotations(ast.annotations)
        }
      case "Null":
      case "Undefined":
      case "Void":
      case "Never":
      case "Unknown":
      case "Any":
      case "Boolean":
      case "Symbol":
      case "ObjectKeyword":
        return {
          _tag: ast._tag,
          checks: fromChecks(ast.checks),
          ...fromNodeAnnotations(ast.annotations)
        }
      case "String": {
        const contentMediaType = ast.annotations?.contentMediaType
        const contentSchema = ast.annotations?.contentSchema
        return {
          _tag: "String",
          checks: fromChecks(ast.checks),
          ...fromNodeAnnotations(ast.annotations, true),
          ...(typeof contentMediaType === "string" ? { contentMediaType } : undefined),
          ...(SchemaAST.isAST(contentSchema) ? { contentSchema: recur(SchemaAST.toType(contentSchema)) } : undefined)
        }
      }
      case "Number":
      case "BigInt":
        return {
          _tag: ast._tag,
          checks: fromChecks(ast.checks),
          ...fromNodeAnnotations(ast.annotations)
        }
      case "Literal":
        return {
          _tag: "Literal",
          literal: ast.literal,
          checks: fromChecks(ast.checks),
          ...fromNodeAnnotations(ast.annotations)
        }
      case "UniqueSymbol":
        return {
          _tag: "UniqueSymbol",
          symbol: ast.symbol,
          checks: fromChecks(ast.checks),
          ...fromNodeAnnotations(ast.annotations)
        }
      case "Enum":
        return {
          _tag: "Enum",
          enums: ast.enums,
          checks: fromChecks(ast.checks),
          ...fromNodeAnnotations(ast.annotations)
        }
      case "TemplateLiteral":
        return {
          _tag: "TemplateLiteral",
          parts: ast.parts.map((ast) => recur(ast)),
          checks: fromChecks(ast.checks),
          ...fromNodeAnnotations(ast.annotations)
        }
      case "Arrays":
        return {
          _tag: "Arrays",
          elements: ast.elements.map((element) => {
            const projected = encoded ? SchemaAST.getLastEncoding(element) : element
            return {
              isOptional: SchemaAST.isOptional(projected),
              type: recur(element),
              ...fromKeyAnnotations(projected.context?.annotations)
            }
          }),
          rest: ast.rest.map((ast) => recur(ast)),
          checks: fromChecks(ast.checks),
          ...fromNodeAnnotations(ast.annotations)
        }
      case "Objects":
        return {
          _tag: "Objects",
          propertySignatures: ast.propertySignatures.map((property) => {
            const projected = encoded ? SchemaAST.getLastEncoding(property.type) : property.type
            return {
              name: property.name,
              type: recur(property.type),
              isOptional: SchemaAST.isOptional(projected),
              isMutable: SchemaAST.isMutable(projected),
              ...fromKeyAnnotations(projected.context?.annotations)
            }
          }),
          indexSignatures: ast.indexSignatures.map((index) => ({
            parameter: recur(index.parameter),
            type: recur(index.type)
          })),
          checks: fromChecks(ast.checks),
          ...fromNodeAnnotations(ast.annotations)
        }
      case "Union":
        return {
          _tag: "Union",
          types: InternalSchema.jsonReorder(ast.types).map((ast) => recur(ast)),
          mode: ast.mode,
          checks: fromChecks(ast.checks),
          ...fromNodeAnnotations(ast.annotations)
        }
      case "Suspend":
        return {
          _tag: "Suspend",
          checks: [],
          thunk: recur(ast.thunk()),
          ...fromNodeAnnotations(ast.annotations)
        }
    }
  }

  function fromChecks(
    checks: readonly [SchemaAST.Check<any>, ...Array<SchemaAST.Check<any>>] | undefined
  ): Array<SchemaRepresentation.Check> {
    return checks?.map(fromCheck) ?? []
  }

  function fromCheck(
    check: SchemaAST.Check<any>
  ): SchemaRepresentation.Check {
    switch (check._tag) {
      case "Filter":
        return {
          _tag: "Filter",
          aborted: check.aborted,
          ...fromFilterAnnotations(check.annotations)
        }
      case "FilterGroup":
        return {
          _tag: "FilterGroup",
          checks: Arr.map(check.checks, fromCheck),
          ...fromFilterAnnotations(check.annotations)
        }
    }
  }

  function fromNodeAnnotations(
    annotations: Schema.Annotations.Annotations | undefined,
    stripStringContent: boolean = false
  ): { readonly annotations: NodeAnnotations } | undefined {
    const converted = convertRepresentationSchemas(annotations, stripStringContent)
    return converted === undefined ? undefined : { annotations: converted }
  }

  function fromFilterAnnotations(
    annotations: Schema.Annotations.Filter | undefined
  ): { readonly annotations: FilterAnnotations } | undefined {
    const converted = convertRepresentationSchemas(annotations, false)
    return converted === undefined ? undefined : { annotations: converted }
  }

  function fromKeyAnnotations(
    annotations: Schema.Annotations.Key<unknown> | undefined
  ): { readonly annotations: KeyAnnotations } | undefined {
    return annotations === undefined ? undefined : { annotations }
  }

  function convertRepresentationSchemas<A extends Schema.Annotations.Annotations>(
    annotations: A | undefined,
    stripStringContent: boolean
  ): RebindRepresentation<A> | undefined {
    if (annotations === undefined) {
      return undefined
    }

    let out: Record<string, unknown> = annotations
    const representation = annotations.representation as
      | SchemaRepresentation.RepresentationAnnotation<SchemaAST.AST>
      | undefined
    if (representation?.schemas !== undefined) {
      out = {
        ...out,
        representation: {
          ...representation,
          schemas: representation.schemas.map((schema) => recur(SchemaAST.toType(schema)))
        }
      }
    }

    if (stripStringContent && ("contentMediaType" in out || "contentSchema" in out)) {
      const { contentMediaType: _, contentSchema: __, ...rest } = out
      out = rest
    }

    return out as RebindRepresentation<A>
  }
}
