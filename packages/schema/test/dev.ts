import { pipe } from "@effect/data/Function"
import * as S from "@effect/schema/Schema"

describe.concurrent("dev", () => {
  it.skip("dev", async () => {
    const schema = pipe(
      S.string,
      S.nonEmpty(),
      S.message(() => "bla")
    )
    console.log(S.parse(schema)(""))
  })
})
