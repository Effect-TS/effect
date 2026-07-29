import * as Configuration from "@effect/docgen/Configuration"
import * as Core from "@effect/docgen/Core"
import * as Examples from "@effect/docgen/Examples"
import { readFileSync } from "node:fs"
import { relative } from "node:path"
import { fileURLToPath } from "node:url"
import { defineConfig } from "vitest/config"

interface DocgenConfig {
  readonly projectHomepage: string
  readonly srcLink: string
  readonly outDir: string
  readonly theme: string
  readonly enableSearch: boolean
  readonly enforceDescriptions: boolean
  readonly enforceExamples: boolean
  readonly enforceVersion: boolean
  readonly frontend: "source" | "declaration"
  readonly workspace: boolean
  readonly packageHomepages: Readonly<Record<string, string>>
  readonly exclude: ReadonlyArray<string>
}

const docgen = JSON.parse(readFileSync(new URL("./docgen.json", import.meta.url), "utf8")) as DocgenConfig

const runner = fileURLToPath(new URL("./packages/tools/docgen/src/ExampleRunner.ts", import.meta.url))
const config = Configuration.Configuration.of({
  projectName: "Workspace",
  projectHomepage: docgen.projectHomepage,
  srcLink: docgen.srcLink,
  srcDir: "src",
  outDir: docgen.outDir,
  theme: docgen.theme,
  enableSearch: docgen.enableSearch,
  enforceDescriptions: docgen.enforceDescriptions,
  enforceExamples: docgen.enforceExamples,
  enforceVersion: docgen.enforceVersion,
  generateDocs: true,
  frontend: docgen.frontend,
  workspace: docgen.workspace,
  packageHomepages: docgen.packageHomepages,
  exclude: docgen.exclude,
  parseCompilerOptions: Configuration.defaultCompilerOptions
})

const model = await Core.analyzeWithNode(config)
const projects = model.packages.flatMap((pkg) => {
  const examples = model.examples.filter((example) => example.packageName === pkg.name)
  const files = globalThis.Array.from(new Set(examples.map((example) => example.declarationPathname)))
  if (files.length === 0) return []
  return [{
    plugins: [Examples.vitestPlugin(examples)],
    test: {
      name: relative(import.meta.dirname, pkg.root),
      root: pkg.root,
      include: files.map((file) => relative(pkg.root, file)),
      exclude: [],
      runner,
      environment: "node",
      coverage: { enabled: false },
      isolate: false,
      fileParallelism: false,
      maxWorkers: 1,
      maxConcurrency: 1,
      sequence: { concurrent: false, shuffle: false },
      experimental: { viteModuleRunner: true }
    }
  }]
})

export default defineConfig({
  root: import.meta.dirname,
  test: {
    coverage: { enabled: false },
    fileParallelism: false,
    maxWorkers: 1,
    projects
  }
})
