// Property tests: a body that must pass for every generated value. Values come from a Schema or an
// Arbitrary (effect/Arbitrary), drawn from the test's seeded Random, so `--seed` reproduces a run;
// a failure is shrunk to a smallest failing value and reported with it.
import * as Schema from "effect/Schema"
import * as Assert from "../src/Assert.ts"
import * as Test from "../src/Test.ts"

const User = Schema.Struct({ name: Schema.String, age: Schema.Int })
const UserJson = Schema.fromJsonString(User)

export default Test.suite("properties", [
  Test.property("a user survives a JSON round trip", User, (user) => {
    Assert.equal(Schema.decodeSync(UserJson)(Schema.encodeSync(UserJson)(user)), user)
  }),
  Test.property("addition commutes", [Schema.Int, Schema.Int], ([a, b]) => {
    Assert.equal(a + b, b + a)
  }, { runs: 200 }),
  Test.property("every name is short (intentional failure)", User, (user) => {
    Assert.isTrue(user.name.length < 3, "name length")
  })
])
