import { assert, describe, it } from "@effect/vitest"
import { analyze, format } from "@effect/workspace"
import * as Effect from "effect/Effect"
import { fileURLToPath } from "node:url"

const fixture = fileURLToPath(new URL("./fixtures/legacy-expansion", import.meta.url))

describe("Package Surface formatting", () => {
  it.effect("renders origin, mode, format, target, and provenance", () =>
    Effect.gen(function*() {
      const output = format(yield* analyze({ cwd: fixture }))

      assert.ok(output.includes("legacy-package@1.0.0 (packages/legacy)"))
      assert.ok(output.includes("  legacy-package [main]"))
      assert.ok(output.includes("    Any Module JavaScript"))
      assert.ok(output.includes("      target packages/legacy/dist/main.js"))
      assert.ok(output.includes("      ambiguous source packages/legacy/src/main.ts"))
    }))
})
