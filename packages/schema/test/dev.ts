import * as A from "@effect/schema/Arbitrary"
import * as S from "@effect/schema/Schema"
import * as fc from "fast-check"

describe.concurrent("dev", () => {
  it.skip("lazy/ record", () => {
    type A = {
      [_: string]: A
    }
    const schema: S.Schema<A> = S.lazy(() => S.record(S.string, schema))
    const arb = A.to(schema)(fc)
    console.log(JSON.stringify(fc.sample(arb, 10), null, 2))
  })
})
