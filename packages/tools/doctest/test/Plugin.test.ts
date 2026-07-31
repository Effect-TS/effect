import * as Doctest from "@effect/doctest/Plugin"
import * as Protocol from "@effect/doctest/Protocol"
import { assert, describe, it } from "@effect/vitest"
import { mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

describe("Plugin", () => {
  it("configures the doctest runner by default", () => {
    const config = Doctest.plugin().config
    if (typeof config !== "function") return assert.fail("expected config hook")

    assert.deepStrictEqual(config.call({} as never, {}, {} as never), {
      test: { runner: "@effect/doctest/Runner" }
    })
  })

  it("preserves a configured runner", () => {
    const config = Doctest.plugin().config
    if (typeof config !== "function") return assert.fail("expected config hook")

    assert.isUndefined(config.call({} as never, { test: { runner: "./custom-runner.ts" } }, {} as never))
  })

  it("generates console output assertions only for marked examples", async () => {
    const root = mkdtempSync(join(tmpdir(), "effect-doctest-plugin-"))
    const file = join(root, "example.ts")
    writeFileSync(
      file,
      [
        "/**",
        " * ```ts import.meta.vitest name=asserted",
        " * console.log(1)",
        " * // > 1",
        " * ```",
        " * ```ts import.meta.vitest name=unasserted",
        " * console.log(2)",
        " * ```",
        " */"
      ].join("\n")
    )

    try {
      const plugin = Doctest.plugin()
      const resolveId = plugin.resolveId
      const load = plugin.load
      if (typeof resolveId !== "function" || typeof load !== "function") {
        return assert.fail("expected function plugin hooks")
      }
      const context = { addWatchFile() {} } as never
      const id = Protocol.collectorId(file, "test")
      const resolved = await resolveId.call(context, id, undefined, {} as never)
      if (typeof resolved !== "string") return assert.fail("expected resolved collector ID")
      const source = await load.call(context, resolved, {} as never)
      if (typeof source !== "string") return assert.fail("expected collector source")

      assert.match(source, /import \{ test \} from "@effect\/doctest\/Runtime"/)
      assert.match(source, /test\("asserted", \(\) => import\([^)]*\), "1"\)/)
      assert.match(source, /test\("unasserted", \(\) => import\([^)]*\), undefined\)/)
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })
})
