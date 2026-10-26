import * as Config from "@effect/ai-codegen/Config"
import type { DiscoveredProvider } from "@effect/ai-codegen/Discovery"
import * as Generator from "@effect/ai-codegen/Generator"
import * as OpenApiGenerator from "@effect/openapi-generator/OpenApiGenerator"
import * as NodeServices from "@effect/platform-node/NodeServices"
import { assert, describe, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Path from "effect/Path"
import * as TestConsole from "effect/testing/TestConsole"

const TestLayer = Generator.layer.pipe(
  Layer.provide(Layer.succeed(OpenApiGenerator.OpenApiGenerator, {
    generate: (spec) => Effect.succeed(JSON.stringify(spec))
  })),
  Layer.provideMerge(NodeServices.layer)
)

const provider = (patch: string): DiscoveredProvider => ({
  name: "test",
  packagePath: "/providers/test",
  config: new Config.CodegenConfig({
    spec: "spec.json",
    output: "Generated.ts",
    patches: [patch]
  }),
  specSource: Config.SpecSource.File("spec.json"),
  outputPath: "Generated.ts"
})

const generateWithPatch = Effect.fnUntraced(function*(patch: string) {
  const generator = yield* Generator.CodeGenerator
  const output = yield* generator.generate(provider(patch), {
    openapi: "3.1.0",
    info: { title: "Before", version: "1.0.0" },
    paths: {}
  })
  return JSON.parse(output)
})

describe("CodeGenerator patch inputs", () => {
  it.effect("accepts inline patches with leading whitespace", () =>
    Effect.gen(function*() {
      const result = yield* generateWithPatch(
        " \n[{\"op\":\"replace\",\"path\":\"/info/title\",\"value\":\"After\"}]"
      )
      assert.deepStrictEqual(result, {
        openapi: "3.1.0",
        info: { title: "After", version: "1.0.0" },
        paths: {}
      })
    }).pipe(Effect.provide(TestLayer)))

  it.effect("accepts absolute paths with leading whitespace", () =>
    Effect.gen(function*() {
      const path = yield* Path.Path
      const patch = path.join(
        import.meta.dirname,
        "../../openapi-generator/test/fixtures/patches/valid-replace.json"
      )
      const result = yield* generateWithPatch(` ${patch}`)
      assert.deepStrictEqual(result, {
        openapi: "3.1.0",
        info: { title: "Updated API Title", version: "1.0.0" },
        paths: {}
      })
    }).pipe(Effect.provide(TestLayer)))
})

describe("CodeGenerator path selection", () => {
  it.effect("generates only the configured paths", () =>
    Effect.gen(function*() {
      const generator = yield* Generator.CodeGenerator
      const output = yield* generator.generate({
        ...provider("[]"),
        config: new Config.CodegenConfig({
          spec: "spec.json",
          output: "Generated.ts",
          includePaths: ["/v1/messages", "/v1/messages?beta=true"]
        })
      }, {
        openapi: "3.1.0",
        info: { title: "Test", version: "1.0.0" },
        paths: {
          "/v1/messages": { post: { operationId: "messages_post" } },
          "/v1/messages?beta=true": { post: { operationId: "beta_messages_post" } },
          "/v1/organizations/users": { get: { operationId: "users_list" } }
        }
      })
      assert.deepStrictEqual(JSON.parse(output).paths, {
        "/v1/messages": { post: { operationId: "messages_post" } },
        "/v1/messages?beta=true": { post: { operationId: "beta_messages_post" } }
      })
    }).pipe(Effect.provide(TestLayer)))
})

describe("CodeGenerator included schemas", () => {
  it.effect("passes included schemas to the OpenAPI generator", () =>
    Effect.gen(function*() {
      const generator = yield* Generator.CodeGenerator
      const output = yield* generator.generate({
        ...provider("[]"),
        config: new Config.CodegenConfig({
          spec: "spec.json",
          output: "Generated.ts",
          includeSchemas: ["BetaMessageStreamEvent"]
        })
      }, {
        openapi: "3.1.0",
        info: { title: "Test", version: "1.0.0" },
        paths: {}
      })
      assert.strictEqual(output, JSON.stringify(["BetaMessageStreamEvent"]))
    }).pipe(Effect.provide(
      Generator.layer.pipe(
        Layer.provide(Layer.succeed(OpenApiGenerator.OpenApiGenerator, {
          generate: (_spec, options) => Effect.succeed(JSON.stringify(options.includeSchemas))
        })),
        Layer.provideMerge(NodeServices.layer)
      )
    )))
})

describe("CodeGenerator warnings", () => {
  it.effect("reports OpenAPI generator warnings to stderr without changing the generated code", () =>
    Effect.gen(function*() {
      const generator = yield* Generator.CodeGenerator
      const output = yield* generator.generate(provider("[]"), {
        openapi: "3.1.0",
        info: { title: "Test", version: "1.0.0" },
        paths: {}
      })
      assert.strictEqual(output, "export const Generated = 1")
      assert.deepStrictEqual(yield* TestConsole.errorLines, [
        "WARNING [cookie-parameter-dropped] GET /items (listItems): Cookie parameter \"session\" was dropped."
      ])
    }).pipe(Effect.provide(
      Generator.layer.pipe(
        Layer.provide(Layer.succeed(OpenApiGenerator.OpenApiGenerator, {
          generate: (_spec, options) => {
            options.onWarning?.({
              code: "cookie-parameter-dropped",
              message: "Cookie parameter \"session\" was dropped.",
              path: "/items",
              method: "get",
              operationId: "listItems"
            })
            return Effect.succeed("export const Generated = 1")
          }
        })),
        Layer.provideMerge(Layer.mergeAll(NodeServices.layer, TestConsole.layer))
      )
    )))
})

describe("CodeGenerator error status ranges", () => {
  const errorResponse = (description: string, schema = "ErrorResponse") => ({
    description,
    content: { "application/json": { schema: { $ref: `#/components/schemas/${schema}` } } }
  })
  const ok = { description: "Message object." }

  const generateResponses = Effect.fnUntraced(function*(
    responses: Record<string, unknown>,
    errorStatusRanges?: ReadonlyArray<"4XX" | "5XX">
  ) {
    const generator = yield* Generator.CodeGenerator
    const output = yield* generator.generate({
      ...provider("[]"),
      config: new Config.CodegenConfig({ spec: "spec.json", output: "Generated.ts", errorStatusRanges })
    }, {
      openapi: "3.1.0",
      info: { title: "Test", version: "1.0.0" },
      paths: { "/v1/messages": { post: { operationId: "messages_post", responses } } }
    })
    return JSON.parse(output).paths["/v1/messages"].post.responses
  })

  const responses = {
    "200": ok,
    "400": errorResponse("Invalid argument"),
    "429": errorResponse("Resource exhausted"),
    "500": errorResponse("Internal"),
    "529": errorResponse("Overloaded")
  }

  it.effect("folds listed ranges and drops other error statuses", () =>
    Effect.gen(function*() {
      assert.deepStrictEqual(yield* generateResponses(responses, ["4XX"]), {
        "200": ok,
        "4XX": errorResponse("Invalid argument")
      })
    }).pipe(Effect.provide(TestLayer)))

  it.effect("refuses to fold distinct error schemas", () =>
    Effect.gen(function*() {
      const error = yield* Effect.flip(generateResponses({
        "200": ok,
        "400": errorResponse("Invalid argument"),
        "404": errorResponse("Not found", "NotFoundResponse")
      }, ["4XX"]))
      assert.strictEqual(error._tag, "GenerationError")
      assert.include(String(error.cause), "/v1/messages")
      assert.include(String(error.cause), "4XX")
    }).pipe(Effect.provide(TestLayer)))

  it.effect("leaves error statuses unchanged when no ranges are configured", () =>
    Effect.gen(function*() {
      assert.deepStrictEqual(yield* generateResponses(responses), responses)
    }).pipe(Effect.provide(TestLayer)))
})
