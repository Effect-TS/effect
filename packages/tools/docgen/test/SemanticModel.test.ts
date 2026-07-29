import * as Configuration from "@effect/docgen/Configuration"
import * as Domain from "@effect/docgen/Domain"
import * as SemanticModel from "@effect/docgen/SemanticModel"
import { assert, describe, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import { fileURLToPath } from "node:url"

const config: Configuration.ConfigurationShape = {
  projectName: "docgen",
  projectHomepage: "https://example.com",
  srcLink: "https://example.com/src/",
  srcDir: "src",
  outDir: "docs",
  theme: Configuration.DEFAULT_THEME,
  enableSearch: true,
  enforceDescriptions: false,
  enforceExamples: false,
  enforceVersion: true,
  generateDocs: true,
  frontend: "source",
  workspace: true,
  packageHomepages: {},
  exclude: [],
  parseCompilerOptions: {}
}

describe("SemanticModel", () => {
  it.effect("builds declaration hierarchy and examples before projection", () =>
    Effect.gen(function*() {
      const fixture = fileURLToPath(new URL("fixtures/workspace/packages/example/src/index.ts", import.meta.url))
      const model = yield* SemanticModel.fromSourceFiles([
        new Domain.SourceFile(
          fixture,
          ["src", "index.ts"],
          ["@effect/example"],
          "packages/example/src/index.ts",
          "@effect/example"
        )
      ], [{
        name: "@effect/example",
        root: fileURLToPath(new URL("fixtures/workspace/packages/example", import.meta.url))
      }])

      assert.strictEqual(model.packages.length, 1)
      assert.strictEqual(model.packages[0].modules.length, 1)
      assert.strictEqual(model.packages[0].modules[0].constants[0].name, "example")
      assert.strictEqual(model.examples.length, 2)
      const example = model.examples[1]
      assert.strictEqual(example.source, "export const result = await Promise.resolve(true)")
      assert.deepStrictEqual(example.declarationPath, ["example"])
      assert.strictEqual(example.declarationKind, "constant")
      assert.strictEqual(example.index, 1)
      assert.strictEqual(example.name, "@effect/example/index.example example 1")
    }).pipe(
      Effect.provideService(Configuration.Configuration, config),
      Effect.provideService(
        Domain.Process,
        Domain.Process.of({
          cwd: Effect.succeed(fileURLToPath(new URL("fixtures/workspace", import.meta.url))),
          platform: Effect.succeed(process.platform),
          argv: Effect.succeed([]),
          env: Effect.succeed({})
        })
      )
    ))

  it.effect("keeps static and instance method identities distinct", () =>
    Effect.gen(function*() {
      const fixture = fileURLToPath(new URL("fixtures/semantic-methods.ts", import.meta.url))
      const model = yield* SemanticModel.fromSourceFiles([
        new Domain.SourceFile(fixture, ["semantic-methods.ts"], ["semantic-methods.ts"], undefined, "docgen")
      ], [{ name: "docgen", root: import.meta.dirname }])

      assert.deepStrictEqual(model.examples.map((example) => [example.declarationKind, example.declarationPath]), [
        ["instanceMethod", ["Example", "method"]],
        ["staticMethod", ["Example", "method"]]
      ])
    }).pipe(
      Effect.provideService(Configuration.Configuration, { ...config, workspace: false }),
      Effect.provideService(
        Domain.Process,
        Domain.Process.of({
          cwd: Effect.succeed(import.meta.dirname),
          platform: Effect.succeed(process.platform),
          argv: Effect.succeed([]),
          env: Effect.succeed({})
        })
      )
    ))
})
