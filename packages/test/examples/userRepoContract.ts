// A reusable contract suite: written once against the UserRepo *interface*, run against
// several implementations (see contract.test.ts). It is a plain function of the
// implementation's Layer and provides it to each test, so every test gets a fresh repo.
import { Context, Data, Effect, type Layer, Option } from "effect"
import { assertEquals, assertTrue } from "../src/Assert.ts"
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
  Test.suite("UserRepo contract", [
    Test.test("create then find by email", Effect.gen(function*() {
      const repo = yield* UserRepo
      const created = yield* repo.create("ada@example.com")
      const found = yield* repo.findByEmail("ada@example.com")
      assertEquals(found, Option.some(created))
    })),
    Test.test("unknown email is None", Effect.gen(function*() {
      const repo = yield* UserRepo
      assertTrue(Option.isNone(yield* repo.findByEmail("nobody@example.com")))
    })),
    Test.test("emails are unique", Effect.gen(function*() {
      const repo = yield* UserRepo
      yield* repo.create("grace@example.com")
      const second = yield* repo.create("grace@example.com").pipe(
        Effect.map((user) => `created user #${user.id}`),
        Effect.catchTag("DuplicateEmail", (e) => Effect.succeed(`DuplicateEmail(${e.email})`))
      )
      assertEquals(second, "DuplicateEmail(grace@example.com)")
    }))
  ].map(Test.provide(implementation)))
