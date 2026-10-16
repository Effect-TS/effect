import { assert, describe, it } from "@effect/vitest"
import { execFileSync } from "node:child_process"
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync
} from "node:fs"
import { delimiter, dirname, join, sep } from "node:path"
import { fileURLToPath } from "node:url"

const packageRoot = fileURLToPath(new URL("..", import.meta.url))
const manifest = JSON.parse(readFileSync(join(packageRoot, "package.json"), "utf8"))
// bun --bun prepends a node symlink to Bun; skip that shim to find real Node.
const node = (process.env.PATH ?? "").split(delimiter)
  .map((directory) => join(directory, process.platform === "win32" ? "node.exe" : "node"))
  .find((file) => existsSync(file) && (!process.versions.bun || realpathSync(file) !== realpathSync(process.execPath)))
assert.isDefined(node, "Node must be installed to test its package export error contract")
const internalModules = readdirSync(join(packageRoot, "src"), { recursive: true, encoding: "utf8" })
  .filter((file) => file.endsWith(".ts") && file.split(sep).includes("internal"))
  .map((file) => file.slice(0, -3).split(sep).join("/"))
  .sort()

for (
  const [name, exports, directory, extension] of [
    ["development", manifest.exports, "src", "ts"],
    ["published", manifest.publishConfig.exports, "dist", "js"]
  ] as const
) {
  const withPackage = (modules: ReadonlyArray<string>, specifiers: ReadonlyArray<string>) => {
    const root = mkdtempSync(join(packageRoot, ".package-exports-test-"))
    try {
      writeFileSync(join(root, "package.json"), JSON.stringify({ name: "effect", type: "module", exports }))
      for (const module of modules) {
        const file = join(root, directory, `${module}.${extension}`)
        mkdirSync(dirname(file), { recursive: true })
        writeFileSync(file, "")
      }
      // Explicitly invoke Node: node:module uses the host resolver under Bun/Deno.
      // Stay outside Vite/tsconfig aliases, without requiring a build.
      const output = execFileSync(node!, [
        "--input-type=commonjs",
        "--eval",
        `
          const specifiers = ${JSON.stringify(specifiers)};
          console.log(JSON.stringify(specifiers.map((specifier) => {
            try {
              return { specifier, path: require.resolve(specifier) };
            } catch (error) {
              return { specifier, code: error.code };
            }
          })));
        `
      ], { cwd: root, encoding: "utf8" })
      return JSON.parse(output) as Array<{ specifier: string; path?: string; code?: string }>
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  }

  describe(`${name} package exports`, () => {
    it("resolves public entry points and modules", () => {
      const results = withPackage(
        ["index", "Effect", "http/index", "http/HttpServerResponse"],
        ["effect", "effect/Effect", "effect/http", "effect/http/HttpServerResponse"]
      )
      for (const result of results) {
        assert.isString(result.path, result.specifier)
      }
    })

    it("does not export any module under an internal directory", () => {
      assert.isAbove(internalModules.length, 0)
      const results = withPackage(internalModules, internalModules.map((module) => `effect/${module}`))
      for (const result of results) {
        // A missing fixture is not evidence that an export is blocked.
        assert.strictEqual(result.code, "ERR_PACKAGE_PATH_NOT_EXPORTED", result.specifier)
      }
    })
  })
}
