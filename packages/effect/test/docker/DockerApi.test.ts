import { assert, describe, it } from "@effect/vitest"
import { Effect, Layer, Schema, Stream } from "effect"
import { DockerApi, DockerContainers, DockerError, DockerVolumes } from "effect/docker"
import { HttpApi, HttpApiBuilder, HttpApiGroup, HttpApiSchema, OpenApi } from "effect/http-api"
import * as fs from "node:fs"
import { fakeEngine } from "./utils/fake.ts"
import { concat, frame } from "./utils/stub.ts"

const Operation = Schema.Struct({
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

type Operation = typeof Operation.Type

// The pinned API document's operations, written by `docker-codegen`.
const Manifest = Schema.Struct({
  apiVersion: Schema.String,
  operations: Schema.Array(Schema.Struct({ operationId: Schema.String, ...Operation.fields }))
})

const manifest = Schema.decodeUnknownSync(Schema.fromJsonString(Manifest))(
  fs.readFileSync(new URL("./fixtures/engine-api.json", import.meta.url), "utf8")
)

interface Node {
  readonly [key: string]: unknown
}

const isNode = (u: unknown): u is Node => typeof u === "object" && u !== null && !Array.isArray(u)

const nodes = (u: unknown): ReadonlyArray<Node> => Array.isArray(u) ? u.filter(isNode) : []

/**
 * The fields of the body schemas under `content`, as `docker-codegen` writes
 * them into the manifest: paths (`Parent.Child`, `List[]`, `Map.*`), with `!`
 * after a required property. `$ref`s are followed once per path, `allOf` parts
 * merged, and `oneOf` / `anyOf` variants merged, a property required only if
 * every variant requires it.
 */
const fieldsOf = (components: Node, withContent: ReadonlyArray<unknown>): Array<string> => {
  const walk = (node: unknown, prefix: string, seen: ReadonlyArray<string>, out: Map<string, boolean>): void => {
    if (!isNode(node)) return
    if (typeof node.$ref === "string") {
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
  for (const node of withContent) {
    const content = isNode(node) && isNode(node.content) ? node.content : {}
    for (const mediaType of Object.values(content)) {
      if (isNode(mediaType)) walk(mediaType.schema, "", [], out)
    }
  }
  return Array.from(out, ([path, required]) => required ? `${path}!` : path).sort()
}

/**
 * An endpoint as `DockerApi`'s OpenAPI document states it, built for the
 * endpoint alone: the document and `DockerApi` split some operations into
 * endpoints on the same path. OpenAPI marks every request body required, so
 * an optional one is read from the payload.
 */
const declare = (group: HttpApiGroup.Top, endpoint: HttpApiGroup.Top["endpoints"][string]) => {
  const spec = OpenApi.fromApi(HttpApi.make("docker").add(HttpApiGroup.make(group.identifier).add(endpoint)))
  const [[path, item]] = Object.entries(spec.paths)
  const operation = item[endpoint.method.toLowerCase() as "get"]!
  const parameters = (location: string, required: boolean) =>
    (operation.parameters ?? [])
      .filter((parameter) => parameter.in === location && (!required || parameter.required))
      .map((parameter) => location === "header" ? parameter.name.toLowerCase() : parameter.name)
  const statuses = Object.keys(operation.responses).map(Number)
  const success = statuses.filter((status) => status < 400)
  const payloads = Array.from(endpoint.payload.values()).flatMap(({ schemas }) => schemas)
  const declared: Operation = {
    method: endpoint.method,
    path: path.replaceAll(/\{(\w+)\}/g, ":$1"),
    query: parameters("query", false),
    required: parameters("query", true),
    headers: parameters("header", false),
    requiredHeaders: parameters("header", true),
    body: payloads.length === 0
      ? "none"
      : payloads.some((schema) => HttpApiSchema.isNoContent(schema.ast))
      ? "optional"
      : "required",
    consumes: Object.keys(operation.requestBody?.content ?? {}),
    success,
    produces: success.flatMap((status) => Object.keys(operation.responses[status].content ?? {})),
    errors: statuses.filter((status) => status >= 400),
    requestFields: fieldsOf(spec.components.schemas, [operation.requestBody]),
    responseFields: fieldsOf(spec.components.schemas, success.map((status) => operation.responses[status]))
  }
  return { id: `${group.identifier}.${endpoint.identifier}`, ...declared }
}

const declared: Array<ReturnType<typeof declare>> = []
HttpApi.reflect(DockerApi.DockerApi, {
  onGroup() {},
  onEndpoint: ({ endpoint, group }) => declared.push(declare(group, endpoint))
})

/** A path with its parameters unnamed: the document and `DockerApi` name some differently. */
const shape = (path: string) => path.replaceAll(/:\w+/g, ":")

const without = <A>(self: ReadonlyArray<A>, that: ReadonlyArray<A>) => self.filter((a) => !that.includes(a))

/** The endpoints that declare an operation of the document: several when `DockerApi` splits it. */
const endpointsOf = (operation: typeof manifest.operations[number]) =>
  declared.filter((endpoint) => endpoint.method === operation.method && shape(endpoint.path) === shape(operation.path))

/** How `DockerApi` differs from each operation of the document, by `operationId`. */
const differences = (): Record<string, ReadonlyArray<string>> => {
  const out: Record<string, ReadonlyArray<string>> = {}
  for (const operation of manifest.operations) {
    // an operation can be declared as several endpoints, split by what they take or answer
    const endpoints = endpointsOf(operation)
    if (endpoints.length === 0) {
      out[operation.operationId] = ["not declared"]
      continue
    }
    const all = <A>(f: (endpoint: Operation) => ReadonlyArray<A>) => [...new Set(endpoints.flatMap(f))]
    // what the document requires, every endpoint of a split must require
    const optional = (f: (endpoint: Operation) => ReadonlyArray<string>, required: ReadonlyArray<string>) =>
      required.filter((name) => endpoints.some((endpoint) => !f(endpoint).includes(name)))
    // `content-type` is the request body's media type
    const headers = without(operation.headers, ["content-type"])
    // media types where the document states some: many of its bodies and responses have no schema, so no media type
    const mediaTypes = (documented: ReadonlyArray<string>, declared: ReadonlyArray<string>) =>
      documented.length === 0 ? [] : without(declared, documented)
    const found = [
      ...without(operation.query, all((e) => e.query)).map((name) => `query ${name} not declared`),
      ...without(all((e) => e.query), operation.query).map((name) => `query ${name} not in the document`),
      ...without(all((e) => e.required), operation.required).map((name) => `query ${name} required`),
      ...optional((e) => e.required, operation.required).map((name) => `query ${name} optional`),
      ...without(headers, all((e) => e.headers)).map((name) => `header ${name} not declared`),
      ...without(all((e) => e.headers), operation.headers).map((name) => `header ${name} not in the document`),
      ...without(all((e) => e.requiredHeaders), operation.requiredHeaders).map((name) => `header ${name} required`),
      ...optional((e) => e.requiredHeaders, operation.requiredHeaders).map((name) => `header ${name} optional`),
      // the document marks only some bodies required, so a required body counts as optional, but not the reverse
      ...(operation.body === "none" && endpoints.some((e) => e.body !== "none") ? ["body not in the document"] : []),
      ...(operation.body !== "none" && endpoints.every((e) => e.body === "none") ? ["body not declared"] : []),
      ...(operation.body === "required" && endpoints.some((e) => e.body !== "required") ? ["body optional"] : []),
      ...mediaTypes(operation.consumes, all((e) => e.consumes)).map((type) => `request ${type} not in the document`),
      ...without(operation.success, all((e) => e.success)).map((status) => `success ${status} not declared`),
      ...without(all((e) => e.success), operation.success).map((status) => `success ${status} not in the document`),
      ...mediaTypes(operation.produces, all((e) => e.produces)).map((type) => `response ${type} not in the document`),
      ...without(operation.errors, all((e) => e.errors)).map((status) => `error ${status} not declared`)
    ]
    if (found.length > 0) out[operation.operationId] = found
  }
  for (const endpoint of declared) {
    if (
      !manifest.operations.some((operation) =>
        endpoint.method === operation.method && shape(endpoint.path) === shape(operation.path)
      )
    ) {
      out[endpoint.id] = ["not in the document"]
    }
  }
  return out
}

/** The paths of `paths` none of whose parents is among them: a missing object is one difference, not one per field. */
const topmost = (paths: ReadonlyArray<string>) =>
  paths.filter((path) =>
    !paths.some((other) => other !== path && (path.startsWith(`${other}.`) || path.startsWith(`${other}[]`)))
  )

/**
 * How the fields of `DockerApi`'s request and response bodies differ from the
 * document's, by `operationId`: where both state some fields (a stream of
 * bytes has none), the fields one has and the other hasn't, and the required
 * ones.
 */
const fieldDifferences = (): Record<string, ReadonlyArray<string>> => {
  const out: Record<string, ReadonlyArray<string>> = {}
  for (const operation of manifest.operations) {
    const endpoints = endpointsOf(operation)
    if (endpoints.length === 0) continue
    const found: Array<string> = []
    for (
      const [part, f] of [["request", (e: Operation) => e.requestFields], [
        "response",
        (e: Operation) => e.responseFields
      ]] as const
    ) {
      const documented = f(operation)
      const all = [...new Set(endpoints.flatMap(f))]
      if (documented.length === 0 || all.length === 0) continue
      const names = (paths: ReadonlyArray<string>) => paths.map((path) => path.replace(/!$/, ""))
      found.push(
        ...topmost(without(names(documented), names(all))).map((path) => `${part} ${path} not declared`),
        ...topmost(without(names(all), names(documented))).map((path) => `${part} ${path} not in the document`),
        ...without(all, documented).filter((path) =>
          path.endsWith("!") && names(documented).includes(path.slice(0, -1))
        )
          .map((path) => `${part} ${path.slice(0, -1)} required`),
        // `toCodecGoJson` reads a response's missing key as Go's zero value, so its encoded fields are all optional
        ...(part === "response" ? [] : without(documented, all))
          .filter((path) => path.endsWith("!") && names(all).includes(path.slice(0, -1)))
          .map((path) => `${part} ${path.slice(0, -1)} optional`)
      )
    }
    if (found.length > 0) out[operation.operationId] = found
  }
  return out
}

describe("DockerApi", () => {
  it("declares the pinned API document's operations, except where the Engine differs from it", () => {
    assert.strictEqual(manifest.apiVersion, "1.56")
    assert.deepStrictEqual(differences(), {
      // HttpApi can't declare a WebSocket endpoint; `attach` upgrades to the same streams
      ContainerAttachWebsocket: ["not declared"],
      // deprecated since API 1.52: a BuildKit session is gRPC over h2c, with headers the document doesn't list
      Session: ["not declared"],
      // the client always asks to upgrade, which the Engine answers with 101; `Detach: false` rules out exec's 200
      ContainerAttach: ["success 200 not declared"],
      ExecStart: ["success 200 not declared", "success 101 not in the document"],
      // pull and upgrade answer a progress stream with 200, verified live
      PluginPull: ["success 204 not declared", "success 200 not in the document"],
      PluginUpgrade: ["success 204 not declared", "success 200 not in the document"],
      // the Engine reads registry credentials here too
      DistributionInspect: ["header x-registry-auth not in the document"],
      ImageSearch: ["header x-registry-auth not in the document"],
      GetPluginPrivileges: ["header x-registry-auth not in the document"],
      PluginPush: ["header x-registry-auth not in the document"],
      // Engines before API 1.48 read only `keep-storage`, which the document dropped
      BuildPrune: ["query keep-storage not in the document"],
      // the Engine answers 400 without a container, verified live
      ImageCommit: ["query container required"],
      // without a repository, the Engine does nothing and answers 200, verified live
      ImageTag: ["success 200 not in the document"],
      // the Engine answers 400 without a timeout, verified live
      PluginEnable: ["query timeout required"],
      // each endpoint of a split requires what tells it apart; a build context and an import are tar archives,
      // which the Engine reads whatever the media type, verified live
      ImageBuild: ["query remote required", "request application/x-tar not in the document"],
      ImageCreate: [
        "query fromImage required",
        "query fromSrc required",
        "request application/x-tar not in the document"
      ],
      ContainerStats: ["query stream required"],
      // HttpApi gives a stream one media type; the declared `Content-Type` header says which of the two it is
      ContainerLogs: ["response application/octet-stream not in the document"],
      ServiceLogs: ["response application/octet-stream not in the document"],
      TaskLogs: ["response application/octet-stream not in the document"]
    })
  })

  it("declares the document's request and response fields, except where the Engine differs from it", () => {
    assert.deepStrictEqual(fieldDifferences(), {
      // an unlock can't succeed without the key
      SwarmUnlock: ["request UnlockKey required"],
      // the Engine answers `{ "ID" }` (moby's `SecretCreateResponse` and `ConfigCreateResponse`), verified live
      SecretCreate: ["response Id not declared", "response ID not in the document"],
      ConfigCreate: ["response Id not declared", "response ID not in the document"],
      // Engines before API 1.52 answer these too, down to 1.44, which the client decodes
      SystemDataUsage: [
        "response BuildCache not in the document",
        "response Containers not in the document",
        "response Images not in the document",
        "response LayersSize not in the document",
        "response Volumes not in the document"
      ],
      // the Engine's AuthConfig has `identitytoken`, which the document leaves out
      SystemAuth: ["request identitytoken not in the document"]
    })
  })
})

// What a server built from `DockerApi` encodes, the services decode. The containers group can't be served
// whole (`stats` and `statsStream` share a route), so the fake serves its `logs` alone.
const Served = HttpApi.make("docker").add(DockerApi.Volumes).add(
  HttpApiGroup.make("containers").add(DockerApi.Containers.endpoints.logs)
)

const volume = {
  Name: "v",
  Driver: "local",
  Mountpoint: "/var/lib/docker/volumes/v",
  Labels: {},
  Scope: "local" as const,
  Options: {}
}

const Handlers = HttpApiBuilder.group(Served, "volumes", (handlers) =>
  handlers
    .handle("inspect", ({ params }) =>
      params.name === "v"
        ? Effect.succeed(volume)
        : Effect.fail(new DockerError.NotFound({ message: `get ${params.name}: no such volume` })))
    .handle("create", ({ payload }) =>
      payload.ClusterVolumeSpec === undefined
        ? Effect.succeed(volume)
        : Effect.fail(new DockerError.SwarmUnavailable({ message: "This node is not a swarm manager." })))
    .handle("list", () => Effect.die("unused"))
    .handle("update", () => Effect.die("unused"))
    .handle("remove", () => Effect.die("unused"))
    .handle("prune", () => Effect.die("unused"))).pipe(
    Layer.merge(
      HttpApiBuilder.group(
        Served,
        "containers",
        (handlers) =>
          handlers.handle("logs", () =>
            Effect.succeed(HttpApiSchema.withHeaders({
              body: Stream.make(concat(frame(1, "out"), frame(2, "err"))),
              headers: { "content-type": "application/vnd.docker.multiplexed-stream" as const }
            })))
      )
    )
  )

describe("DockerApi, served by HttpApiBuilder", () => {
  it.effect("is what the services decode: bodies, error responses and stream headers", () =>
    Effect.gen(function*() {
      const volumes = yield* DockerVolumes.DockerVolumes
      const containers = yield* DockerContainers.DockerContainers
      assert.deepStrictEqual(yield* volumes.inspect("v"), volume)
      const missing = yield* Effect.flip(volumes.inspect("w"))
      assert.deepStrictEqual(
        [missing.reason, missing.operation],
        [new DockerError.NotFound({ message: "get w: no such volume" }), "docker.Volumes.inspect"]
      )
      const cluster = yield* Effect.flip(volumes.create({ Name: "c", ClusterVolumeSpec: {} }))
      assert.strictEqual(cluster.reason._tag, "SwarmUnavailable")
      const frames = yield* Stream.runCollect(containers.logs("c"))
      assert.deepStrictEqual(
        Array.from(frames, (frame) => `${frame.stream}:${new TextDecoder().decode(frame.data)}`),
        ["stdout:out", "stderr:err"]
      )
    }).pipe(Effect.provide(fakeEngine(Served, Handlers))))
})
