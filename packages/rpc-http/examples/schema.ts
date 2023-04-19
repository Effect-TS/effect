import * as RS from "@effect/rpc/Schema"
import * as S from "@effect/schema/Schema"

export const schema = RS.make({
  greet: {
    input: S.string,
    output: S.string,
  },
})
