import { pipe } from "@effect/data/Function"
import * as S from "@effect/schema/Schema"
import * as TA from "@effect/schema/test/Arbitrary"

describe.concurrent("dev", () => {
  it.skip("dev", async () => {
    const schema = pipe(S.number, S.between(1, 10), S.int()) // hangs indefinitely
    // const schema = pipe(S.number, S.int(), S.between(1, 10)) // hangs indefinitely
    TA.propertyTo(schema)
  })
})
