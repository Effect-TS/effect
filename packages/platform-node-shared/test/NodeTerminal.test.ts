import { assert, describe, it } from "@effect/vitest"
import { spawnSync } from "node:child_process"
import { join } from "node:path"

const fixture = join(__dirname, "fixtures", "node-terminal.ts")

const runFixture = (mode: string, input: string) =>
  spawnSync(process.execPath, [fixture, mode], {
    encoding: "utf8",
    input,
    timeout: 2_000
  })

const assertResult = (mode: string, input: string, expected: string) => {
  const result = runFixture(mode, input)
  assert.isUndefined(result.error)
  assert.strictEqual(result.status, 0, result.stderr)
  assert.isTrue(result.stderr.includes(`RESULT ${expected}`), result.stderr)
}

describe("NodeTerminal", () => {
  it("fails a prompt with QuitError after piped input is exhausted", () => {
    assertResult("prompts", "y\n", "{\"first\":true,\"second\":\"QuitError\"}")
  })

  it("delivers buffered keypresses before ending the input queue", () => {
    assertResult("read-input", "yn", "{\"first\":\"y\",\"second\":\"n\",\"ended\":true}")
  })

  it("flushes an unterminated line before failing readLine with QuitError at EOF", () => {
    assertResult("read-line", "last line", "{\"first\":\"last line\",\"second\":\"QuitError\"}")
  })
})
