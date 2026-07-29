import * as Examples from "@effect/docgen/Examples"
import * as SourceExamples from "@effect/docgen/SourceExamples"
import { globSync } from "glob"
import { existsSync, readFileSync } from "node:fs"
import { dirname, relative } from "node:path"
import { fileURLToPath } from "node:url"
import type { Plugin } from "vite"
import { defineConfig } from "vitest/config"

const exampleFence = /\/\*\*[\s\S]*?(?:```|~~~)\s*(?:ts|typescript)/i
const runner = fileURLToPath(new URL("./packages/tools/docgen/src/ExampleRunner.ts", import.meta.url))
const patternIndex = process.argv.findIndex((argument) => argument === "-t" || argument === "--testNamePattern")
const inlinePattern = process.argv.find((argument) => argument.startsWith("--testNamePattern="))?.slice(18)
const testNamePattern = inlinePattern ?? (patternIndex === -1 ? undefined : process.argv[patternIndex + 1])
const testNameRegex = testNamePattern === undefined ? undefined : new RegExp(testNamePattern)
const matchesTestName = (name: string): boolean => {
  if (testNameRegex === undefined) return true
  testNameRegex.lastIndex = 0
  return testNameRegex.test(name)
}
const packages = globSync(["packages/*/package.json", "packages/*/*/package.json"], {
  absolute: true,
  cwd: import.meta.dirname
}).map((manifest) => {
  const root = dirname(manifest)
  const metadata = JSON.parse(readFileSync(manifest, "utf8"))
  const files = existsSync(`${root}/src`)
    ? globSync("src/**/*.ts", { absolute: true, cwd: root }).filter((file) =>
      exampleFence.test(readFileSync(file, "utf8"))
    )
    : []
  return { files, name: metadata.name as string, root }
}).filter((pkg) => pkg.files.length > 0)

const projects = packages.flatMap((pkg) => {
  const options = (file: string) => ({
    file,
    packageName: pkg.name,
    packageRoot: pkg.root,
    workspaceRoot: import.meta.dirname
  })
  const examples = pkg.files.flatMap((file) =>
    SourceExamples.extract({
      ...options(file),
      source: readFileSync(file, "utf8")
    })
  )
  const files = testNameRegex === undefined
    ? pkg.files
    : pkg.files.filter((file) =>
      examples.some((example) => example.declarationPathname === file && matchesTestName(example.name))
    )
  if (files.length === 0) return []
  const selectedExamples = examples.filter((example) => matchesTestName(example.name))
  return {
    plugins: [Examples.vitestPlugin(selectedExamples, (file) =>
      SourceExamples.extractFile({
        ...options(file)
      }).then((examples) => examples.filter((example) => matchesTestName(example.name)))) as unknown as Plugin],
    test: {
      name: pkg.name,
      root: pkg.root,
      include: files.map((file) => relative(pkg.root, file)),
      exclude: [],
      passWithNoTests: true,
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
  }
})
const configuredProjects = projects.length === 0 ?
  [{
    test: {
      name: "examples",
      root: import.meta.dirname,
      include: [],
      passWithNoTests: true
    }
  }] :
  projects

export default defineConfig({
  root: import.meta.dirname,
  test: {
    coverage: { enabled: false },
    fileParallelism: false,
    maxWorkers: 1,
    passWithNoTests: true,
    projects: configuredProjects
  }
})
