import * as Config from "@effect/ai-codegen/Config"
import type { DiscoveredProvider } from "@effect/ai-codegen/Discovery"
import * as Generator from "@effect/ai-codegen/Generator"
import * as OpenApiGenerator from "@effect/openapi-generator/OpenApiGenerator"
import * as NodeServices from "@effect/platform-node/NodeServices"
import { assert, describe, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Schema from "effect/Schema"

describe("CodeGenerator", () => {
  it.effect("accepts whitespace-leading inline patches", () => {
    const spec = { openapi: "3.1.0", info: { title: "Before", version: "1.0.0" }, paths: {} }
    const expected = { ...spec, info: { ...spec.info, title: "After" } }
    const provider: DiscoveredProvider = {
      name: "test",
      packagePath: import.meta.dirname,
      config: Schema.decodeUnknownSync(Config.CodegenConfig)({
        spec: "spec.json",
        output: "Generated.ts",
        patches: [" \n[{\"op\":\"replace\",\"path\":\"/info/title\",\"value\":\"After\"}]"]
      }),
      specSource: Config.SpecSource.File("spec.json"),
      outputPath: "Generated.ts"
    }
    const generatorLayer = Generator.layer.pipe(
      Layer.provide(Layer.succeed(OpenApiGenerator.OpenApiGenerator, {
        generate: (received) => Effect.succeed(JSON.stringify(received))
      }))
    )

    return Effect.gen(function*() {
      const generator = yield* Generator.CodeGenerator
      const output = yield* generator.generate(provider, spec)

      assert.deepStrictEqual(JSON.parse(output), expected)
      assert.deepStrictEqual(spec, { openapi: "3.1.0", info: { title: "Before", version: "1.0.0" }, paths: {} })
    }).pipe(Effect.provide(generatorLayer), Effect.provide(NodeServices.layer))
  })
})
