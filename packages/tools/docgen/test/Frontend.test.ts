import * as Configuration from "@effect/docgen/Configuration"
import * as DeclarationFrontend from "@effect/docgen/DeclarationFrontend"
import * as Domain from "@effect/docgen/Domain"
import * as SourceFrontend from "@effect/docgen/SourceFrontend"
import { assert, describe, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import { cp, mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { fileURLToPath } from "node:url"

const root = fileURLToPath(new URL("fixtures/frontends", import.meta.url))
const config: Configuration.ConfigurationShape = {
  projectName: "frontend-fixture",
  projectHomepage: "https://example.com",
  srcLink: "https://example.com/",
  srcDir: "src",
  outDir: "docs",
  theme: Configuration.DEFAULT_THEME,
  enableSearch: true,
  enforceDescriptions: false,
  enforceExamples: false,
  enforceVersion: true,
  generateDocs: true,
  generateExamples: true,
  frontend: "source",
  workspace: false,
  packageHomepages: {},
  exclude: [],
  parseCompilerOptions: {}
}

const processService = Domain.Process.of({
  cwd: Effect.succeed(root),
  platform: Effect.succeed(process.platform),
  argv: Effect.succeed([]),
  env: Effect.succeed({})
})

const shape = (model: SourceFrontend.SemanticModel) =>
  model.modules.map((module) => ({
    specifiers: module.source.specifiers,
    classes: module.classes.map((entry) => ({
      name: entry.name,
      methods: entry.methods.map((method) => method.name),
      staticMethods: entry.staticMethods.map((method) => method.name),
      properties: entry.properties.map((property) => property.name)
    })),
    interfaces: module.interfaces.map((entry) => entry.name),
    functions: module.functions.map((entry) => entry.name),
    typeAliases: module.typeAliases.map((entry) => entry.name),
    constants: module.constants.map((entry) => entry.name),
    exports: module.exports.map((entry) => entry.name),
    namespaces: module.namespaces.map((entry) => entry.name)
  }))

describe("documentation frontends", () => {
  it.effect("compile equivalent source and declaration files into one semantic shape", () =>
    Effect.gen(function*() {
      const source = yield* SourceFrontend.analyzePackage(root)
      const declaration = yield* DeclarationFrontend.analyzePackage(root)

      assert.deepStrictEqual(shape(declaration), shape(source))
      assert.strictEqual(source.examples[0].source, declaration.examples[0].source)
      assert.strictEqual(source.modules[0].classes[0].methods[0].name, "method")
      assert.strictEqual(source.modules[0].classes[0].staticMethods[0].name, "method")
      assert.strictEqual(declaration.frontend, "declaration")
      assert.strictEqual(source.frontend, "source")
      assert.strictEqual(declaration.modules[0].functions[0].position.source?.mapped, true)
      assert.strictEqual(declaration.modules[0].functions[0].position.source?.path, "src/index.ts")
      assert.match(declaration.examples[0].declarationPathname, /dist\/index\.d\.ts$/)
      assert.strictEqual(
        declaration.modules[0].functions[0].signature,
        "declare const callable: (value: string) => number"
      )
    }).pipe(
      Effect.provideService(Configuration.Configuration, config),
      Effect.provideService(Domain.Process, processService)
    ))

  it.effect("falls back to declaration locations when a declaration map is absent", () =>
    Effect.acquireUseRelease(
      Effect.promise(() => mkdtemp(join(tmpdir(), "effect-docgen-declarations-"))).pipe(
        Effect.tap((temporary) => Effect.promise(() => cp(root, temporary, { recursive: true }))),
        Effect.tap((temporary) => Effect.promise(() => rm(join(temporary, "dist", "index.d.ts.map"))))
      ),
      (temporary) =>
        Effect.gen(function*() {
          const model = yield* DeclarationFrontend.analyzePackage(temporary)
          const location = model.modules[0].functions[0].position.source!
          assert.isFalse(location.mapped)
          assert.strictEqual(location.path, "dist/index.d.ts")
          assert.strictEqual(location.analyzedPath, join(temporary, "dist", "index.d.ts"))
        }),
      (temporary) => Effect.promise(() => rm(temporary, { recursive: true, force: true }))
    ).pipe(
      Effect.provideService(Configuration.Configuration, config),
      Effect.provideService(Domain.Process, processService)
    ))

  it.effect("analyzes an unpacked package without mapped source content", () =>
    Effect.acquireUseRelease(
      Effect.promise(() => mkdtemp(join(tmpdir(), "effect-docgen-unpacked-"))).pipe(
        Effect.tap((temporary) => Effect.promise(() => cp(root, temporary, { recursive: true }))),
        Effect.tap((temporary) => Effect.promise(() => rm(join(temporary, "src"), { recursive: true })))
      ),
      (temporary) =>
        Effect.gen(function*() {
          const model = yield* DeclarationFrontend.analyzePackage(temporary)
          const location = model.modules[0].functions[0].position.source!
          assert.isFalse(location.mapped)
          assert.strictEqual(location.path, "dist/index.d.ts")
        }),
      (temporary) => Effect.promise(() => rm(temporary, { recursive: true, force: true }))
    ).pipe(
      Effect.provideService(Configuration.Configuration, config),
      Effect.provideService(Domain.Process, processService)
    ))
})
