// Contract tests over layers: the same contract, run against two implementations.
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as Test from "../src/Test.ts"
import { DuplicateEmail, type User, UserRepo, userRepoContract } from "./userRepoContract.ts"

const InMemoryUserRepo = Layer.sync(UserRepo)(() => {
  const users = new Map<string, User>()
  return {
    create: (email) =>
      users.has(email)
        ? Effect.fail(new DuplicateEmail({ email }))
        : Effect.sync(() => {
          const user = { id: users.size + 1, email }
          users.set(email, user)
          return user
        }),
    findByEmail: (email) => Effect.sync(() => Option.fromNullishOr(users.get(email)))
  }
})

/** A fake connection pool, shared by every test in the file. */
class PgPool extends Context.Service<PgPool, { readonly query: (sql: string) => Effect.Effect<void> }>()("PgPool") {
  static layer = Layer.sync(PgPool)(() => ({ query: () => Effect.void }))
}

/** "Postgres" without a unique index on email: it violates the contract. */
const FakePostgresUserRepo = Layer.effect(UserRepo)(Effect.gen(function*() {
  const pool = yield* PgPool
  const rows: Array<User> = []
  return {
    create: (email) =>
      pool.query("insert into users ...").pipe(Effect.as({ id: rows.push({ id: rows.length + 1, email }), email })),
    findByEmail: (email) =>
      pool.query("select ...").pipe(Effect.as(Option.fromNullishOr(rows.find((u) => u.email === email))))
  }
}))

export default Test.suite("UserRepo", [
  // Suite<never>
  Test.suite("in-memory", [userRepoContract(InMemoryUserRepo)]),
  // Suite<PgPool> -> Suite<never>: a fresh repo per test, one pool for the suite
  Test.suite("fake postgres (intentional failure: no unique index)", [userRepoContract(FakePostgresUserRepo)]).pipe(
    Test.provide(PgPool.layer)
  )
])
