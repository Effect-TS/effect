import * as FP_APP from "fp-ts/Apply"
import * as FP_A from "fp-ts/Array"

import * as A from "../src/Collections/Immutable/Array/index.js"

describe("Apply", () => {
  it("monadic apply should match fp-ts", () => {
    const fp_ts = FP_APP.sequenceT(FP_A.Applicative)([1, 2, 3], [4, 5, 6], [7, 8, 9])
    const fp_ts_s = FP_APP.sequenceS(FP_A.Applicative)({
      a: [1, 2, 3],
      b: [4, 5, 6],
      c: [7, 8, 9]
    })
    const effect_ts = A.tuple([1, 2, 3], [4, 5, 6], [7, 8, 9])
    const effect_ts_s = A.struct({ a: [1, 2, 3], b: [4, 5, 6], c: [7, 8, 9] })

    expect(fp_ts).toEqual(effect_ts)
    expect(fp_ts_s).toEqual(effect_ts_s)
  })
  it("zip apply should match fp-ts", () => {
    const ApplyZip: FP_APP.Apply1<FP_A.URI> = {
      ...FP_A.array,
      ap: (fab, fa) => FP_A.zipWith(fab, fa, (ab, a) => ab(a))
    }
    const fp_ts = FP_APP.sequenceT(ApplyZip)([1, 2, 3], [4, 5, 6], [7, 8, 9])
    const fp_ts_s = FP_APP.sequenceS(ApplyZip)({
      a: [1, 2, 3],
      b: [4, 5, 6],
      c: [7, 8, 9]
    })
    const effect_ts = A.tupleZip([1, 2, 3], [4, 5, 6], [7, 8, 9])
    const effect_ts_s = A.structZip({ a: [1, 2, 3], b: [4, 5, 6], c: [7, 8, 9] })

    expect(fp_ts).toEqual(effect_ts)
    expect(fp_ts_s).toEqual(effect_ts_s)
  })
})
