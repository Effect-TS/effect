import { assert, describe, it } from "@effect/vitest"
import { Schema } from "effect"
import { DockerApi } from "effect/docker"
import { HttpApi, HttpApiGroup, HttpApiSchema, OpenApi } from "effect/http-api"
import * as fs from "node:fs"

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
  errors: Schema.Array(Schema.Number)
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
    errors: statuses.filter((status) => status >= 400)
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

/** How `DockerApi` differs from each operation of the document, by `operationId`. */
const differences = (): Record<string, ReadonlyArray<string>> => {
  const out: Record<string, ReadonlyArray<string>> = {}
  for (const operation of manifest.operations) {
    // an operation can be declared as several endpoints, split by what they take or answer
    const endpoints = declared.filter((endpoint) =>
      endpoint.method === operation.method && shape(endpoint.path) === shape(operation.path)
    )
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
})
