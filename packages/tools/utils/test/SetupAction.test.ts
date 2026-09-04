import { assert, describe, it } from "@effect/vitest"
import * as fs from "node:fs"
import * as path from "node:path"

const setupAction = fs.readFileSync(
  path.join(import.meta.dirname, "../../../../.github/actions/setup/action.yaml"),
  "utf8"
)

describe("setup action", () => {
  it("disables npm audit while installing pnpm", () => {
    const installPnpmStep = setupAction
      .split("\n    - name: ")
      .find((step) => step.startsWith("Install pnpm\n"))

    assert.ok(installPnpmStep, "Install pnpm step is missing")
    const environment = installPnpmStep
      .split("\n      env:\n")[1]
      ?.split(/\n      \S/)[0]

    assert.ok(environment, "Install pnpm environment is missing")
    assert.match(environment, /^ {8}npm_config_audit: (["'])false\1$/m)
  })
})
