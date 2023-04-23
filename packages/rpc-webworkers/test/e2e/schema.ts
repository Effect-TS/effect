import * as Schema from "@effect/rpc-webworkers/Schema"
import * as S from "@effect/schema/Schema"

export const schema = Schema.make({
  currentDate: {
    output: S.DateFromSelf,
  },
  getBinary: {
    input: Schema.transferable(S.instanceOf(Uint8Array), (_) => [_.buffer]),
    output: Schema.transferable(S.instanceOf(Uint8Array), (_) => [_.buffer]),
  },
  crash: {
    output: S.string,
  },
})
