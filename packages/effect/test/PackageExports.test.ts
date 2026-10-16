import { assert, describe, it } from "@effect/vitest"
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { createRequire } from "node:module"
import { dirname, join, sep } from "node:path"
import { fileURLToPath } from "node:url"

const packageRoot = fileURLToPath(new URL("..", import.meta.url))
const manifest = JSON.parse(readFileSync(join(packageRoot, "package.json"), "utf8"))
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
  // Use Node directly, outside Vite/tsconfig aliases, without requiring a build.
  const withPackage = (modules: ReadonlyArray<string>, f: (resolve: (specifier: string) => string) => void) => {
    const root = mkdtempSync(join(packageRoot, ".package-exports-test-"))
    try {
      writeFileSync(join(root, "package.json"), JSON.stringify({ name: "effect", type: "module", exports }))
      for (const module of modules) {
        const file = join(root, directory, `${module}.${extension}`)
        mkdirSync(dirname(file), { recursive: true })
        writeFileSync(file, "")
      }
      const require = createRequire(join(root, "probe.cjs"))
      f((specifier) => require.resolve(specifier))
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  }

  describe(`${name} package exports`, () => {
    it("resolves public entry points and modules", () => {
      withPackage(["index", "Effect", "http/index", "http/HttpServerResponse"], (resolve) => {
        for (const specifier of ["effect", "effect/Effect", "effect/http", "effect/http/HttpServerResponse"]) {
          assert.isString(resolve(specifier), specifier)
        }
      })
    })

    it("does not export any module under an internal directory", () => {
      assert.isAbove(internalModules.length, 0)
      withPackage(internalModules, (resolve) => {
        const exposed = internalModules.filter((module) => {
          try {
            resolve(`effect/${module}`)
            return true
          } catch (error) {
            // A missing fixture is not evidence that an export is blocked.
            assert.propertyVal(error, "code", "ERR_PACKAGE_PATH_NOT_EXPORTED")
            return false
          }
        })
        assert.deepStrictEqual(exposed, [])
      })
    })
  })
}
