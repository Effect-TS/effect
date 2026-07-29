import * as Configuration from "@effect/docgen/Configuration"
import * as Documentation from "@effect/docgen/Documentation"
import * as Domain from "@effect/docgen/Domain"
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
  it.effect("projects Markdown from the semantic model", () =>
    Effect.gen(function*() {
      const model = yield* makeModel
      const markdown = yield* Documentation.project(model)

      assert.isTrue(markdown.some((file) => file.path.endsWith("docs-projection-test/modules/index.ts.md")))
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
