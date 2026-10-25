/**
 * The operations of the patched Docker Engine API document, written as the
 * manifest `effect/docker`'s conformance test checks `DockerApi` against.
 *
 * Each operation records what a declaration of it has to match: the method,
 * the path, the query and header parameters by their wire names, its body and
 * its media types, the statuses it answers with, and the fields of its request
 * and response bodies.
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
 * - `requestFields` and `responseFields` are the fields of the request body
 *   and of the success responses' bodies, see {@link fields}.
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
  errors: Schema.Array(Schema.Number),
  requestFields: Schema.Array(Schema.String),
  responseFields: Schema.Array(Schema.String)
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
 * The fields of the body schemas under a request body's or a response's
 * `content`, as sorted paths: `Name`, `Parent.Child`, `List[]` for the items
 * of an array and `Map.*` for the values of a map, with `!` after a required
 * property.
 *
 * **Details**
 *
 * `$ref`s are followed (a schema already being read isn't read again),
 * `allOf` parts are merged, and so are `oneOf` and `anyOf` variants, where a
 * property is required only if every variant requires it. Types aren't
 * compared.
 *
 * @category constructors
 * @since 4.0.6
 */
export const fields = (document: Patches.Node, nodesWithContent: ReadonlyArray<unknown>): Array<string> => {
  const components = isNode(document.components) && isNode(document.components.schemas)
    ? document.components.schemas
    : {}
  const walk = (node: unknown, prefix: string, seen: ReadonlyArray<string>, out: Map<string, boolean>): void => {
    if (!isNode(node)) return
    if (Predicate.isString(node.$ref)) {
      const name = node.$ref.replace("#/components/schemas/", "")
      if (!seen.includes(name)) walk(components[name], prefix, [...seen, name], out)
      return
    }
    for (const part of nodes(node.allOf)) walk(part, prefix, seen, out)
    const variants = [...nodes(node.oneOf), ...nodes(node.anyOf)].map((variant) => {
      const paths = new Map<string, boolean>()
      walk(variant, prefix, seen, paths)
      return paths
    })
    for (const path of new Set(variants.flatMap((paths) => Array.from(paths.keys())))) {
      out.set(path, (out.get(path) ?? false) || variants.every((paths) => paths.get(path) === true))
    }
    if (isNode(node.properties)) {
      const required = Array.isArray(node.required) ? node.required : []
      for (const [name, child] of Object.entries(node.properties)) {
        const path = prefix === "" ? name : `${prefix}.${name}`
        out.set(path, (out.get(path) ?? false) || required.includes(name))
        walk(child, path, seen, out)
      }
    }
    if (isNode(node.additionalProperties)) {
      walk(node.additionalProperties, prefix === "" ? "*" : `${prefix}.*`, seen, out)
    }
    if (isNode(node.items)) walk(node.items, `${prefix}[]`, seen, out)
  }
  const out = new Map<string, boolean>()
  for (const node of nodesWithContent) {
    const content = isNode(node) && isNode(node.content) ? node.content : {}
    for (const mediaType of Object.values(content)) {
      if (isNode(mediaType)) walk(mediaType.schema, "", [], out)
    }
  }
  return sorted(Array.from(out, ([path, required]) => required ? `${path}!` : path))
}

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
        errors: statuses.filter((status) => status >= 400),
        requestFields: fields(document, [requestBody]),
        responseFields: fields(document, success.map((status) => responses[status]))
      })
    }
  }
  operations.sort((a, b) => a.path.localeCompare(b.path) || a.method.localeCompare(b.method))
  return { apiVersion: source.apiVersion, spec: source.spec, operations }
}
