import * as Arr from "../../Array.ts"
import * as Equal from "../../Equal.ts"
import type * as Schema from "../../Schema.ts"
import * as SchemaAST from "../../SchemaAST.ts"
import type * as SchemaRepresentation from "../../SchemaRepresentation.ts"
import * as InternalRecord from "../record.ts"
import * as InternalAnnotations from "./annotations.ts"

/** @internal */
export function toRepresentation(
  ast: SchemaAST.AST,
  encoded = false
): SchemaRepresentation.Document {
  const { references, representations } = toRepresentations([ast], encoded)
  return { representation: representations[0], references }
}

/** @internal */
export function toRepresentations(
  asts: readonly [SchemaAST.AST, ...Array<SchemaAST.AST>],
  encoded = false
): SchemaRepresentation.MultiDocument {
  return lowerASTs(encoded ? asts : Arr.map(asts, (ast) => SchemaAST.toType(ast)), [], encoded)
}

type CheckRepresentationAnnotation = SchemaRepresentation.CheckRepresentationAnnotation<
  SchemaRepresentation.Representation
>

function annotationsField<A>(annotations: A | undefined): { readonly annotations: A } | undefined {
  return annotations === undefined ? undefined : { annotations }
}

function projectCheckRepresentationAnnotation(
  input: CheckRepresentationAnnotation
): CheckRepresentationAnnotation {
  return input.schemas === undefined
    ? input
    : { ...input, schemas: input.schemas.map(projectRepresentation) }
}

function projectAnnotationBag(
  input: Readonly<Record<string, unknown>> | undefined
): Schema.Annotations.Annotations | undefined {
  if (input === undefined) return undefined

  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(input)) {
    if (SchemaAST.isJson(value)) InternalRecord.set(out, key, value)
  }

  return Object.keys(out).length === 0
    ? undefined
    : out
}

function projectCheck(check: SchemaRepresentation.Check): SchemaRepresentation.Check {
  const representation = check.representation === undefined
    ? undefined
    : projectCheckRepresentationAnnotation(check.representation)
  const fields = {
    ...(representation === undefined ? undefined : { representation }),
    ...annotationsField(projectAnnotationBag(check.annotations))
  }
  switch (check._tag) {
    case "Filter":
      return {
        _tag: "Filter",
        aborted: check.aborted,
        ...fields
      }
    case "FilterGroup":
      return {
        _tag: "FilterGroup",
        checks: Arr.map(check.checks, projectCheck),
        ...fields
      }
  }
}

function projectRepresentation(
  representation: SchemaRepresentation.Representation
): SchemaRepresentation.Representation {
  if (representation._tag === "Reference") return representation

  const annotations = projectAnnotationBag(representation.annotations)

  if (representation._tag === "Suspend") {
    return {
      _tag: "Suspend",
      checks: [],
      thunk: projectRepresentation(representation.thunk),
      ...annotationsField(annotations)
    }
  }

  const checks = representation.checks.map(projectCheck)
  const fields = { checks, ...annotationsField(annotations) }

  switch (representation._tag) {
    case "Declaration":
      return {
        _tag: "Declaration",
        ...(representation.representation === undefined
          ? undefined
          : { representation: representation.representation }),
        typeParameters: representation.typeParameters.map(projectRepresentation),
        ...fields
      }
    case "Null":
    case "Undefined":
    case "Void":
    case "Never":
    case "Unknown":
    case "Any":
    case "String":
    case "Number":
    case "Boolean":
    case "BigInt":
    case "Symbol":
    case "ObjectKeyword":
      return {
        _tag: representation._tag,
        ...fields
      }
    case "Literal":
      return {
        _tag: "Literal",
        literal: representation.literal,
        ...fields
      }
    case "UniqueSymbol":
      return {
        _tag: "UniqueSymbol",
        symbol: representation.symbol,
        ...fields
      }
    case "Enum":
      return {
        _tag: "Enum",
        enums: representation.enums,
        ...fields
      }
    case "TemplateLiteral":
      return {
        _tag: "TemplateLiteral",
        parts: representation.parts.map(projectRepresentation),
        ...fields
      }
    case "Arrays":
      return {
        _tag: "Arrays",
        elements: representation.elements.map((element) => ({
          isOptional: element.isOptional,
          type: projectRepresentation(element.type),
          ...annotationsField(projectAnnotationBag(element.annotations))
        })),
        rest: representation.rest.map(projectRepresentation),
        ...fields
      }
    case "Objects":
      return {
        _tag: "Objects",
        propertySignatures: representation.propertySignatures.map((property) => ({
          name: property.name,
          isOptional: property.isOptional,
          isMutable: property.isMutable,
          type: projectRepresentation(property.type),
          ...annotationsField(projectAnnotationBag(property.annotations))
        })),
        indexSignatures: representation.indexSignatures.map((index) => ({
          parameter: projectRepresentation(index.parameter),
          type: projectRepresentation(index.type)
        })),
        ...fields
      }
    case "Union":
      return {
        _tag: "Union",
        types: representation.types.map(projectRepresentation),
        mode: representation.mode,
        ...fields
      }
  }
}

function projectReferences(references: SchemaRepresentation.References): SchemaRepresentation.References {
  const out: Record<string, SchemaRepresentation.Representation> = {}
  for (const [key, value] of Object.entries(references)) {
    InternalRecord.set(out, key, projectRepresentation(value))
  }
  return out
}

/** @internal */
export function projectDocument(
  document: SchemaRepresentation.Document
): SchemaRepresentation.Document {
  return {
    representation: projectRepresentation(document.representation),
    references: projectReferences(document.references)
  }
}

/** @internal */
export function projectMultiDocument(
  document: SchemaRepresentation.MultiDocument
): SchemaRepresentation.MultiDocument {
  return {
    representations: Arr.map(document.representations, projectRepresentation),
    references: projectReferences(document.references)
  }
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

interface ExternalDefinition {
  readonly key: string
  readonly original: SchemaAST.AST
  readonly encoded: SchemaAST.AST
  readonly body: SchemaAST.AST
}

// Preserve repeated structural nodes as references without adding noise for leaf nodes.
function isShareable(ast: SchemaAST.AST): boolean {
  return SchemaAST.isArrays(ast) ||
    SchemaAST.isObjects(ast) ||
    (SchemaAST.isUnion(ast) && ast.types.some(isShareable))
}

function resolveReferenceIdentifier(ast: SchemaAST.AST): string | undefined {
  const identifier = InternalAnnotations.resolveIdentifier(ast)
  if (identifier !== undefined) return identifier
  const fallback = InternalAnnotations.resolveIdentifierFallback(ast)
  return fallback === undefined ? undefined : `${fallback}JsonEncoding`
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
  const visited = new Set<SchemaAST.AST>()
  const shared = new Set<SchemaAST.AST>()
  const externalBodyReferences = new Map<SchemaAST.AST, string | null>()

  for (const definition of externalDefinitions) {
    referenceMap.set(definition.original, definition.key)
    referenceMap.set(definition.encoded, definition.key)
    externalBodyReferences.set(
      definition.body,
      externalBodyReferences.has(definition.body) ? null : definition.key
    )
  }

  for (const ast of asts) visit(ast)
  for (const definition of externalDefinitions) visit(definition.body)

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

  function visit(input: SchemaAST.AST): void {
    const ast = encoded ? SchemaAST.getLastEncoding(input) : input
    if (visited.has(ast)) {
      if (isShareable(ast)) shared.add(ast)
      return
    }
    visited.add(ast)
    visitChecks(ast.checks)
    switch (ast._tag) {
      case "Declaration":
      case "Arrays":
      case "Objects":
      case "Union":
        ast.recur((child) => {
          visit(child)
          return child
        })
        break
      case "TemplateLiteral":
        ast.parts.forEach(visit)
        break
      case "Suspend":
        visit(ast.thunk())
        break
    }
  }

  function visitChecks(checks: SchemaAST.Checks | undefined): void {
    checks?.forEach((check) => {
      check.annotations?.representation?.schemas?.forEach((schema) => visit(SchemaAST.toType(schema)))
      if (check._tag === "FilterGroup") visitChecks(check.checks)
    })
  }

  function recur(
    ast: SchemaAST.AST,
    ownedReference?: string
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

    if (encoded) {
      const projected = SchemaAST.getLastEncoding(ast)
      if (projected !== ast) {
        return recur(projected, ownedReference)
      }
    }

    const identifier = ownedReference === undefined ? resolveReferenceIdentifier(ast) : undefined
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

    if (ownedReference === undefined && shared.has(ast)) {
      const reference = generateReference(`${ast._tag}_`)
      referenceMap.set(ast, reference)
      references[reference] = on(ast)
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
    const checks = fromChecks(ast.checks)
    switch (ast._tag) {
      case "Declaration":
        return {
          _tag: "Declaration",
          typeParameters: ast.typeParameters.map((ast) => recur(ast)),
          checks,
          ...fromDeclarationAnnotations(ast.annotations)
        }
      case "Null":
      case "Undefined":
      case "Void":
      case "Never":
      case "Unknown":
      case "Any":
      case "String":
      case "Boolean":
      case "Number":
      case "BigInt":
      case "Symbol":
      case "ObjectKeyword":
        return {
          _tag: ast._tag,
          checks,
          ...annotationsField(ast.annotations)
        }
      case "Literal":
        return {
          _tag: "Literal",
          literal: ast.literal,
          checks,
          ...annotationsField(ast.annotations)
        }
      case "UniqueSymbol":
        return {
          _tag: "UniqueSymbol",
          symbol: ast.symbol,
          checks,
          ...annotationsField(ast.annotations)
        }
      case "Enum":
        return {
          _tag: "Enum",
          enums: ast.enums,
          checks,
          ...annotationsField(ast.annotations)
        }
      case "TemplateLiteral":
        return {
          _tag: "TemplateLiteral",
          parts: ast.parts.map((ast) => recur(ast)),
          checks,
          ...annotationsField(ast.annotations)
        }
      case "Arrays":
        return {
          _tag: "Arrays",
          elements: ast.elements.map((element) => {
            const projected = encoded ? SchemaAST.getLastEncoding(element) : element
            const annotations = projected.context?.annotations
            return {
              isOptional: SchemaAST.isOptional(projected),
              type: recur(element),
              ...annotationsField(annotations)
            }
          }),
          rest: ast.rest.map((ast) => recur(ast)),
          checks,
          ...annotationsField(ast.annotations)
        }
      case "Objects":
        return {
          _tag: "Objects",
          propertySignatures: ast.propertySignatures.map((property) => {
            const projected = encoded ? SchemaAST.getLastEncoding(property.type) : property.type
            const annotations = projected.context?.annotations
            return {
              name: property.name,
              type: recur(property.type),
              isOptional: SchemaAST.isOptional(projected),
              isMutable: SchemaAST.isMutable(projected),
              ...annotationsField(annotations)
            }
          }),
          indexSignatures: ast.indexSignatures.map((index) => ({
            parameter: recur(index.parameter),
            type: recur(index.type)
          })),
          checks,
          ...annotationsField(ast.annotations)
        }
      case "Union":
        return {
          _tag: "Union",
          types: ast.types.map((ast) => recur(ast)),
          mode: ast.mode,
          checks,
          ...annotationsField(ast.annotations)
        }
      case "Suspend":
        return {
          _tag: "Suspend",
          checks: [],
          thunk: recur(ast.thunk()),
          ...annotationsField(ast.annotations)
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
          ...fromCheckAnnotations(check.annotations)
        }
      case "FilterGroup":
        return {
          _tag: "FilterGroup",
          checks: Arr.map(check.checks, fromCheck),
          ...fromCheckAnnotations(check.annotations)
        }
    }
  }

  function fromDeclarationAnnotations<
    A extends Schema.Annotations.Annotations & {
      readonly representation?: SchemaRepresentation.RepresentationAnnotation | undefined
    }
  >(annotations: A | undefined): {
    readonly representation?: SchemaRepresentation.RepresentationAnnotation | undefined
    readonly annotations?: Omit<A, "representation"> | undefined
  } | undefined {
    if (annotations === undefined) return undefined
    const { representation, ...ordinary } = annotations
    return {
      ...(representation === undefined ? undefined : { representation }),
      ...(Object.keys(ordinary).length === 0 ? undefined : { annotations: ordinary })
    }
  }

  function fromCheckAnnotations<
    A extends Schema.Annotations.Annotations & {
      readonly representation?: SchemaRepresentation.CheckRepresentationAnnotation<SchemaAST.AST> | undefined
    }
  >(annotations: A | undefined): {
    readonly representation?: CheckRepresentationAnnotation | undefined
    readonly annotations?: Omit<A, "representation"> | undefined
  } | undefined {
    if (annotations === undefined) return undefined
    const { representation, ...ordinary } = annotations
    const projected = representation === undefined
      ? undefined
      : representation.schemas === undefined
      ? representation as CheckRepresentationAnnotation
      : { ...representation, schemas: representation.schemas.map((schema) => recur(SchemaAST.toType(schema))) }
    return {
      ...(projected === undefined ? undefined : { representation: projected }),
      ...(Object.keys(ordinary).length === 0 ? undefined : { annotations: ordinary })
    }
  }
}
