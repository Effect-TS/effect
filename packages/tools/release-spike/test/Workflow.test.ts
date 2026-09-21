import { assert, it } from "@effect/vitest"
import { readFile } from "node:fs/promises"

it("does not expose the redundant OIDC list probe", async () => {
  const workflow = await readFile(new URL("../../../../.github/workflows/release-spike.yml", import.meta.url), "utf8")
  assert.notInclude(workflow, "probe-list")
  assert.notInclude(workflow, "Probe stage list with the OIDC-only environment")
})
