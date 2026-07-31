import * as Arr from "../../Array.ts"
import type * as Schema from "../../Schema.ts"
import * as SchemaAST from "../../SchemaAST.ts"
import type * as SchemaRepresentation from "../../SchemaRepresentation.ts"
import * as InternalRecord from "../record.ts"
import * as InternalAnnotations from "./annotations.ts"

/** @internal */
export function toRepresentation(
  ast: SchemaAST.AST
): SchemaRepresentation.Document {
  const { references, representations } = toRepresentations([ast])
  return { representation: representations[0], references }
}

/** @internal */
export function toRepresentations(
  asts: readonly [SchemaAST.AST, ...Array<SchemaAST.AST>]
): SchemaRepresentation.MultiDocument {
  return fromASTs(asts)
}

type CheckRepresentationAnnotation = SchemaRepresentation.CheckRepresentationAnnotation<
  SchemaRepresentation.Representation
>

function annotationsField<A>(annotations: A | undefined): { readonly annotations: A } | undefined {
  return annotations === undefined ? undefined : { annotations }
}

// Preserve repeated structural nodes as references without adding noise for leaf nodes.
function isShareable(ast: SchemaAST.AST): boolean {
  return SchemaAST.isArrays(ast) ||
    SchemaAST.isObjects(ast) ||
    (SchemaAST.isUnion(ast) && ast.types.some(isShareable))
}

interface ReferenceIdentifier {
  readonly identifier: string
  readonly fallback?: string | undefined
}

function resolveReferenceIdentifier(
  input: SchemaAST.AST,
  encoded: SchemaAST.AST
): ReferenceIdentifier | undefined {
  const identifier = InternalAnnotations.resolveIdentifier(encoded)
  if (identifier !== undefined) return { identifier }
  const fallback = (encoded !== input ? InternalAnnotations.resolveIdentifier(input) : undefined) ??
    InternalAnnotations.resolveIdentifierFallback(encoded)
  return fallback === undefined
    ? undefined
    : { identifier: `${fallback}Encoded`, fallback }
}

function fromASTs(
  asts: readonly [SchemaAST.AST, ...Array<SchemaAST.AST>]
): SchemaRepresentation.MultiDocument {
  const references: Record<string, SchemaRepresentation.Representation> = {}
  const anonymousReferences = new Map<SchemaAST.AST, string>()
  const referenceOwners = new Map<string, SchemaAST.AST>()
  const valueIds = new Map<unknown, number>()
  const canonicalByKey = new Map<string, SchemaAST.AST>()
  let nextValueId = 0
  const buildingReferences = new Set<string>()
  const visiting = new Set<SchemaAST.AST>()
  const visited = new Set<SchemaAST.AST>()
  const shared = new Set<SchemaAST.AST>()

  for (const ast of asts) visit(ast)

  const representations = Arr.map(asts, (ast) => recur(ast))

  return { representations, references }

  function getReference(prefix: string, owner: SchemaAST.AST, separator = "_"): string {
    let candidate = prefix
    let suffix = 0
    while (referenceOwners.has(candidate)) {
      if (referenceOwners.get(candidate) === owner) return candidate
      candidate = `${prefix}${separator}${++suffix}`
    }
    referenceOwners.set(candidate, owner)
    return candidate
  }

  function getValueId(value: unknown): number {
    if (typeof value === "number" && globalThis.Number.isNaN(value)) {
      return nextValueId++
    }
    const found = valueIds.get(value)
    if (found !== undefined) return found
    const id = nextValueId++
    valueIds.set(value, id)
    return id
  }

  function getIdentityKey(ast: SchemaAST.AST): string {
    let identity = ast._tag
    for (const [key, value] of Object.entries(ast)) {
      if (key !== "_tag" && key !== "context") identity += `:${getValueId(value)}`
    }
    return identity
  }

  function getCanonicalAST(ast: SchemaAST.AST): SchemaAST.AST {
    const key = getIdentityKey(ast)
    const canonical = canonicalByKey.get(key)
    if (canonical === undefined) {
      canonicalByKey.set(key, ast)
      return ast
    }
    return canonical
  }

  function annotateReference(
    ast: SchemaAST.AST,
    referenceIdentifier: ReferenceIdentifier,
    reference: string
  ): SchemaAST.AST {
    const fallback = referenceIdentifier.fallback
    if (fallback !== undefined) {
      return InternalAnnotations.resolveIdentifierFallback(ast) === fallback
        ? ast
        : SchemaAST.annotate(ast, {
          [InternalAnnotations.IDENTIFIER_FALLBACK_KEY]: fallback
        })
    }
    return reference === referenceIdentifier.identifier
      ? ast
      : SchemaAST.annotate(ast, { identifier: reference })
  }

  function makeReference(reference: string, ast: SchemaAST.AST): SchemaRepresentation.Reference {
    if (!Object.hasOwn(references, reference) && !buildingReferences.has(reference)) {
      buildingReferences.add(reference)
      const representation = on(ast)
      buildingReferences.delete(reference)
      InternalRecord.assignProperty(references, reference, representation)
    }
    return { _tag: "Reference", $ref: reference }
  }

  function visit(input: SchemaAST.AST): void {
    const ast = SchemaAST.getLastEncoding(input)
    const owner = getCanonicalAST(ast)
    if (visited.has(owner)) {
      if (isShareable(ast)) shared.add(owner)
      return
    }
    visited.add(owner)
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

  function recur(input: SchemaAST.AST): SchemaRepresentation.Representation {
    const ast = SchemaAST.getLastEncoding(input)
    const owner = getCanonicalAST(ast)
    const referenceIdentifier = resolveReferenceIdentifier(input, ast)
    if (referenceIdentifier !== undefined) {
      const reference = getReference(referenceIdentifier.identifier, owner)
      return makeReference(reference, annotateReference(ast, referenceIdentifier, reference))
    }

    const found = anonymousReferences.get(owner)
    if (found !== undefined) {
      return { _tag: "Reference", $ref: found }
    }

    const isShared = shared.has(owner)
    if (isShared || visiting.has(owner)) {
      const reference = getReference(`${ast._tag}_`, owner, "")
      anonymousReferences.set(owner, reference)
      return isShared
        ? makeReference(reference, ast)
        : { _tag: "Reference", $ref: reference }
    }

    visiting.add(owner)
    const representation = on(ast)
    visiting.delete(owner)

    const reference = anonymousReferences.get(owner)
    if (reference !== undefined) {
      InternalRecord.assignProperty(references, reference, representation)
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
            const projected = SchemaAST.getLastEncoding(element)
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
            const projected = SchemaAST.getLastEncoding(property.type)
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
