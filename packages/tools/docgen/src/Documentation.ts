/**
 * @since 0.6.0
 */

import markdownToc from "@effect/markdown-toc"
import * as Effect from "effect/Effect"
import * as FileSystem from "effect/FileSystem"
import * as Path from "effect/Path"
import * as String from "effect/String"
import * as Glob from "glob"
import * as Configuration from "./Configuration.ts"
import * as Domain from "./Domain.ts"
import * as Printer from "./Printer.ts"
import type * as SemanticModel from "./SemanticModel.ts"

const getOutDir = Effect.gen(function*() {
  const config = yield* Configuration.Configuration
  const path = yield* Path.Path
  return path.isAbsolute(config.outDir) ? config.outDir : path.resolve(config.outDir)
})

const homepage = Effect.gen(function*() {
  const path = yield* Path.Path
  return new Domain.File(
    path.join(yield* getOutDir, "index.md"),
    String.stripMargin(
      `|---
     |title: Home
     |nav_order: 1
     |---
     |`
    )
  )
})

const index = Effect.gen(function*() {
  const path = yield* Path.Path
  return new Domain.File(
    path.join(yield* getOutDir, "modules", "index.md"),
    String.stripMargin(
      `|---
     |title: Modules
     |has_children: true
     |permalink: /docs/modules
     |nav_order: 2
     |---
     |`
    )
  )
})

const navigationHeader = (config: Configuration.ConfigurationShape): string =>
  config.projectHomepage.toLowerCase().includes("github") ? `${config.projectName} on GitHub` : "Homepage"

const configYml = Effect.gen(function*() {
  const config = yield* Configuration.Configuration
  const fs = yield* FileSystem.FileSystem
  const path = yield* Path.Path
  const configPath = path.join(yield* getOutDir, "_config.yml")
  if (yield* fs.exists(configPath)) {
    const content = yield* fs.readFileString(configPath)
    return new Domain.File(
      configPath,
      content.replace(/^remote_theme:.*$/m, `remote_theme: ${config.theme}`).replace(
        /^search_enabled:.*$/m,
        `search_enabled: ${config.enableSearch}`
      ).replace(
        /^ {2}'\S* on GitHub':\n {4}- '.*'/m,
        `  '${config.projectName} on GitHub':\n    - '${config.projectHomepage}'`
      ),
      true
    )
  }
  return new Domain.File(
    configPath,
    String.stripMargin(
      `|remote_theme: ${config.theme}
     |
     |# Enable or disable the site search
     |search_enabled: ${config.enableSearch}
     |
     |# Aux links for the upper right navigation
     |aux_links:
     |'${navigationHeader(config)}':
     |  - '${config.projectHomepage}'`
    )
  )
})

const moduleFile = (module: Domain.Module, index: number) =>
  Effect.gen(function*() {
    const path = yield* Path.Path
    const outputPath = path.normalize(path.join(
      yield* getOutDir,
      "modules",
      `${module.path.slice(1).join(path.sep)}.md`
    ))
    const moduleContent = yield* Printer.printModule(module)
    const toc = markdownToc(moduleContent, { bullets: "-" }).content
    const content = `${Printer.printFrontMatter(module, index + 1)}\n\n${moduleContent}`.replace(
      "<!-- toc -->",
      `---
## Exports Grouped by Category
${toc}
---`
    )
    return new Domain.File(outputPath, yield* Printer.prettify(content), true)
  })

/**
 * Projects semantic documentation into Markdown files.
 *
 * @category projections
 * @since 0.6.0
 */
export const project = (model: SemanticModel.SemanticModel, packageName?: string) =>
  Effect.gen(function*() {
    const modules = packageName === undefined
      ? model.modules
      : model.packages.find((pkg) => pkg.name === packageName)?.modules ?? []
    const moduleFiles = yield* Effect.forEach(modules, moduleFile)
    return [yield* homepage, yield* index, yield* configYml, ...moduleFiles]
  })

const writeFile = (file: Domain.File) =>
  Effect.gen(function*() {
    const fs = yield* FileSystem.FileSystem
    const path = yield* Path.Path
    if (!(yield* fs.exists(file.path)) || file.isOverwriteable) {
      yield* fs.makeDirectory(path.dirname(file.path), { recursive: true })
      yield* fs.writeFileString(file.path, file.content)
    }
  })

/**
 * Writes projected Markdown, refreshing stale generated module documents.
 *
 * @category projections
 * @since 0.6.0
 */
export const write = (model: SemanticModel.SemanticModel, packageName?: string) =>
  Effect.gen(function*() {
    const config = yield* Configuration.Configuration
    const fs = yield* FileSystem.FileSystem
    const path = yield* Path.Path
    const files = yield* project(model, packageName)
    const stale = yield* Effect.tryPromise(() =>
      Glob.glob(path.normalize(path.join(config.outDir, "**/*.{ts,tsx,mts,cts,js,jsx,mjs,cjs}.md")))
    ).pipe(Effect.orDie)
    yield* Effect.forEach(stale, (file) => fs.remove(file), { discard: true })
    yield* Effect.forEach(files, writeFile, { discard: true })
  })
