import * as _ from "@effect/rpc-webworkers/Schema"
import { typeEquals } from "@effect/rpc-webworkers/test/utils"
import * as S from "@effect/schema/Schema"
import { describe, it } from "vitest"

describe("Schema", () => {
  it("allow WebWorkerType", () => {
    const schema = _.make({
      currentTime: {
        output: S.DateFromSelf
      },

      binary: {
        output: S.instanceOf(Uint8Array)
      }
    })

    typeEquals(schema.currentTime)<{ output: S.Schema<Date> }>() satisfies true
    typeEquals(schema.binary)<{ output: S.Schema<Uint8Array> }>() satisfies true
  })

  it("transferable", () => {
    const schema = _.make({
      binary: {
        output: _.transferable(
          S.struct({
            data: S.instanceOf(Uint8Array)
          }),
          (_) => [_.data.buffer]
        )
      }
    })

    const data = new Uint8Array([1, 2, 3])
    expect(_.getTransferables(schema.binary.output, { data })).toEqual([
      data.buffer
    ])
  })
})
