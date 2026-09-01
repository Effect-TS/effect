import { assert, describe, it } from "@effect/vitest"
import { CliOutput } from "effect/unstable/cli"

const formatVersionWithNoColor = (noColor: string | undefined): string => {
  const processDescriptor = Object.getOwnPropertyDescriptor(globalThis, "process")
  Object.defineProperty(globalThis, "process", {
    configurable: true,
    value: {
      env: noColor === undefined ? {} : { NO_COLOR: noColor },
      stdout: { isTTY: true }
    }
  })

  try {
    return CliOutput.defaultFormatter().formatVersion("app", "1.0.0")
  } finally {
    if (processDescriptor === undefined) {
      Reflect.deleteProperty(globalThis, "process")
    } else {
      Object.defineProperty(globalThis, "process", processDescriptor)
    }
  }
}

describe("CliOutput", () => {
  it("disables color when NO_COLOR has any non-empty value", () => {
    for (const noColor of ["1", "true", "yes", "0"]) {
      assert.strictEqual(formatVersionWithNoColor(noColor), "app v1.0.0")
    }
  })

  it("keeps color enabled when NO_COLOR is missing or empty", () => {
    const expected = "\x1b[1mapp\x1b[0m \x1b[2mv\x1b[0m\x1b[1m1.0.0\x1b[0m"

    assert.strictEqual(formatVersionWithNoColor(undefined), expected)
    assert.strictEqual(formatVersionWithNoColor(""), expected)
  })
})
