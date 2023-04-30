import * as Schema from "@effect/rpc-webworkers/Schema"
import * as S from "@effect/schema/Schema"
import { Tag } from "@effect/data/Context"
// @ts-ignore
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import * as Layer from "@effect/io/Layer"

export const schema = Schema.make({
  currentDate: {
    output: S.DateFromSelf,
  },
  getBinary: {
    input: Schema.transferable(S.instanceOf(Uint8Array), (_) => [_.buffer]),
    output: Schema.transferable(S.instanceOf(Uint8Array), (_) => [_.buffer]),
  },
  delayed: {
    input: S.string,
    output: S.string,
  },
  crash: {
    output: S.string,
  },
})

export interface Name {
  readonly name: string
}

export const Name = Tag<Name>()

export const schemaWithSetup = Schema.make({
  __setup: {
    input: Schema.transferable(S.instanceOf(MessagePort), (_) => [_]),
    output: Schema.context<Name>(),
  },

  getName: {
    output: S.string,
  },
})
