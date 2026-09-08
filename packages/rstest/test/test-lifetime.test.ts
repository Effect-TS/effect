import { expect, it } from "@effect/rstest"
import { runFixture } from "./fixtures/run-fixture.ts"

it("test cleanup settles before later tests and suite release without changing outcomes", async () => {
  const { status, stdout, stderr, report } = await runFixture("test-lifetime", 50)
  expect(status, `${stdout}\n${stderr}`).toBe(1)
  expect(report.summary).toEqual({
    failedTests: 3,
    passedTests: 20,
    skippedTests: 2,
    tests: 25
  })
  expect(report.unhandledErrors).toEqual([])
  expect(report.files).toHaveLength(1)
  expect(report.files.flatMap((file) => file.errors)).toEqual([])
  const failures = report.tests.filter((test) => test.status === "fail")
  expect(failures.map((test) => test.name)).toEqual([
    "timeout",
    "failure",
    "unexpected-success"
  ])
  expect(failures.flatMap((test) => test.errors ?? []).map((error) => error.message)).toEqual([
    "test timed out in 30ms (no expect assertions completed)",
    "intentional-test-failure",
    "Expect test to fail"
  ])
  for (const name of ["expected-timeout", "expected-failure", "success"]) {
    expect(report.tests.find((test) => test.name === name)?.status).toBe("pass")
  }
  for (const name of ["skipped", "runtime-skip"]) {
    expect(report.tests.find((test) => test.name === name)?.status).toBe("skip")
  }
}, 30_000)
