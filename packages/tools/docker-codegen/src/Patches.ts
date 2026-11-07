/**
 * The standing patch families applied to the converted Docker Engine API
 * document before its Schemas are generated.
 *
 * Each family is computed from the document itself, so it stays correct when
 * the pinned spec version is bumped. Hand-written, field-specific patches live
 * in `codegen.yaml` and are applied before these, so the families also cover
 * what they add.
 *
 * @since 4.0.7
 */
import type * as JsonPatch from "effect/JsonPatch"
import * as JsonPointer from "effect/JsonPointer"
import * as Predicate from "effect/Predicate"

/**
 * A JSON value as it appears in the OpenAPI document.
 *
 * @category models
 * @since 4.0.7
 */
export type Node = { readonly [key: string]: unknown }

/**
 * The name of the synthetic definition referenced by every lenient enum.
 *
 * @category constants
 * @since 4.0.7
 */
export const lenientStringName = "LenientString"

const methods = ["get", "put", "post", "delete", "head", "patch"]

const pointer = (path: ReadonlyArray<string>): string => "/" + path.map(JsonPointer.escapeToken).join("/")

const isNode = (u: unknown): u is Node => Predicate.isObject(u) && !Array.isArray(u)

/**
 * Visits every schema object below `root`, depth first, with its path.
 */
const walk = (root: unknown, path: ReadonlyArray<string>, visit: (node: Node, path: ReadonlyArray<string>) => void) => {
  if (Array.isArray(root)) {
    root.forEach((child, i) => walk(child, [...path, String(i)], visit))
    return
  }
  if (!isNode(root)) return
  visit(root, path)
  for (const [key, child] of Object.entries(root)) {
    // `example` values are data, not schemas
    if (key === "example" || key === "examples") continue
    walk(child, [...path, key], visit)
  }
}

const componentSchemas = (document: Node): Node => {
  const components = document.components
  if (!isNode(components) || !isNode(components.schemas)) {
    throw new Error("The document has no components.schemas")
  }
  return components.schemas
}

/**
 * Patch family `empty-object-enums`: Docker's "map of empty objects" idiom, `additionalProperties:
 * { enum: [{}] }` (used by `ExposedPorts` and `Volumes`), becomes a map of
 * empty objects.
 *
 * @category patches
 * @since 4.0.7
 */
export const emptyObjectEnums = (document: Node): JsonPatch.JsonPatch => {
  const ops: Array<JsonPatch.JsonPatchOperation> = []
  walk(componentSchemas(document), ["components", "schemas"], (node, path) => {
    if (Array.isArray(node.enum) && node.enum.some((value) => Predicate.isObject(value))) {
      const { enum: _, default: _default, example: _example, ...rest } = node
      ops.push({
        op: "replace",
        path: pointer(path),
        value: { ...rest, type: "object", additionalProperties: false } as any
      })
    }
  })
  return ops
}

const isSliceOrMap = (node: Node): boolean =>
  node.type === "array" ||
  (node.type === "object" && node.additionalProperties !== undefined && node.additionalProperties !== false &&
    node.properties === undefined)

/**
 * Patch family `go-nil`: every `nullable` mark is Go's nil, which
 * `Schema.toCodecGoJson` decodes, so the marks are dropped and the types carry
 * no `| null`:
 *
 * - a slice or map that is `null` decodes as `[]` or `{}`, and an optional
 *   field that is `null` decodes as absent;
 * - a required field that can be `null` but isn't a slice or map (a nil
 *   pointer to a struct, such as a reference to the nullable `ContainerState`)
 *   becomes optional, so its `null` decodes as absent too.
 *
 * Collection items and map values lose the mark as well. The document marks
 * only `ContainerMemoryStats.stats` values, which Go writes from a
 * `map[string]uint64` and so can never be `null`.
 *
 * @category patches
 * @since 4.0.7
 */
export const goNil = (document: Node): JsonPatch.JsonPatch => {
  const schemas = componentSchemas(document)
  const isNil = (schema: unknown): boolean => {
    if (!isNode(schema)) return false
    const name = refName(schema.$ref)
    const resolved = name !== undefined ? schemas[name] : schema
    return isNode(resolved) && resolved.nullable === true && !isSliceOrMap(resolved)
  }
  const ops: Array<JsonPatch.JsonPatchOperation> = []
  walkSchemas(document, (node, path) => {
    if (node.nullable === true) {
      ops.push({ op: "remove", path: pointer([...path, "nullable"]) })
    }
    if (!isNode(node.properties) || !Array.isArray(node.required)) return
    const properties = node.properties
    const required = node.required.filter((key: unknown) => !(Predicate.isString(key) && isNil(properties[key])))
    if (required.length !== node.required.length) {
      ops.push({ op: "replace", path: pointer([...path, "required"]), value: required })
    }
  })
  return ops
}

/**
 * Patch family `lenient-enums`: every string `enum` decodes leniently, as the known
 * literals or any other string. Engines send values the document doesn't
 * list yet.
 *
 * The enum becomes a union of its literals and a reference to the synthetic
 * `LenientString` definition, which the generator renders as `string & {}`.
 *
 * @category patches
 * @since 4.0.7
 */
export const lenientEnums = (document: Node): JsonPatch.JsonPatch => {
  const ops: Array<JsonPatch.JsonPatchOperation> = [{
    op: "add",
    path: pointer(["components", "schemas", lenientStringName]),
    value: { type: "string", description: "Any string the Engine sends that isn't one of the known values." }
  }]
  walk(componentSchemas(document), ["components", "schemas"], (node, path) => {
    if (!Array.isArray(node.enum) || !node.enum.every(Predicate.isString)) return
    if (node.type !== undefined && node.type !== "string") return
    const { enum: literals, type: _, default: _default, example: _example, ...annotations } = node
    ops.push({
      op: "replace",
      path: pointer(path),
      value: {
        ...annotations,
        anyOf: [
          { type: "string", enum: literals },
          { $ref: `#/components/schemas/${lenientStringName}` }
        ]
      } as any
    })
  })
  return ops
}

const nodeAt = (root: unknown, path: ReadonlyArray<string>): unknown => {
  let current = root
  for (const key of path) {
    if (Array.isArray(current)) {
      current = current[Number(key)]
    } else if (isNode(current) && Object.hasOwn(current, key)) {
      current = current[key]
    } else {
      return undefined
    }
  }
  return current
}

/** Visits the schemas of `components.schemas` and of in-scope operations' JSON bodies. */
const walkSchemas = (document: Node, visit: (node: Node, path: ReadonlyArray<string>) => void) => {
  walk(componentSchemas(document), ["components", "schemas"], visit)
  const paths = isNode(document.paths) ? document.paths : {}
  for (const [route, item] of Object.entries(paths)) {
    if (!isNode(item)) continue
    for (const method of methods) {
      const operation = item[method]
      if (!isNode(operation) || !isInScope(operation)) continue
      walk(operation, ["paths", route, method], visit)
    }
  }
}

const refName = (ref: unknown): string | undefined =>
  Predicate.isString(ref) && ref.startsWith("#/components/schemas/")
    ? JsonPointer.unescapeToken(ref.slice("#/components/schemas/".length))
    : undefined

/**
 * Patch family `flatten-all-of`: an `allOf` of objects (`HostConfig` is `Resources` plus its
 * own fields, `NetworkInspect` is `Network` plus `Containers`) becomes one
 * object with all the members' properties. The generated objects are closed,
 * so an intersection of closed members would forbid each other's fields.
 *
 * @category patches
 * @since 4.0.7
 */
export const flattenAllOf = (document: Node): JsonPatch.JsonPatch => {
  const schemas = componentSchemas(document)
  const objectOf = (member: unknown): Node | undefined => {
    const name = isNode(member) ? refName(member.$ref) : undefined
    const resolved = name !== undefined ? schemas[name] : member
    if (!isNode(resolved)) return undefined
    if (Array.isArray(resolved.allOf)) return merge(resolved)
    return isNode(resolved.properties) ? resolved : undefined
  }
  const merge = (node: Node): Node | undefined => {
    const members = (node.allOf as ReadonlyArray<unknown>).map(objectOf)
    if (members.some((member) => member === undefined)) return undefined
    const { allOf: _, ...own } = node
    const properties: { [key: string]: unknown } = {}
    const required = new Set<string>()
    for (const member of [...members as ReadonlyArray<Node>, own]) {
      Object.assign(properties, member.properties ?? {})
      for (const key of Array.isArray(member.required) ? member.required : []) required.add(key)
    }
    return {
      ...own,
      type: "object",
      properties,
      ...(required.size > 0 ? { required: Array.from(required) } : {})
    }
  }
  const ops: Array<JsonPatch.JsonPatchOperation> = []
  walk(schemas, ["components", "schemas"], (node, path) => {
    if (!Array.isArray(node.allOf)) return
    const merged = merge(node)
    if (merged !== undefined) ops.push({ op: "replace", path: pointer(path), value: merged as any })
  })
  return ops
}

/**
 * The operation tags that `effect/docker` covers: all but `Session`
 * (BuildKit's gRPC session).
 *
 * @category constants
 * @since 4.0.7
 */
export const inScopeTags: ReadonlySet<string> = new Set([
  "Container",
  "Image",
  "Network",
  "Volume",
  "Exec",
  "System",
  "Distribution",
  "Swarm",
  "Node",
  "Service",
  "Task",
  "Secret",
  "Config",
  "Plugin"
])

const isInScope = (operation: Node): boolean =>
  Predicate.isString(operation.operationId) &&
  (Array.isArray(operation.tags) ? operation.tags : []).some((tag) => inScopeTags.has(tag))

/**
 * Patch family `hoist-operation-schemas`: inline JSON request bodies and success responses of
 * in-scope operations become named definitions, so every request body and
 * response has a generated Schema. The name is the schema's `title`, or
 * `<operationId>Request` / `<operationId>Response`; array responses name their
 * item schema instead.
 *
 * @category patches
 * @since 4.0.7
 */
export const hoistOperationSchemas = (document: Node): JsonPatch.JsonPatch => {
  const schemas = componentSchemas(document)
  const paths = isNode(document.paths) ? document.paths : {}
  const ops: Array<JsonPatch.JsonPatchOperation> = []
  const hoist = (schema: unknown, fallback: string) => {
    if (!isNode(schema) || schema.$ref !== undefined) return
    if (schema.type === "array") {
      if (isNode(schema.items) && Predicate.isString(schema.items.title)) {
        hoist(schema.items, schema.items.title)
      }
      return
    }
    if (schema.type !== "object" && !Array.isArray(schema.allOf)) return
    const name = Predicate.isString(schema.title) ? schema.title : fallback
    if (Object.hasOwn(schemas, name)) throw new Error(`Hoisted schema ${name} already exists`)
    ops.push({ op: "add", path: pointer(["components", "schemas", name]), value: schema as any })
  }
  for (const item of Object.values(paths)) {
    if (!isNode(item)) continue
    for (const method of methods) {
      const operation = item[method]
      if (!isNode(operation) || !Predicate.isString(operation.operationId)) continue
      if (!isInScope(operation)) continue
      const requestBody = nodeAt(operation, ["requestBody", "content", "application/json", "schema"])
      hoist(requestBody, `${operation.operationId}Request`)
      const responses = isNode(operation.responses) ? operation.responses : {}
      for (const [status, response] of Object.entries(responses)) {
        if (!status.startsWith("2")) continue
        hoist(nodeAt(response, ["content", "application/json", "schema"]), `${operation.operationId}Response`)
      }
    }
  }
  return ops
}

/**
 * A computed patch family. Each family is computed from the document as the
 * previous families left it.
 *
 * @category models
 * @since 4.0.7
 */
export interface Family {
  readonly name: string
  readonly make: (document: Node) => JsonPatch.JsonPatch
}

/**
 * All computed patch families, in the order they apply.
 *
 * @category patches
 * @since 4.0.7
 */
export const standing: ReadonlyArray<Family> = [
  { name: "hoist-operation-schemas", make: hoistOperationSchemas },
  { name: "flatten-all-of", make: flattenAllOf },
  { name: "empty-object-enums", make: emptyObjectEnums },
  { name: "go-nil", make: goNil },
  { name: "lenient-enums", make: lenientEnums }
]
