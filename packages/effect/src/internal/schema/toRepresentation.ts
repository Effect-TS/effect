import * as Arr from "../../Array.ts"
import type * as Schema from "../../Schema.ts"
import * as SchemaAST from "../../SchemaAST.ts"
import type * as SchemaRepresentation from "../../SchemaRepresentation.ts"
import * as InternalRecord from "../record.ts"
import * as InternalAnnotations from "./annotations.ts"

/** @internal */
export function toRepresentation(
  ast: SchemaAST.AST,
  options?: SchemaRepresentation.ToRepresentationOptions
): SchemaRepresentation.Document {
  const { references, representations } = toRepresentations([ast], options)
  return { representation: representations[0], references }
}

/** @internal */
export function toRepresentations(
  asts: readonly [SchemaAST.AST, ...Array<SchemaAST.AST>],
  options?: SchemaRepresentation.ToRepresentationOptions
): SchemaRepresentation.MultiDocument {
  return fromASTs(asts, options)
}

const defaultReferencePolicy: SchemaRepresentation.ReferencePolicy = ({ identifier }) => identifier

type CheckRepresentationAnnotation = SchemaRepresentation.CheckRepresentationAnnotation<
  SchemaRepresentation.Representation
>

function annotationsField<A>(annotations: A | undefined): { readonly annotations: A } | undefined {
  return annotations === undefined ? undefined : { annotations }
}

interface ReferenceIdentifier {
  readonly identifier: string
  readonly fallback?: string | undefined
}

interface ReferenceCandidate {
  readonly ast: SchemaAST.AST
  readonly referenceIdentifier: ReferenceIdentifier | undefined
  occurrences: number
  isRecursive: boolean
  reference: string | undefined
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
  asts: readonly [SchemaAST.AST, ...Array<SchemaAST.AST>],
  options: SchemaRepresentation.ToRepresentationOptions | undefined
): SchemaRepresentation.MultiDocument {
  const references: Record<string, SchemaRepresentation.Representation> = {}
  const referenceOwners = new Map<string, ReferenceCandidate>()
  const buildingReferences = new Set<string>()
  const candidates = new Map<SchemaAST.AST, Map<string | undefined, ReferenceCandidate>>()
  const visitingCandidates = new Set<ReferenceCandidate>()
  const visitingRepresentations = new Set<ReferenceCandidate>()

  for (const ast of asts) visit(ast)

  const referencePolicy = options?.referencePolicy ?? defaultReferencePolicy
  for (const candidatesByIdentifier of candidates.values()) {
    for (const candidate of candidatesByIdentifier.values()) {
      const requestedReference = referencePolicy({
        ast: candidate.ast,
        occurrences: candidate.occurrences,
        identifier: candidate.referenceIdentifier?.identifier
      })
      if (requestedReference !== undefined) {
        const separator = requestedReference === candidate.referenceIdentifier?.identifier ||
            !requestedReference.endsWith("_")
          ? "_"
          : ""
        candidate.reference = getReference(requestedReference, candidate, separator)
      } else if (candidate.isRecursive) {
        candidate.reference = getReference(`${candidate.ast._tag}_`, candidate, "")
      }
    }
  }

  const representations = Arr.map(asts, (ast) => recur(ast))

  return { representations, references }

  function getReference(prefix: string, owner: ReferenceCandidate, separator = "_"): string {
    let candidate = prefix
    let suffix = 0
    while (referenceOwners.has(candidate)) {
      if (referenceOwners.get(candidate) === owner) return candidate
      candidate = `${prefix}${separator}${++suffix}`
    }
    referenceOwners.set(candidate, owner)
    return candidate
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

  function getCandidate(input: SchemaAST.AST): {
    readonly ast: SchemaAST.AST
    readonly candidate: ReferenceCandidate
  } {
    const ast = SchemaAST.getLastEncoding(input)
    const owner = SchemaAST.getContextOwner(ast)
    const referenceIdentifier = resolveReferenceIdentifier(input, ast)
    const identifier = referenceIdentifier?.identifier
    let candidatesByIdentifier = candidates.get(owner)
    if (candidatesByIdentifier === undefined) {
      candidatesByIdentifier = new Map()
      candidates.set(owner, candidatesByIdentifier)
    }
    let candidate = candidatesByIdentifier.get(identifier)
    if (candidate === undefined) {
      candidate = {
        ast: owner,
        referenceIdentifier,
        occurrences: 0,
        isRecursive: false,
        reference: undefined
      }
      candidatesByIdentifier.set(identifier, candidate)
    }
    return { ast, candidate }
  }

  function visit(input: SchemaAST.AST): void {
    const { ast, candidate } = getCandidate(input)
    candidate.occurrences++
    if (visitingCandidates.has(candidate)) {
      candidate.isRecursive = true
      return
    }
    if (candidate.occurrences > 1) return
    visitingCandidates.add(candidate)
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
    visitingCandidates.delete(candidate)
  }

  function visitChecks(checks: SchemaAST.Checks | undefined): void {
    checks?.forEach((check) => {
      check.annotations?.representation?.schemas?.forEach((schema) => visit(SchemaAST.toType(schema)))
      if (check._tag === "FilterGroup") visitChecks(check.checks)
    })
  }

  function recur(input: SchemaAST.AST): SchemaRepresentation.Representation {
    const { ast, candidate } = getCandidate(input)
    const reference = candidate.reference
    if (reference !== undefined) {
      const annotated = candidate.referenceIdentifier === undefined
        ? ast
        : annotateReference(ast, candidate.referenceIdentifier, reference)
      return makeReference(reference, annotated)
    }

    if (visitingRepresentations.has(candidate)) {
      const reference = getReference(`${ast._tag}_`, candidate, "")
      candidate.reference = reference
      return { _tag: "Reference", $ref: reference }
    }

    visitingRepresentations.add(candidate)
    const representation = on(ast)
    visitingRepresentations.delete(candidate)

    const forcedReference = candidate.reference
    if (forcedReference !== undefined) {
      InternalRecord.assignProperty(references, forcedReference, representation)
      return { _tag: "Reference", $ref: forcedReference }
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
