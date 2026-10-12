// Not a test file. Proves that a missing fixture is a COMPILE error: each line below is an
// unsatisfied tree, and `tsc` fails if any `@ts-expect-error` is unused.
import { Effect, type Layer } from "effect"
import * as Test from "../src/Test.ts"
import { Database, Schema_ } from "./shared.ts"
import { type UserRepo, userRepoContract } from "./userRepoContract.ts"

// the contract's implementation needs a Database and nobody provided one
declare const repoOverDatabase: Layer.Layer<UserRepo, never, Database>
// @ts-expect-error
const unprovided: Test.Runnable = Test.suite("UserRepo", [userRepoContract(repoOverDatabase)])

// Schema_ is provided, but its own requirement (Database) is not
// @ts-expect-error
const halfProvided: Test.Runnable = Test.suite("db", [
  Test.test("reads schema", Effect.gen(function*() {
    yield* Schema_
  }))
]).pipe(Test.provide(Schema_.layer))

// a shared layer in the test config must be self-contained: Schema_ needs Database
const sharedWithRequirement = Test.config({
  // @ts-expect-error
  // @effect-diagnostics-next-line missingLayerContext:off
  shared: [Schema_.layer]
})

// fully provided: compiles
const ok: Test.Runnable = Test.suite("db", [
  Test.test("reads schema", Effect.gen(function*() {
    yield* Schema_
  }))
]).pipe(
  Test.provide(Schema_.layer),
  Test.provide(Database.layer)
)

export { halfProvided, ok, sharedWithRequirement, unprovided }
