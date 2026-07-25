import * as Configuration from "@effect/docgen/Configuration"
import * as Documentation from "@effect/docgen/Documentation"
import * as Domain from "@effect/docgen/Domain"
import * as ExampleMetadata from "@effect/docgen/ExampleMetadata"
import * as Examples from "@effect/docgen/Examples"
import * as SemanticModel from "@effect/docgen/SemanticModel"
import * as NodeServices from "@effect/platform-node/NodeServices"
import { assert, describe, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import { fileURLToPath } from "node:url"

const packageRoot = fileURLToPath(new URL("fixtures/workspace/packages/example", import.meta.url))
const sourcePath = fileURLToPath(new URL("fixtures/workspace/packages/example/src/index.ts", import.meta.url))
const config: Configuration.ConfigurationShape = {
  projectName: "@effect/example",
  projectHomepage: "https://example.com",
  srcLink: "https://example.com/src/",
  srcDir: "src",
  outDir: `${packageRoot}/docs-projection-test`,
  theme: Configuration.DEFAULT_THEME,
  enableSearch: true,
  enforceDescriptions: false,
  enforceExamples: false,
  enforceVersion: true,
  generateDocs: true,
  generateExamples: true,
  frontend: "source",
  workspace: true,
  packageHomepages: {},
  exclude: [],
  parseCompilerOptions: {}
}

const makeModel = SemanticModel.fromSourceFiles([
  new Domain.SourceFile(
    sourcePath,
    ["src", "index.ts"],
    ["@effect/example"],
    "packages/example/src/index.ts",
    "@effect/example"
  )
], [{ name: "@effect/example", root: packageRoot }])

describe("output projections", () => {
  it.effect("projects Markdown and example files from the same semantic model", () =>
    Effect.gen(function*() {
      const model = yield* makeModel
      const markdown = yield* Documentation.project(model)
      const examples = yield* Examples.project(model)

      assert.isTrue(markdown.some((file) => file.path.endsWith("docs-projection-test/modules/index.ts.md")))
      assert.strictEqual(examples.length, model.examples.length)
      assert.match(examples[1].path, /examples\/-effect-example-src-index\.ts-constant-example-0\.ts$/)
      assert.deepStrictEqual(ExampleMetadata.decode(examples[1].content), {
        name: "@effect/example/index.example example 1",
        packageName: "@effect/example",
        sourcePath: "packages/example/src/index.ts",
        declaration: "example",
        index: 1
      })
      assert.strictEqual(examples[1].content.split("\n").slice(1).join("\n"), model.examples[1].source)
    }).pipe(
      Effect.provideService(Configuration.Configuration, config),
      Effect.provideService(
        Domain.Process,
        Domain.Process.of({
          cwd: Effect.succeed(import.meta.dirname),
          platform: Effect.succeed(process.platform),
          argv: Effect.succeed([]),
          env: Effect.succeed({})
        })
      ),
      Effect.provide(NodeServices.layer)
    ))
})
