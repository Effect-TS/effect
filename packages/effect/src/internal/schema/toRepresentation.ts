import * as Arr from "../../Array.ts"
import type * as Schema from "../../Schema.ts"
import * as SchemaAST from "../../SchemaAST.ts"
import type * as SchemaRepresentation from "../../SchemaRepresentation.ts"
import * as InternalRecord from "../record.ts"
import * as InternalAnnotations from "./annotations.ts"
import * as InternalContent from "./content.ts"

const defaultReferencePolicy: SchemaRepresentation.ReferencePolicy = ({ identifier }) => identifier

type CheckRepresentationAnnotation = SchemaRepresentation.CheckRepresentationAnnotation<
  SchemaRepresentation.Representation
>

interface ReferenceCandidate {
  readonly ast: SchemaAST.AST
  readonly identifier: string | undefined
  readonly fallback: string | undefined
  readonly content: Content | undefined
  occurrences: number
  visiting?: boolean | undefined
  isRecursive?: boolean | undefined
  reference?: string | undefined
  emitted?: boolean | undefined
  approximate?: boolean | undefined
}

interface Content {
  readonly mediaType: string
  readonly schema?: ReferenceCandidate | undefined
}

function annotationsField<A>(annotations: A | undefined): { readonly annotations: A } | undefined {
  return annotations === undefined ? undefined : { annotations }
}

const exactEncodings = new WeakMap<SchemaAST.AST, boolean>()

// The representation describes only the last encoding, so it is exact when
// decoding accepts every value of that encoding.
function isExactEncoding(ast: SchemaAST.AST): boolean {
  if (ast.encoding === undefined) return true
  let out = exactEncodings.get(ast)
  if (out === undefined) {
    out = isExactChain(ast, new Set())
    exactEncodings.set(ast, out)
  }
  return out
}

// Every link must be total and keep the checks of its decoded side. Codecs
// nested in a decoded side also decode values of the exported encoding.
function isExactChain(ast: SchemaAST.AST, visited: Set<SchemaAST.AST>): boolean {
  if (ast.encoding === undefined) return true
  let decoded = ast
  for (const link of ast.encoding) {
    if (
      !SchemaAST.isTotal(link) ||
      (decoded.checks !== undefined && decoded.checks !== link.to.checks) ||
      // An intermediate target with its own encoding is not followed.
      (decoded !== ast && decoded.encoding !== undefined) ||
      !getChildren(decoded).every((child) => isExactCodec(child, visited))
    ) {
      return false
    }
    decoded = link.to
  }
  return isExactChain(decoded, visited)
}

// Recursive schemas are exact unless some other part of them is not.
function isExactCodec(ast: SchemaAST.AST, visited: Set<SchemaAST.AST>): boolean {
  if (visited.has(ast)) return true
  visited.add(ast)
  return isExactChain(ast, visited) &&
    getChildren(SchemaAST.getLastEncoding(ast)).every((child) => isExactCodec(child, visited))
}

function getChildren(ast: SchemaAST.AST): ReadonlyArray<SchemaAST.AST> {
  switch (ast._tag) {
    case "TemplateLiteral":
      return ast.parts
    case "Suspend":
      return [ast.thunk()]
    default: {
      const children: Array<SchemaAST.AST> = []
      if ("recur" in ast) {
        ast.recur((child) => {
          children.push(child)
          return child
        })
      }
      return children
    }
  }
}

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
  const references: Record<string, SchemaRepresentation.Representation> = {}
  const usedReferences = new Set<string>()
  const candidates = new Map<SchemaAST.AST, Array<ReferenceCandidate>>()

  for (const ast of asts) visit(ast)

  const referencePolicy = options?.referencePolicy ?? defaultReferencePolicy
  for (const variants of candidates.values()) {
    for (const candidate of variants) {
      const requestedReference = referencePolicy({
        ast: candidate.ast,
        occurrences: candidate.occurrences,
        identifier: candidate.identifier
      })
      if (requestedReference !== undefined) {
        const separator = requestedReference === candidate.identifier ||
            !requestedReference.endsWith("_")
          ? "_"
          : ""
        candidate.reference = getReference(requestedReference, separator)
      } else if (candidate.isRecursive) {
        candidate.reference = getReference(`${candidate.ast._tag}_`, "")
      }
    }
  }

  const representations = Arr.map(asts, recur)

  return { representations, references }

  function getReference(prefix: string, separator: string): string {
    let candidate = prefix
    let suffix = 0
    while (usedReferences.has(candidate)) {
      candidate = `${prefix}${separator}${++suffix}`
    }
    usedReferences.add(candidate)
    return candidate
  }

  function annotateReference(
    ast: SchemaAST.AST,
    candidate: ReferenceCandidate,
    reference: string
  ): SchemaAST.AST {
    const fallback = candidate.fallback
    if (fallback !== undefined) {
      return InternalAnnotations.resolveIdentifierFallback(ast) === fallback
        ? ast
        : SchemaAST.annotate(ast, {
          [InternalAnnotations.IDENTIFIER_FALLBACK_KEY]: fallback
        })
    }
    return reference === candidate.identifier
      ? ast
      : SchemaAST.annotate(ast, { identifier: reference })
  }

  function getCandidate(
    input: SchemaAST.AST,
    encodingLength = input.encoding?.length ?? 0
  ): ReferenceCandidate {
    let ast = input
    let content: Content | undefined
    while (ast.encoding !== undefined && encodingLength > 0) {
      const last = ast.encoding[encodingLength - 1]
      // Only retain content when this operation produces the final string.
      if (last.to.encoding === undefined && last.to._tag === "String") {
        const metadata = InternalContent.getContent(last.transformation.encode)
        if (metadata !== undefined) {
          content = {
            mediaType: metadata.mediaType,
            schema: metadata.preserveSchema ? getCandidate(ast, encodingLength - 1) : undefined
          }
        }
      }
      ast = last.to
      encodingLength = ast.encoding?.length ?? 0
    }
    const owner = SchemaAST.getContextOwner(ast)
    let identifier = InternalAnnotations.resolveIdentifier(ast)
    const fallback = identifier === undefined
      ? (ast !== input ? InternalAnnotations.resolveIdentifier(input) : undefined) ??
        InternalAnnotations.resolveIdentifierFallback(ast)
      : undefined
    if (fallback !== undefined) identifier = `${fallback}Encoded`
    let variants = candidates.get(owner)
    if (variants === undefined) {
      variants = []
      candidates.set(owner, variants)
    }
    let candidate = variants.find((candidate) =>
      candidate.identifier === identifier &&
      candidate.content?.mediaType === content?.mediaType &&
      candidate.content?.schema === content?.schema
    )
    if (candidate === undefined) {
      candidate = {
        ast: owner,
        identifier,
        fallback,
        content,
        occurrences: 0
      }
      variants.push(candidate)
    }
    return candidate
  }

  function visit(input: SchemaAST.AST): SchemaAST.AST {
    const candidate = getCandidate(input)
    // A reference cannot carry the marker, so it applies to the shared definition.
    if (!isExactEncoding(input)) candidate.approximate = true
    visitCandidate(candidate)
    return input
  }

  function visitCandidate(candidate: ReferenceCandidate): void {
    const ast = candidate.ast
    candidate.occurrences++
    if (candidate.visiting) {
      candidate.isRecursive = true
      return
    }
    if (candidate.occurrences > 1) return
    candidate.visiting = true
    if (candidate.content?.schema !== undefined) visitCandidate(candidate.content.schema)
    visitChecks(ast.checks)
    switch (ast._tag) {
      default:
        if ("recur" in ast) ast.recur(visit)
        break
      case "TemplateLiteral":
        ast.parts.forEach(visit)
        break
      case "Suspend":
        visit(ast.thunk())
        break
    }
    candidate.visiting = false
  }

  function visitChecks(checks: SchemaAST.Checks | undefined): void {
    checks?.forEach((check) => {
      check.annotations?.representation?.schemas?.forEach((schema) => visit(SchemaAST.toType(schema)))
      if (check._tag === "FilterGroup") visitChecks(check.checks)
    })
  }

  function recur(input: SchemaAST.AST): SchemaRepresentation.Representation {
    return recurCandidate(getCandidate(input), !isExactEncoding(input))
  }

  function recurCandidate(
    candidate: ReferenceCandidate,
    approximate = false
  ): SchemaRepresentation.Representation {
    const ast = candidate.ast
    const reference = candidate.reference
    if (reference !== undefined) {
      if (!candidate.emitted) {
        candidate.emitted = true
        const annotated = candidate.identifier === undefined ? ast : annotateReference(ast, candidate, reference)
        const representation = on(annotated, candidate.content, candidate.approximate === true)
        InternalRecord.assignProperty(references, reference, representation)
      }
      return { _tag: "Reference", $ref: reference }
    }
    return on(ast, candidate.content, approximate)
  }

  function on(
    ast: SchemaAST.AST,
    content: Content | undefined,
    approximate = false
  ): SchemaRepresentation.Representation {
    const annotations = approximate
      ? { ...ast.annotations, [InternalAnnotations.APPROXIMATE_JSON_ANNOTATION_KEY]: true }
      : ast.annotations
    const common = {
      checks: ast.checks?.map(fromCheck) ?? [],
      ...(ast._tag === "Declaration" ? fromAnnotations(annotations) : annotationsField(annotations))
    }
    switch (ast._tag) {
      case "Declaration":
        return {
          _tag: ast._tag,
          typeParameters: ast.typeParameters.map(recur),
          ...common
        }
      default:
        return {
          _tag: ast._tag,
          ...(content === undefined ? undefined : {
            content: {
              mediaType: content.mediaType,
              ...(content.schema === undefined ? undefined : { schema: recurCandidate(content.schema) })
            }
          }),
          ...common
        }
      case "Literal":
        return {
          _tag: ast._tag,
          literal: ast.literal,
          ...common
        }
      case "UniqueSymbol":
        return {
          _tag: ast._tag,
          symbol: ast.symbol,
          ...common
        }
      case "Enum":
        return {
          _tag: ast._tag,
          enums: ast.enums,
          ...common
        }
      case "TemplateLiteral":
        return {
          _tag: ast._tag,
          parts: ast.parts.map(recur),
          ...common
        }
      case "Arrays":
        return {
          _tag: ast._tag,
          elements: ast.elements.map((element) => {
            const projected = SchemaAST.getLastEncoding(element)
            const annotations = projected.context?.annotations
            return {
              isOptional: SchemaAST.isOptional(projected),
              type: recur(element),
              ...annotationsField(annotations)
            }
          }),
          rest: ast.rest.map(recur),
          ...common
        }
      case "Objects":
        return {
          _tag: ast._tag,
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
          ...common
        }
      case "Union":
        return {
          _tag: ast._tag,
          types: ast.types.map(recur),
          ...(ast.options === undefined ? {} : { options: ast.options }),
          ...common
        }
      case "Suspend":
        return {
          _tag: ast._tag,
          ...common,
          checks: [],
          thunk: recur(ast.thunk())
        }
    }
  }

  function fromCheck(
    check: SchemaAST.Check<any>
  ): SchemaRepresentation.Check {
    return {
      ...(check._tag === "Filter"
        ? { _tag: check._tag, aborted: check.aborted }
        : { _tag: check._tag, checks: Arr.map(check.checks, fromCheck) }),
      ...fromAnnotations(check.annotations, true)
    }
  }

  function fromAnnotations<
    A extends Schema.Annotations.Annotations & {
      readonly representation?: SchemaRepresentation.CheckRepresentationAnnotation<SchemaAST.AST> | undefined
    }
  >(annotations: A | undefined, projectSchemas = false): {
    readonly representation?: CheckRepresentationAnnotation | undefined
    readonly annotations?: Omit<A, "representation"> | undefined
  } | undefined {
    if (annotations === undefined) return undefined
    const { representation, ...ordinary } = annotations
    const projected = projectSchemas && representation?.schemas !== undefined
      ? { ...representation, schemas: representation.schemas.map((schema) => recur(SchemaAST.toType(schema))) }
      : representation as CheckRepresentationAnnotation | undefined
    return {
      ...(projected === undefined ? undefined : { representation: projected }),
      ...(Object.keys(ordinary).length === 0 ? undefined : { annotations: ordinary })
    }
  }
}
