import * as Schema from "@effect/rpc-webworkers/Schema"
import * as S from "@effect/schema/Schema"

const uint8Array = Schema.transferable(S.instanceOf(Uint8Array), (_) => [
  _.buffer,
])

export const schema = Schema.make({
  getBinary: {
    input: uint8Array,
    output: uint8Array,
  },
})
