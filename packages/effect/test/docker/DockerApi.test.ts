import { assert, describe, it } from "@effect/vitest"
import { Schema, SchemaAST } from "effect"
import { DockerApi } from "effect/docker"
import { HttpApi, HttpApiSchema } from "effect/http-api"
import * as fs from "node:fs"

// The pinned API document's operations, written by `docker-codegen`.
const Manifest = Schema.Struct({
  apiVersion: Schema.String,
  operations: Schema.Array(Schema.Struct({
    operationId: Schema.String,
    method: Schema.String,
    path: Schema.String,
    query: Schema.Array(Schema.String),
    required: Schema.Array(Schema.String),
    headers: Schema.Array(Schema.String),
    body: Schema.Boolean,
    success: Schema.Array(Schema.Number),
    errors: Schema.Array(Schema.Number)
  }))
})

const manifest = Schema.decodeUnknownSync(Schema.fromJsonString(Manifest))(
  fs.readFileSync(new URL("./fixtures/engine-api.json", import.meta.url), "utf8")
)

interface Declared {
  readonly id: string
  readonly method: string
  readonly path: string
  readonly query: ReadonlyArray<string>
  readonly required: ReadonlyArray<string>
  readonly headers: ReadonlyArray<string>
  readonly body: boolean
  readonly success: ReadonlyArray<number>
  readonly errors: ReadonlyArray<number>
}

/** The fields of a struct as encoded, that is by their wire names, and which of them are required. */
const fieldsOf = (schema: Schema.Top | undefined) => {
  if (schema === undefined) return { names: [], required: [] }
  const ast = SchemaAST.toEncoded(schema.ast)
  assert(SchemaAST.isObjects(ast))
  return {
    names: ast.propertySignatures.map((property) => String(property.name)),
    required: ast.propertySignatures.filter((property) => !SchemaAST.isOptional(property.type)).map((property) =>
      String(property.name)
    )
  }
}

const successStatus = (schema: Schema.Top): ReadonlyArray<number> =>
  HttpApiSchema.isUpgrade(schema)
    ? [101]
    : HttpApiSchema.isStreamSchema(schema) ||
        (HttpApiSchema.isWithHeaders(schema) && HttpApiSchema.isStreamSchema(schema.schema))
    ? [HttpApiSchema.getStatusSuccessSchema(schema)]
    : []

const declared: Array<Declared> = []
HttpApi.reflect(DockerApi.DockerApi, {
  onGroup() {},
  onEndpoint({ endpoint, errors, group, successes }) {
    const query = fieldsOf(endpoint.query)
    declared.push({
      id: `${group.identifier}.${endpoint.identifier}`,
      method: endpoint.method,
      path: endpoint.path,
      query: query.names,
      required: query.required,
      headers: fieldsOf(endpoint.headers).names.map((name) => name.toLowerCase()),
      body: endpoint.payload.size > 0,
      success: [...successes.keys(), ...Array.from(endpoint.success).flatMap(successStatus)],
      errors: [...errors.keys()]
    })
  }
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
    const all = (f: (endpoint: Declared) => ReadonlyArray<string | number>) => [...new Set(endpoints.flatMap(f))]
    const query = all((endpoint) => endpoint.query) as Array<string>
    const required = all((endpoint) => endpoint.required) as Array<string>
    // `content-type` comes from the payload's encoding
    const headers = without(operation.headers, ["content-type"])
    const declaredHeaders = all((endpoint) => endpoint.headers) as Array<string>
    const success = all((endpoint) => endpoint.success) as Array<number>
    const errors = all((endpoint) => endpoint.errors) as Array<number>
    const found = [
      ...without(operation.query, query).map((name) => `query ${name} not declared`),
      ...without(query, operation.query).map((name) => `query ${name} not in the document`),
      ...without(required, operation.required).map((name) => `query ${name} required`),
      ...without(operation.required, required).map((name) => `query ${name} optional`),
      ...without(headers, declaredHeaders).map((name) => `header ${name} not declared`),
      ...without(declaredHeaders, operation.headers).map((name) => `header ${name} not in the document`),
      ...without(operation.success, success).map((status) => `success ${status} not declared`),
      ...without(success, operation.success).map((status) => `success ${status} not in the document`),
      ...without(operation.errors, errors).map((status) => `error ${status} not declared`),
      ...(endpoints.some((endpoint) => endpoint.body) !== operation.body
        ? [`body ${operation.body ? "not declared" : "not in the document"}`]
        : [])
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
      // the client always asks to upgrade, which the Engine answers with 101
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
      // the Engine answers 400 without a container, and a no-op 200 without a repository
      ImageCommit: ["query container required"],
      ImageTag: ["query repo required"],
      // the Engine answers 400 without a timeout, verified live
      PluginEnable: ["query timeout required"],
      // each endpoint of a split requires what tells it apart
      ImageBuild: ["query remote required"],
      ImageCreate: ["query fromImage required", "query fromSrc required"],
      ContainerStats: ["query stream required"]
    })
  })
})
