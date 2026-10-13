import * as Assert from "../src/Assert.ts"
import { scriptCommand } from "../src/cli/invocation.ts"
import * as Test from "../src/Test.ts"

const pkg = "/repo/packages/test"

export default Test.suite("invocation: the command a rerun hint starts with", [
  Test.test("not started through a package script", () => {
    Assert.equal(scriptCommand({}, pkg), undefined)
  }),
  Test.test("pnpm, from the package", () => {
    Assert.equal(
      scriptCommand(
        { npm_lifecycle_event: "test", npm_config_user_agent: "pnpm/10.0.0 npm/? node/v26", INIT_CWD: pkg },
        pkg
      ),
      "pnpm run test"
    )
  }),
  Test.test("pnpm --dir, from the repository root", () => {
    Assert.equal(
      scriptCommand({ npm_lifecycle_event: "demo:bun", npm_config_user_agent: "pnpm/10.0.0", INIT_CWD: "/repo" }, pkg),
      "pnpm --dir packages/test run demo:bun"
    )
  }),
  Test.test("npm passes arguments after --", () => {
    Assert.equal(
      scriptCommand({ npm_lifecycle_event: "test", npm_config_user_agent: "npm/11.0.0", INIT_CWD: "/repo" }, pkg),
      "npm --prefix packages/test run test --"
    )
  }),
  Test.test("other package managers: the direct command", () => {
    Assert.equal(scriptCommand({ npm_lifecycle_event: "test", npm_config_user_agent: "yarn/4.0.0" }, pkg), undefined)
  }),
  Test.test("unusual paths are quoted", () => {
    Assert.equal(
      scriptCommand(
        { npm_lifecycle_event: "test", npm_config_user_agent: "pnpm/10", INIT_CWD: "/my repo" },
        "/my repo/a b"
      ),
      "pnpm --dir \"a b\" run test"
    )
  })
])
