// A reusable contract suite: written once against the UserRepo *interface*, run against
// several implementations (see contract.test.ts). It is a plain function of the
// implementation's Layer and provides it to each test, so every test gets a fresh repo.
import * as Context from "effect/Context"
import * as Data from "effect/Data"
import * as Effect from "effect/Effect"
import type * as Layer from "effect/Layer"
import type * as Option from "effect/Option"
import * as Assert from "../src/Assert.ts"
import * as Test from "../src/Test.ts"

export interface User {
  readonly id: number
  readonly email: string
}
export class DuplicateEmail extends Data.TaggedError("DuplicateEmail")<{ readonly email: string }> {}

export class UserRepo extends Context.Service<UserRepo, {
  readonly create: (email: string) => Effect.Effect<User, DuplicateEmail>
  readonly findByEmail: (email: string) => Effect.Effect<Option.Option<User>>
}>()("UserRepo") {}

export const userRepoContract = <E, R>(implementation: Layer.Layer<UserRepo, E, R>) =>
  Test.suite(
    "UserRepo contract",
    [
      Test.test(
        "create then find by email",
        Effect.gen(function*() {
          const repo = yield* UserRepo
          const created = yield* repo.create("ada@example.com")
          const found = yield* repo.findByEmail("ada@example.com")
          Assert.equal(Assert.some(found), created)
        })
      ),
      Test.test(
        "unknown email is None",
        Effect.gen(function*() {
          const repo = yield* UserRepo
          Assert.none(yield* repo.findByEmail("nobody@example.com"))
        })
      ),
      Test.test(
        "emails are unique",
        Effect.gen(function*() {
          const repo = yield* UserRepo
          yield* repo.create("grace@example.com")
          const second = yield* Effect.exit(repo.create("grace@example.com"))
          Assert.equal(Assert.failure(second), new DuplicateEmail({ email: "grace@example.com" }))
        })
      )
    ].map(Test.provide(implementation))
  )
