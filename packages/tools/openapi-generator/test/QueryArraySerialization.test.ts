import * as OpenApiGenerator from "@effect/openapi-generator/OpenApiGenerator"
import { assert, describe, it } from "@effect/vitest"
import * as Data from "effect/Data"
import * as Effect from "effect/Effect"
import * as Sse from "effect/encoding/Sse"
import type { OpenAPISpec } from "effect/http-api/OpenApi"
import * as HttpClient from "effect/http/HttpClient"
import * as HttpClientError from "effect/http/HttpClientError"
import * as HttpClientRequest from "effect/http/HttpClientRequest"
import * as HttpClientResponse from "effect/http/HttpClientResponse"
import * as UrlParams from "effect/http/UrlParams"
import * as Schema from "effect/Schema"
import * as Stream from "effect/Stream"
import { rolldown } from "rolldown"

const modules = {
  "effect/Data": Data,
  "effect/Effect": Effect,
  "effect/Schema": Schema,
  "effect/Stream": Stream,
  "effect/encoding/Sse": Sse,
  "effect/http/HttpClient": HttpClient,
  "effect/http/HttpClientError": HttpClientError,
  "effect/http/HttpClientRequest": HttpClientRequest,
  "effect/http/HttpClientResponse": HttpClientResponse,
  "effect/http/UrlParams": UrlParams
}

const formats = ["httpclient", "httpclient-type-only"] as const

type Format = typeof formats[number]

type SpecParameter = Record<string, unknown>

interface TestClient {
  readonly listItems: (...args: Array<any>) => Effect.Effect<unknown, unknown>
  readonly listItemsSse: (...args: Array<any>) => Stream.Stream<unknown, unknown>
  readonly listItemsStream: (...args: Array<any>) => Stream.Stream<unknown, unknown>
}

async function loadTestClient(source: string): Promise<(httpClient: HttpClient.HttpClient) => TestClient> {
  const bundle = await rolldown({
    input: "client.ts",
    external: (id) => id !== "client.ts",
    plugins: [{
      name: "generated-client",
      resolveId: (id) => id === "client.ts" ? id : undefined,
      load: (id) => id === "client.ts" ? source : undefined
    }]
  })
  try {
    const { output } = await bundle.generate({ format: "cjs" })
    const compiled = output[0]
    assert.strictEqual(compiled.type, "chunk")
    const exports = {} as { make: (httpClient: HttpClient.HttpClient) => TestClient }
    new Function("require", "exports", compiled.code)(
      (id: keyof typeof modules) => {
        assert.property(modules, id)
        return modules[id]
      },
      exports
    )
    return exports.make
  } finally {
    await bundle.close()
  }
}

const generate = (spec: OpenAPISpec, format: Format) =>
  Effect.gen(function*() {
    const generator = yield* OpenApiGenerator.OpenApiGenerator
    return yield* generator.generate(spec, { name: "TestClient", format })
  }).pipe(Effect.provide(
    format === "httpclient" ? OpenApiGenerator.layerTransformerSchema : OpenApiGenerator.layerTransformerTs
  ))

/**
 * The three generated request paths that consume query parameters.
 */
const requestVariants = [
  {
    name: "ordinary",
    method: "listItems" as const,
    response: () => new Response("\"ok\"", { status: 200, headers: { "content-type": "application/json" } })
  },
  {
    name: "sse",
    method: "listItemsSse" as const,
    response: () => new Response("data: \"ok\"\n\n", { status: 201, headers: { "content-type": "text/event-stream" } })
  },
  {
    name: "binary",
    method: "listItemsStream" as const,
    response: () => new Response("bytes", { status: 202 })
  }
]

interface QueryExpectation {
  readonly params: unknown
  /** Expected `URL.search`, including the leading question mark. */
  readonly search: string
  /** Expected decoded query entries in order. */
  readonly parsed: ReadonlyArray<readonly [string, string]>
  readonly pathId?: string | undefined
  readonly pathname?: string | undefined
}

const makeRecorder = (variant: typeof requestVariants[number]) => {
  const urls: Array<URL> = []
  const httpClient = HttpClient.make((request, url) => {
    urls.push(url)
    return Effect.succeed(HttpClientResponse.fromWeb(request, variant.response()))
  }).pipe(HttpClient.mapRequest(HttpClientRequest.prependUrl("https://example.test")))
  return { httpClient, urls }
}

const invoke = (client: TestClient, method: string, expectation: QueryExpectation) => {
  const options = expectation.params === undefined ? undefined : { params: expectation.params }
  const args = expectation.pathId === undefined ? [options] : [expectation.pathId, options]
  switch (method) {
    case "listItems":
      return client.listItems(...args)
    case "listItemsSse":
      return Stream.runDrain(client.listItemsSse(...args))
    default:
      return Stream.runDrain(client.listItemsStream(...args))
  }
}

/**
 * Runs one spec against both HttpClient formats and every generated request path,
 * asserting the final request URL and the decoded query entries.
 */
const assertQueryUrls = (spec: OpenAPISpec, expectations: ReadonlyArray<QueryExpectation>) =>
  Effect.gen(function*() {
    for (const format of formats) {
      const source = yield* generate(spec, format)
      const make = yield* Effect.promise(() => loadTestClient(source))
      for (const variant of requestVariants) {
        for (const expectation of expectations) {
          const { httpClient, urls } = makeRecorder(variant)
          const client = make(httpClient)
          yield* invoke(client, variant.method, expectation)
          const label = `${format} ${variant.name} ${JSON.stringify(expectation.params)}`
          assert.strictEqual(urls.length, 1, label)
          assert.strictEqual(urls[0].search, expectation.search, label)
          assert.deepStrictEqual([...urls[0].searchParams], expectation.parsed.map(([k, v]) => [k, v]), label)
          if (expectation.pathname !== undefined) {
            assert.strictEqual(urls[0].pathname, expectation.pathname, label)
          }
        }
      }
    }
  })

const itemsSpec = (
  options: {
    readonly path?: string | undefined
    readonly parameters?: ReadonlyArray<SpecParameter> | undefined
    readonly pathParameters?: ReadonlyArray<SpecParameter> | undefined
    readonly schemas?: Record<string, unknown> | undefined
    readonly componentParameters?: Record<string, unknown> | undefined
  } = {}
): OpenAPISpec =>
  ({
    openapi: "3.1.0",
    info: { title: "Items API", version: "1.0.0" },
    paths: {
      [options.path ?? "/items"]: {
        ...(options.pathParameters === undefined ? {} : { parameters: options.pathParameters }),
        get: {
          operationId: "listItems",
          parameters: options.parameters ?? [],
          responses: {
            "200": {
              description: "Item",
              content: { "application/json": { schema: { type: "string" } } }
            },
            "201": {
              description: "Events",
              content: { "text/event-stream": { schema: { type: "string" } } }
            },
            "202": {
              description: "Bytes",
              content: { "application/octet-stream": { schema: { type: "string" } } }
            }
          },
          tags: ["Items"],
          security: []
        }
      }
    },
    components: {
      schemas: options.schemas ?? {},
      securitySchemes: {},
      ...(options.componentParameters === undefined ? {} : { parameters: options.componentParameters })
    },
    security: [],
    tags: [{ name: "Items" }]
  }) as unknown as OpenAPISpec

const stringArrayParameter = (overrides: Record<string, unknown> = {}): SpecParameter => ({
  name: "tags",
  in: "query",
  required: false,
  schema: { type: "array", items: { type: "string" } },
  ...overrides
})

describe("query array serialization", () => {
  describe("non-exploded form arrays", () => {
    it.effect("serializes an explicit form array as one comma-separated value", () =>
      assertQueryUrls(
        itemsSpec({ parameters: [stringArrayParameter({ style: "form", explode: false })] }),
        [
          {
            params: { tags: ["red", "blue"] },
            search: "?tags=red,blue",
            parsed: [["tags", "red,blue"]]
          },
          {
            params: { tags: ["blue", "red"] },
            search: "?tags=blue,red",
            parsed: [["tags", "blue,red"]]
          },
          {
            params: { tags: ["red", "red"] },
            search: "?tags=red,red",
            parsed: [["tags", "red,red"]]
          },
          {
            params: { tags: ["solo"] },
            search: "?tags=solo",
            parsed: [["tags", "solo"]]
          }
        ]
      ))

    it.effect("treats an omitted style with explode false like form", () =>
      assertQueryUrls(
        itemsSpec({ parameters: [stringArrayParameter({ explode: false })] }),
        [
          {
            params: { tags: ["red", "blue"] },
            search: "?tags=red,blue",
            parsed: [["tags", "red,blue"]]
          },
          {
            params: { tags: ["solo"] },
            search: "?tags=solo",
            parsed: [["tags", "solo"]]
          }
        ]
      ))

    it.effect("omits undefined and empty array values", () =>
      assertQueryUrls(
        itemsSpec({ parameters: [stringArrayParameter({ style: "form", explode: false })] }),
        [
          { params: undefined, search: "", parsed: [] },
          { params: {}, search: "", parsed: [] },
          { params: { tags: undefined }, search: "", parsed: [] },
          { params: { tags: [] }, search: "", parsed: [] },
          { params: { tags: [undefined] }, search: "", parsed: [] }
        ]
      ))

    it.effect("preserves numeric and boolean element values", () =>
      assertQueryUrls(
        itemsSpec({
          parameters: [
            {
              name: "ids",
              in: "query",
              required: false,
              style: "form",
              explode: false,
              schema: { type: "array", items: { type: "number" } }
            },
            {
              name: "flags",
              in: "query",
              required: false,
              style: "form",
              explode: false,
              schema: { type: "array", items: { type: "boolean" } }
            }
          ]
        }),
        [
          {
            params: { ids: [1, 0, 2.5], flags: [true, false] },
            search: "?ids=1,0,2.5&flags=true,false",
            parsed: [["ids", "1,0,2.5"], ["flags", "true,false"]]
          }
        ]
      ))

    it.effect("preserves scalar parameters alongside converted arrays", () =>
      assertQueryUrls(
        itemsSpec({
          parameters: [
            stringArrayParameter({ style: "form", explode: false }),
            { name: "q", in: "query", required: false, schema: { type: "string" } }
          ]
        }),
        [
          {
            params: { tags: ["red", "blue"], q: "a b,c" },
            search: "?tags=red,blue&q=a+b%2Cc",
            parsed: [["tags", "red,blue"], ["q", "a b,c"]]
          },
          {
            params: { tags: ["red"], q: undefined },
            search: "?tags=red",
            parsed: [["tags", "red"]]
          }
        ]
      ))

    it.effect("resolves referenced array schemas and referenced parameter definitions", () =>
      assertQueryUrls(
        itemsSpec({
          parameters: [{ $ref: "#/components/parameters/Tags" }],
          schemas: { TagList: { type: "array", items: { type: "string" } } },
          componentParameters: {
            Tags: {
              name: "tags",
              in: "query",
              required: false,
              style: "form",
              explode: false,
              schema: { $ref: "#/components/schemas/TagList" }
            }
          }
        }),
        [
          {
            params: { tags: ["red", "blue"] },
            search: "?tags=red,blue",
            parsed: [["tags", "red,blue"]]
          }
        ]
      ))

    it.effect("encodes reserved characters once", () =>
      assertQueryUrls(
        itemsSpec({ parameters: [stringArrayParameter({ style: "form", explode: false })] }),
        [
          {
            params: { tags: ["a b", "a&b", "a+b", "a%b", "héllo", "a,b"] },
            search: "?tags=a+b,a%26b,a%2Bb,a%25b,h%C3%A9llo,a%2Cb",
            parsed: [["tags", "a b,a&b,a+b,a%b,héllo,a,b"]]
          }
        ]
      ))

    it.effect("distinguishes delimiter commas from commas and percent escapes in elements", () =>
      assertQueryUrls(
        itemsSpec({ parameters: [stringArrayParameter({ explode: false })] }),
        [
          { params: { tags: ["a,b", "c"] }, search: "?tags=a%2Cb,c", parsed: [["tags", "a,b,c"]] },
          { params: { tags: ["a", "b", "c"] }, search: "?tags=a,b,c", parsed: [["tags", "a,b,c"]] },
          { params: { tags: ["%2C", "", "#?="] }, search: "?tags=%252C,,%23%3F%3D", parsed: [["tags", "%2C,,#?="]] }
        ]
      ))

    for (
      const [name, schema] of Object.entries({
        tuple: { type: "array", prefixItems: [{ type: "integer" }, { type: "string" }], items: false },
        enum: { type: "array", items: { enum: [0, "blue"] } },
        oneOf: { type: "array", items: { oneOf: [{ type: "integer" }, { type: "string" }] } },
        anyOf: { type: "array", items: { anyOf: [{ type: "integer" }, { type: "string" }] } },
        types: { type: "array", items: { type: ["integer", "string"] } },
        reference: { type: "array", items: { $ref: "#/components/schemas/Identifier" } },
        intersection: {
          allOf: [{ type: "array", items: { $ref: "#/components/schemas/Identifier" } }, { minItems: 1 }]
        },
        arrayUnion: {
          oneOf: [{ type: "array", items: { type: "integer" } }, { type: "array", items: { type: "string" } }]
        },
        nullable: { type: ["array", "null"], items: { type: ["integer", "string", "null"] } },
        nullableUnion: {
          anyOf: [{ type: "array", items: { $ref: "#/components/schemas/Identifier" } }, { type: "null" }]
        }
      })
    ) {
      it.effect(`serializes arrays described by ${name}`, () =>
        assertQueryUrls(
          itemsSpec({
            parameters: [stringArrayParameter({ explode: false, schema })],
            schemas: { Identifier: { oneOf: [{ type: "integer" }, { type: "string" }] } }
          }),
          name === "arrayUnion"
            ? [{ params: { tags: [0, 1] }, search: "?tags=0,1", parsed: [["tags", "0,1"]] }]
            : [{ params: { tags: [0, "blue"] }, search: "?tags=0,blue", parsed: [["tags", "0,blue"]] }]
        ))
    }

    it.effect("preserves null handling for OpenAPI 3.0 nullable arrays", () =>
      assertQueryUrls(
        {
          ...itemsSpec({
            parameters: [stringArrayParameter({
              explode: false,
              schema: { type: "array", nullable: true, items: { type: "string", nullable: true } }
            })]
          }),
          openapi: "3.0.0"
        } as unknown as OpenAPISpec,
        [
          { params: { tags: null }, search: "?tags=null", parsed: [["tags", "null"]] },
          { params: { tags: [null, "blue"] }, search: "?tags=null,blue", parsed: [["tags", "null,blue"]] }
        ]
      ))

    it.effect("keeps scalar branches of scalar-or-array unions usable", () =>
      assertQueryUrls(
        itemsSpec({
          parameters: [stringArrayParameter({
            explode: false,
            schema: { anyOf: [{ type: "string" }, { type: "array", items: { type: "string" } }] }
          })]
        }),
        [
          { params: { tags: "a,b" }, search: "?tags=a%2Cb", parsed: [["tags", "a,b"]] },
          { params: { tags: ["a", "b"] }, search: "?tags=a,b", parsed: [["tags", "a,b"]] }
        ]
      ))

    it.effect("preserves query strings, fragments and subsequently added parameters", () =>
      Effect.gen(function*() {
        const spec = itemsSpec({
          path: "/items?existing=a%20b#section",
          parameters: [stringArrayParameter({ explode: false }), {
            name: "token",
            in: "query",
            schema: { type: "string" }
          }]
        })
        for (const format of formats) {
          const source = yield* generate(spec, format)
          const make = yield* Effect.promise(() => loadTestClient(source))
          for (const variant of requestVariants) {
            const { httpClient, urls } = makeRecorder(variant)
            const client = make(httpClient.pipe(HttpClient.mapRequest(HttpClientRequest.setUrlParam("token", "x+y"))))
            yield* invoke(client, variant.method, {
              params: { tags: ["a,b", "c"], token: "overridden" },
              search: "",
              parsed: []
            })
            assert.strictEqual(
              urls[0].href,
              "https://example.test/items?existing=a%20b&tags=a%2Cb,c&token=x%2By#section"
            )
          }
        }
      }))

    it.effect("keeps CSV parameters visible and replaceable in client middleware", () =>
      Effect.gen(function*() {
        const spec = itemsSpec({ parameters: [stringArrayParameter({ explode: false })] })
        for (const format of formats) {
          const source = yield* generate(spec, format)
          const make = yield* Effect.promise(() => loadTestClient(source))
          for (const variant of requestVariants) {
            for (
              const replace of [
                HttpClientRequest.setUrlParam("tags", "override"),
                HttpClientRequest.setUrlParams({ tags: "override" })
              ]
            ) {
              const { httpClient, urls } = makeRecorder(variant)
              const client = make(httpClient.pipe(HttpClient.mapRequest((request) => {
                assert.deepStrictEqual(UrlParams.getAll(request.urlParams, "tags"), ["a,b,c"])
                return replace(request)
              })))
              yield* invoke(client, variant.method, { params: { tags: ["a,b", "c"] }, search: "", parsed: [] })
              assert.strictEqual(urls[0].search, "?tags=override")
            }
          }
        }
      }))

    it.effect("keeps path parameters separate from query arrays", () =>
      assertQueryUrls(
        itemsSpec({
          path: "/items/{id}",
          pathParameters: [
            { name: "id", in: "path", required: true, schema: { type: "string" } },
            stringArrayParameter({ style: "form", explode: false })
          ],
          parameters: [{
            name: "ids",
            in: "query",
            required: false,
            explode: false,
            schema: { type: "array", items: { type: "integer" } }
          }]
        }),
        [
          {
            pathId: "42",
            pathname: "/items/42",
            params: { tags: ["red", "blue"], ids: [7, 8] },
            search: "?tags=red,blue&ids=7,8",
            parsed: [["tags", "red,blue"], ["ids", "7,8"]]
          }
        ]
      ))
  })

  describe("repeated query parameters", () => {
    it.effect("keeps repeated parameters for explicit and omitted explode", () =>
      assertQueryUrls(
        itemsSpec({ parameters: [stringArrayParameter({ style: "form", explode: true })] }),
        [
          {
            params: { tags: ["red", "blue"] },
            search: "?tags=red&tags=blue",
            parsed: [["tags", "red"], ["tags", "blue"]]
          },
          {
            params: { tags: ["solo"] },
            search: "?tags=solo",
            parsed: [["tags", "solo"]]
          }
        ]
      ))

    it.effect("keeps repeated parameters for the default query array case", () =>
      assertQueryUrls(
        itemsSpec({ parameters: [stringArrayParameter()] }),
        [
          {
            params: { tags: ["red", "blue", "red"] },
            search: "?tags=red&tags=blue&tags=red",
            parsed: [["tags", "red"], ["tags", "blue"], ["tags", "red"]]
          },
          { params: { tags: [] }, search: "", parsed: [] }
        ]
      ))

    it.effect("keeps repeated parameters for unsupported delimiter styles", () =>
      assertQueryUrls(
        itemsSpec({ parameters: [stringArrayParameter({ style: "spaceDelimited", explode: false })] }),
        [
          {
            params: { tags: ["red", "blue"] },
            search: "?tags=red&tags=blue",
            parsed: [["tags", "red"], ["tags", "blue"]]
          }
        ]
      ))

    it.effect("keeps nested deepObject arrays unchanged", () =>
      assertQueryUrls(
        itemsSpec({
          parameters: [{
            name: "filter",
            in: "query",
            style: "deepObject",
            explode: true,
            schema: { $ref: "#/components/schemas/Filter" }
          }],
          schemas: { Filter: { type: "object", properties: { ids: { type: "array", items: { type: "integer" } } } } }
        }),
        [{
          params: { filter: { ids: [1, 2] } },
          search: "?filter%5Bids%5D=1&filter%5Bids%5D=2",
          parsed: [["filter[ids]", "1"], ["filter[ids]", "2"]]
        }]
      ))

    it.effect("does not CSV-encode arrays of objects or nested arrays", () =>
      assertQueryUrls(
        itemsSpec({
          parameters: [stringArrayParameter({
            explode: false,
            schema: {
              type: "array",
              items: { anyOf: [{ type: "object" }, { type: "array", items: { type: "integer" } }] }
            }
          })]
        }),
        [{
          params: { tags: [{ id: 1 }, [2, 3]] },
          search: "?tags=%5Bobject+Object%5D&tags=2%2C3",
          parsed: [["tags", "[object Object]"], ["tags", "2,3"]]
        }]
      ))

    it.effect("does not convert object query parameters", () =>
      assertQueryUrls(
        itemsSpec({
          parameters: [
            {
              name: "filter",
              in: "query",
              required: false,
              style: "form",
              explode: false,
              schema: {
                type: "object",
                properties: { kind: { type: "string" }, size: { type: "integer" } },
                required: ["kind"],
                additionalProperties: false
              }
            }
          ]
        }),
        [
          {
            params: { "filter[kind]": "book", "filter[size]": 3 },
            search: "?filter%5Bkind%5D=book&filter%5Bsize%5D=3",
            parsed: [["filter[kind]", "book"], ["filter[size]", "3"]]
          }
        ]
      ))
  })

  describe("parameter declarations", () => {
    it.effect("uses path-level serialization metadata", () =>
      assertQueryUrls(
        itemsSpec({ pathParameters: [stringArrayParameter({ style: "form", explode: false })] }),
        [
          {
            params: { tags: ["red", "blue"] },
            search: "?tags=red,blue",
            parsed: [["tags", "red,blue"]]
          }
        ]
      ))

    it.effect("lets an operation-level explode override a path-level declaration", () =>
      assertQueryUrls(
        itemsSpec({
          pathParameters: [stringArrayParameter({ style: "form", explode: false })],
          parameters: [stringArrayParameter({ style: "form", explode: true })]
        }),
        [
          {
            params: { tags: ["red", "blue"] },
            search: "?tags=red&tags=blue",
            parsed: [["tags", "red"], ["tags", "blue"]]
          }
        ]
      ))

    it.effect("lets an operation-level non-exploded array override a path-level declaration", () =>
      assertQueryUrls(
        itemsSpec({
          pathParameters: [stringArrayParameter({ style: "form", explode: true })],
          parameters: [stringArrayParameter({ explode: false })]
        }),
        [
          {
            params: { tags: ["red", "blue"] },
            search: "?tags=red,blue",
            parsed: [["tags", "red,blue"]]
          }
        ]
      ))
  })
})
