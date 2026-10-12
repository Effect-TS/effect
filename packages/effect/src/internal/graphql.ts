import type { NonEmptyReadonlyArray } from "../Array.ts"
import * as Context from "../Context.ts"
import type * as Effect from "../Effect.ts"
import type * as Exit from "../Exit.ts"
import type { DocumentTemplate } from "../graphql/GraphQL.ts"
import type { PartialResult } from "../graphql/GraphQLClient.ts"
import { type GraphQLError, ResponseError } from "../graphql/GraphQLClientError.ts"
import type { ExecutionResult } from "../graphql/GraphQLProtocol.ts"
import type * as Headers from "../http/Headers.ts"
import type * as UrlParams from "../http/UrlParams.ts"
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
    ...(result?.status === undefined ? {} : { status: result.status }),
    ...(result?.headers === undefined ? {} : { headers: result.headers })
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

/**
 * Renders the template once per prefix. The empty prefix renders it as
 * written; any other prefix renames variables and per-slice fragments and
 * aliases root fields to the prefixed response key.
 */
const render = (
  kind: string,
  name: string,
  template: DocumentTemplate,
  prefixes: ReadonlyArray<string>
): string =>
  concatAll([
    kind,
    name,
    template.variables.length === 0 ? "" : `(${
      concatAll(
        prefixes.flatMap((prefix) =>
          template.variables.map((variable) => `$${prefix}${variable.name}:${variable.body}`)
        )
      )
    })`,
    template.directives === undefined ? "" : renderParts(template.directives, ""),
    `{${
      concatAll(prefixes.flatMap((prefix) =>
        template.selections.map((selection) => {
          const key = prefix === "" ? selection.alias : `${prefix}${selection.alias ?? selection.name}`
          return `${key === undefined ? "" : `${key}:`}${selection.name ?? ""}${renderParts(selection.body, prefix)}`
        })
      ))
    }}`,
    ...template.fragments.flatMap((fragment) =>
      (isShared(fragment) ? [""] : prefixes).map((prefix) =>
        concatAll(["fragment", prefix + fragment.name, renderParts(fragment.body, prefix)])
      )
    )
  ])

/**
 * Joins a template into the document it was split from.
 *
 * @internal
 */
export const joinTemplate = (kind: string, name: string, template: DocumentTemplate): string =>
  render(kind, name, template, [""])

/** Why the template can't be rendered for these prefixes, if it can't. */
const unsliceableReason = (template: DocumentTemplate, prefixes: ReadonlyArray<string>): string | undefined => {
  if (template.directives !== undefined && template.directives.length > 1) {
    return "its operation directives reference variables"
  }
  if (template.selections.some((selection) => selection.name === undefined)) {
    return "it has a fragment spread or inline fragment at the root"
  }
  const shared = new Set(template.fragments.filter(isShared).map((fragment) => fragment.name))
  const collision = template.fragments
    .flatMap((fragment) => isShared(fragment) ? [] : prefixes.map((prefix) => prefix + fragment.name))
    .find((renamed) => shared.has(renamed))
  return collision === undefined ? undefined : `fragment ${collision} would collide with a shared fragment`
}

/**
 * Renders one operation that repeats the template once per prefix. Each
 * slice's variables, root response keys and per-slice fragments are renamed
 * with its prefix; operation directives and shared fragments appear once.
 * Prefixes must start a GraphQL name, and none may be a prefix of another.
 *
 * Throws rather than producing an invalid document when an operation
 * directive references a variable, a root selection is a fragment spread or
 * inline fragment, or a renamed fragment would take a shared fragment's name.
 *
 * @internal
 */
export const renderSlices = (
  kind: string,
  name: string,
  template: DocumentTemplate,
  prefixes: NonEmptyReadonlyArray<string>
): string => {
  const reason = unsliceableReason(template, prefixes)
  if (reason !== undefined) {
    throw new Error(`Cannot render slices of operation ${name}: ${reason}`)
  }
  return render(kind, name, template, prefixes)
}

/**
 * Makes the HTTP transport POST a query even with `queryMethod: "GET"`. Alias
 * batches set it, since their documents can exceed URL length limits.
 *
 * @internal
 */
export const ForcePost = Context.Reference<boolean>("effect/graphql/ForcePost", { defaultValue: () => false })

/**
 * The property under which client methods for queries and mutations carry
 * their {@link Batch} capability.
 *
 * @internal
 */
export const batchId = "~effect/graphql/batch"

/**
 * Runs one call per entry of `variables`, as one aliased request where the
 * client can. Returns each entry's result in order, with errors matched to
 * it; fails as a whole when the batch itself fails.
 *
 * @internal
 */
export type Batch = (
  variables: NonEmptyReadonlyArray<unknown>,
  options: {
    readonly headers?: Headers.Input | undefined
    readonly urlParams?: UrlParams.Input | undefined
  }
) => Effect.Effect<ReadonlyArray<Exit.Exit<PartialResult<unknown>, unknown>>, unknown, unknown>

/**
 * JSON with object keys sorted, so equal JSON values give equal strings.
 *
 * @internal
 */
export const canonicalJson = (value: unknown): string =>
  JSON.stringify(value, (_, value) =>
    value !== null && typeof value === "object" && !Array.isArray(value)
      ? Object.fromEntries(Object.keys(value).sort().map((key) => [key, value[key]]))
      : value)
