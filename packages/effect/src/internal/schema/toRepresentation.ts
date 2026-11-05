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
}

interface Content {
  readonly mediaType: string
  readonly schema?: ReferenceCandidate | undefined
}

const passwordStrings = new WeakMap<SchemaAST.AST, SchemaAST.AST>()

function isRedactedDeclaration(ast: SchemaAST.AST): boolean {
  return (ast.annotations?.representation as { readonly id?: unknown } | undefined)?.id === "effect/schema/Redacted"
}

// The wire string of a `Redacted` value is represented with the `password` format, unless it already specifies a
// format. The codec ASTs keep the original string, so only representations (and the JSON Schema and code generated
// from them) see the format. The marker lets a format supplied by a check take precedence when exporting.
function toPasswordString(ast: SchemaAST.AST): SchemaAST.AST {
  let target = ast
  while (target._tag === "Suspend" && target.annotations?.format === undefined) target = target.thunk()
  if (
    target._tag !== "String" ||
    target.encoding !== undefined ||
    target.annotations?.format !== undefined ||
    target.checks?.some((check) => check.annotations?.format !== undefined)
  ) {
    return ast
  }
  let password = passwordStrings.get(ast)
  if (password === undefined) {
    const annotations = { format: "password", [InternalAnnotations.PASSWORD_FORMAT_DEFAULT_KEY]: true }
    password = ast._tag === "Suspend"
      ? SchemaAST.annotate(ast, annotations)
      : InternalAnnotations.resolveIdentifier(ast) !== undefined
      // A shared definition keeps its own schema, so the format is added to this use site only
      ? new SchemaAST.Suspend(() => ast, annotations)
      // Annotate the string itself rather than its last check, so the format is exported next to `type`
      : SchemaAST.replaceChecks(SchemaAST.annotate(SchemaAST.replaceChecks(ast, undefined), annotations), ast.checks)
    passwordStrings.set(ast, password)
  }
  return password
}

function annotationsField<A>(annotations: A | undefined): { readonly annotations: A } | undefined {
  return annotations === undefined ? undefined : { annotations }
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
    // Whether the chain passed through a `Redacted` declaration followed only by string-to-string encodings
    let redacted = false
    while (ast.encoding !== undefined && encodingLength > 0) {
      redacted = isRedactedDeclaration(ast) || redacted && ast._tag === "String"
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
    if (redacted && ast !== input) ast = toPasswordString(ast)
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
    visitCandidate(getCandidate(input))
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
    return recurCandidate(getCandidate(input))
  }

  function recurCandidate(candidate: ReferenceCandidate): SchemaRepresentation.Representation {
    const ast = candidate.ast
    const reference = candidate.reference
    if (reference !== undefined) {
      if (!candidate.emitted) {
        candidate.emitted = true
        const annotated = candidate.identifier === undefined ? ast : annotateReference(ast, candidate, reference)
        const representation = on(annotated, candidate.content)
        InternalRecord.assignProperty(references, reference, representation)
      }
      return { _tag: "Reference", $ref: reference }
    }
    return on(ast, candidate.content)
  }

  function on(ast: SchemaAST.AST, content: Content | undefined): SchemaRepresentation.Representation {
    const common = {
      checks: ast.checks?.map(fromCheck) ?? [],
      ...(ast._tag === "Declaration" ? fromAnnotations(ast.annotations) : annotationsField(ast.annotations))
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
