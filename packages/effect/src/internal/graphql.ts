import type { NonEmptyReadonlyArray } from "../Array.ts"
import type { DocumentTemplate } from "../graphql/GraphQL.ts"
import { type GraphQLError, ResponseError } from "../graphql/GraphQLClientError.ts"
import type { ExecutionResult } from "../graphql/GraphQLProtocol.ts"
import type * as Schema from "../Schema.ts"

/**
 * Builds a response error with raw data and transport metadata.
 *
 * @internal
 */
export const responseError = (
  result: ExecutionResult | undefined,
  errors: NonEmptyReadonlyArray<GraphQLError>
): ResponseError =>
  new ResponseError({
    errors,
    ...(result?.data === undefined ? {} : { data: result.data as Schema.Json }),
    ...(result?.extensions === undefined ? {} : { extensions: result.extensions }),
    ...(result?.status === undefined ? {} : { status: result.status })
  })

/**
 * Raw responses for partial results, used by resolvers to preserve error
 * metadata. Mock client results have no entry.
 *
 * @internal
 */
export const partialResponses = new WeakMap<object, ExecutionResult>()

/**
 * Joins two printed pieces, adding a space only where two non-punctuators
 * would otherwise touch. This is the generator printer's rule, so joining a
 * generated template reproduces the printed document exactly.
 */
const concat = (left: string, right: string): string =>
  /[\w"-]$/.test(left) && /^[\w"-]/.test(right) ? `${left} ${right}` : left + right

const concatAll = (pieces: ReadonlyArray<string>): string => pieces.reduce(concat, "")

/** Renders template parts, prefixing every name (the odd entries). */
const renderParts = (parts: DocumentTemplate.Parts, prefix: string): string =>
  parts.map((part, i) => i % 2 === 1 ? prefix + part : part).join("")

const isShared = (fragment: DocumentTemplate.Fragment): boolean => fragment.body.length <= 1

const renderOperation = (
  kind: string,
  name: string,
  variables: ReadonlyArray<string>,
  directives: string,
  selections: ReadonlyArray<string>,
  fragments: ReadonlyArray<string>
): string =>
  concatAll([
    kind,
    name,
    variables.length === 0 ? "" : `(${concatAll(variables)})`,
    directives,
    `{${concatAll(selections)}}`,
    ...fragments
  ])

const renderFragment = (fragment: DocumentTemplate.Fragment, prefix: string): string =>
  concatAll(["fragment", prefix + fragment.name, renderParts(fragment.body, prefix)])

/**
 * Joins a template into the document it was split from.
 *
 * @internal
 */
export const joinTemplate = (kind: string, name: string, template: DocumentTemplate): string =>
  renderOperation(
    kind,
    name,
    template.variables.map((variable) => `$${variable.name}:${variable.body}`),
    template.directives === undefined ? "" : renderParts(template.directives, ""),
    template.selections.map((selection) =>
      `${selection.alias === undefined ? "" : `${selection.alias}:`}${selection.name ?? ""}${
        renderParts(selection.body, "")
      }`
    ),
    template.fragments.map((fragment) => renderFragment(fragment, ""))
  )

/**
 * Why a template can't be rendered as slices, or `undefined` if it can.
 *
 * @internal
 */
export const unsliceableReason = (template: DocumentTemplate): string | undefined => {
  if (template.directives !== undefined && template.directives.length > 1) {
    return "its operation directives reference variables"
  }
  if (template.selections.some((selection) => selection.name === undefined)) {
    return "it has a fragment spread or inline fragment at the root"
  }
  return undefined
}

/**
 * Renders one operation that repeats the template once per prefix. Each
 * slice's variables, root response keys and per-slice fragments are renamed
 * with its prefix; operation directives and shared fragments appear once.
 * Prefixes must start a GraphQL name and be distinct.
 *
 * Throws if the template can't be sliced (see {@link unsliceableReason}),
 * rather than producing an invalid document.
 *
 * @internal
 */
// oxlint-disable-next-line effect/no-unused-internal -- groundwork for alias batching in `GraphQLResolver`
export const renderSlices = (
  kind: string,
  name: string,
  template: DocumentTemplate,
  prefixes: NonEmptyReadonlyArray<string>
): string => {
  const reason = unsliceableReason(template)
  if (reason !== undefined) {
    throw new Error(`Cannot render slices of operation ${name}: ${reason}`)
  }
  const sharedFragmentNames = new Set(template.fragments.filter(isShared).map((fragment) => fragment.name))
  for (const fragment of template.fragments) {
    if (isShared(fragment)) continue
    for (const prefix of prefixes) {
      const fragmentName = prefix + fragment.name
      if (sharedFragmentNames.has(fragmentName)) {
        throw new Error(
          `Cannot render slices of operation ${name}: fragment ${fragmentName} would collide with a shared fragment`
        )
      }
    }
  }
  return renderOperation(
    kind,
    name,
    prefixes.flatMap((prefix) => template.variables.map((variable) => `$${prefix}${variable.name}:${variable.body}`)),
    template.directives === undefined ? "" : renderParts(template.directives, ""),
    prefixes.flatMap((prefix) =>
      template.selections.map((selection) =>
        `${prefix}${selection.alias ?? selection.name}:${selection.name}${renderParts(selection.body, prefix)}`
      )
    ),
    template.fragments.flatMap((fragment) =>
      isShared(fragment) ? [renderFragment(fragment, "")] : prefixes.map((prefix) => renderFragment(fragment, prefix))
    )
  )
}
