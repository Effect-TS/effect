/**
 * The operations of the patched Docker Engine API document, written as the
 * manifest `effect/docker`'s conformance test checks `DockerApi` against.
 *
 * Each operation records what a declaration of it has to match: the method,
 * the path, the query and header parameters by their wire names, its body and
 * its media types, and the statuses it answers with.
 *
 * @since 4.0.6
 */
import * as Predicate from "effect/Predicate"
import * as Schema from "effect/Schema"
import type * as Patches from "./Patches.ts"

/**
 * One operation of the Engine API.
 *
 * **Details**
 *
 * - `path` has its parameters as `:name`, as `HttpApi` paths do.
 * - `query` and `headers` are the parameter names as sent; header names are
 *   lowercase. `required` and `requiredHeaders` list the required ones.
 * - `body` says whether a request body is taken, and `consumes` its media
 *   types.
 * - `success` are the statuses below 400 the document declares, `errors`
 *   the others. `produces` are the media types of the success responses
 *   that have a body.
 *
 * @category models
 * @since 4.0.6
 */
export const Operation = Schema.Struct({
  operationId: Schema.String,
  method: Schema.String,
  path: Schema.String,
  query: Schema.Array(Schema.String),
  required: Schema.Array(Schema.String),
  headers: Schema.Array(Schema.String),
  requiredHeaders: Schema.Array(Schema.String),
  body: Schema.Literals(["none", "optional", "required"]),
  consumes: Schema.Array(Schema.String),
  success: Schema.Array(Schema.Number),
  produces: Schema.Array(Schema.String),
  errors: Schema.Array(Schema.Number)
})

/**
 * @category models
 * @since 4.0.6
 */
export type Operation = typeof Operation.Type

/**
 * The manifest: the API version it was read from, and every operation.
 *
 * @category models
 * @since 4.0.6
 */
export const Manifest = Schema.Struct({
  apiVersion: Schema.String,
  spec: Schema.String,
  operations: Schema.Array(Operation)
})

/**
 * @category models
 * @since 4.0.6
 */
export type Manifest = typeof Manifest.Type

const methods = ["get", "put", "post", "delete", "head", "patch"]

const isNode = (u: unknown): u is Patches.Node => Predicate.isObject(u) && !Array.isArray(u)

const nodes = (u: unknown): ReadonlyArray<Patches.Node> => Array.isArray(u) ? u.filter(isNode) : []

const sorted = (values: Iterable<string>): Array<string> => Array.from(new Set(values)).sort()

/**
 * Reads every operation of a patched OpenAPI 3.0 document, ordered by path
 * and method.
 *
 * @category constructors
 * @since 4.0.6
 */
export const make = (
  document: Patches.Node,
  source: { readonly apiVersion: string; readonly spec: string }
): Manifest => {
  const operations: Array<Operation> = []
  const paths = isNode(document.paths) ? document.paths : {}
  for (const [path, item] of Object.entries(paths)) {
    if (!isNode(item)) continue
    for (const method of methods) {
      const operation = item[method]
      if (!isNode(operation)) continue
      // parameters of the path item apply to each of its operations
      const parameters = [...nodes(item.parameters), ...nodes(operation.parameters)]
      const named = (location: string) =>
        parameters.filter((parameter) => parameter.in === location && Predicate.isString(parameter.name))
      const names = (location: string, required: boolean) =>
        sorted(
          named(location)
            .filter((parameter) => !required || parameter.required === true)
            .map((parameter) =>
              location === "header" ? (parameter.name as string).toLowerCase() : parameter.name as string
            )
        )
      const responses = isNode(operation.responses) ? operation.responses : {}
      const statuses = Object.keys(responses)
        .filter((status) => /^\d{3}$/.test(status))
        .map(Number)
        .sort((a, b) => a - b)
      const success = statuses.filter((status) => status < 400)
      const requestBody = isNode(operation.requestBody) ? operation.requestBody : undefined
      const mediaTypes = (node: unknown) => {
        const content = isNode(node) ? node.content : undefined
        return isNode(content) ? Object.keys(content) : []
      }
      operations.push({
        operationId: Predicate.isString(operation.operationId) ? operation.operationId : `${method} ${path}`,
        method: method.toUpperCase(),
        path: path.replaceAll(/\{(\w+)\}/g, ":$1"),
        query: names("query", false),
        required: names("query", true),
        headers: names("header", false),
        requiredHeaders: names("header", true),
        body: requestBody === undefined ? "none" : requestBody.required === true ? "required" : "optional",
        consumes: sorted(mediaTypes(requestBody)),
        success,
        produces: sorted(success.flatMap((status) => mediaTypes(responses[status]))),
        errors: statuses.filter((status) => status >= 400)
      })
    }
  }
  operations.sort((a, b) => a.path.localeCompare(b.path) || a.method.localeCompare(b.method))
  return { apiVersion: source.apiVersion, spec: source.spec, operations }
}
