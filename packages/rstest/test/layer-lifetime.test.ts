import { expect, it } from "@effect/rstest"
import { runFixture } from "./fixtures/run-fixture.ts"

it("layer setup stops on hook timeout and releases resources on early failure", async () => {
  const { status, stdout, stderr, report } = await runFixture("layer-lifetime", 100)
  // Hook failures must remain runner failures, not swallowed rejections.
  expect(status, `${stdout}\n${stderr}`).toBe(1)
  expect(report.summary).toEqual({
    failedTests: 0,
    passedTests: 6,
    skippedTests: 6,
    tests: 12
  })
  expect(report.unhandledErrors).toEqual([])
  expect(report.files).toHaveLength(1)
  expect(report.files.flatMap((file) => file.errors).map((error) => error.message)).toEqual([
    "beforeAll hook timed out in 100ms",
    "beforeAll hook timed out in 100ms",
    "early-setup-failure",
    "beforeAll hook timed out in 100ms",
    "beforeAll hook timed out in 100ms",
    "early-setup-failure"
  ])
}, 30_000)
