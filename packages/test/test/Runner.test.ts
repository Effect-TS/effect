// The runner's assertion rules, checked by running a fixture file through the executor.
import * as Effect from "effect/Effect"
import * as Stream from "effect/Stream"
import * as path from "node:path"
import * as Assert from "../src/Assert.ts"
import * as Executor from "../src/Executor.ts"
import * as Matcher from "../src/Matcher.ts"
import type { TestFinished } from "../src/Protocol.ts"
import * as Test from "../src/Test.ts"

const fixture = path.join(import.meta.dirname, "fixtures/runner.ts")

/** Runs every test of the fixture, and returns their results by test name. */
const results = Effect.gen(function*() {
  const { nodes } = yield* Executor.listFile(fixture)
  const tests = nodes.filter((n) => n.kind === "test").map((n) => ({
    id: n.id,
    seed: 1,
    timeoutMs: 5_000,
    retries: 0,
    ...(n.noAssertions ? { noAssertions: true } : {})
  }))
  const events = yield* Stream.runCollect(Executor.runFile(fixture, { concurrency: 4 }, tests))
  const finished = new Map<string, TestFinished>()
  for (const e of events) if (e._tag === "TestFinished") finished.set(e.id.split(" > ").at(-1)!, e)
  return finished
}).pipe(Effect.provide(Executor.ExecutorState.layer))

const check = (name: string, f: (result: TestFinished) => void) =>
  Test.test(name, Effect.map(results, (all) => f(Assert.defined(all.get(name), name))))

export default Test.suite("Runner", [
  check("passes", (r) => {
    Assert.equal(r.status, "passed")
    Assert.equal(r.assertions, 2)
  }),
  check("caught", (r) => {
    Assert.equal(r.status, "failed")
    const failure = Assert.single(r.failures)
    Assert.equal(failure, Matcher.partial({ kind: "assertion", message: "expected 2, got 1" }))
    Assert.match(Assert.defined(failure.note), /was caught/)
  }),
  check("unjoined", (r) => {
    Assert.equal(
      Assert.single(r.failures),
      Matcher.partial({ kind: "assertion", message: "expected \"parent\", got \"child\"" })
    )
  }),
  check("never run", (r) => {
    Assert.equal(
      Assert.single(r.failures),
      Matcher.partial({
        kind: "discardedEffect",
        message: "Assert.eventually was built but never run: did you forget `yield*` (or `await`)?",
        location: { file: "test/fixtures/runner.ts" }
      })
    )
  }),
  check("never awaited", (r) => {
    Assert.includes(r.failures, Matcher.partial({ kind: "discardedEffect", message: Matcher.match(/^Assert.rejects/) }))
  }),
  check("nothing", (r) => {
    Assert.equal(Assert.single(r.failures).kind, "noAssertions")
  }),
  check("nothing, on purpose", (r) => {
    Assert.equal(r.status, "passed")
  }),
  check("soft", (r) => {
    Assert.equal(r.failures.map((f) => [f.message, f.label]), [["expected 2, got 1", "batch"], [
      "expected 4, got 3",
      "batch"
    ]])
  }),
  check("helper", (r) => {
    const failure = Assert.single(r.failures)
    Assert.equal(Assert.defined(failure.location).file, "test/fixtures/runner.ts")
    Assert.equal(Assert.defined(failure.origin).file, "test/fixtures/helper.ts")
  }),
  check("async a", (r) => {
    Assert.equal(r.status, "passed")
    Assert.equal(r.assertions, 3)
  }),
  check("property", (r) => {
    // one failure: the shrunk counterexample, at the assertion inside the property
    const failure = Assert.single(r.failures)
    Assert.equal(
      failure,
      Matcher.partial({ kind: "assertion", message: "property falsified: expected true, got false", label: "small" })
    )
    Assert.equal(Assert.defined(failure.counterexample).input, "10")
    Assert.equal(Assert.defined(failure.location), Matcher.partial({ file: "test/fixtures/runner.ts" }))
  }),
  check("async b", (r) => {
    Assert.equal(r.assertions, 1)
  })
])
