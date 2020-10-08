import * as A from "../src/Array"
import { pipe } from "../src/Function"
import * as F from "../src/Fused"

describe("Fused", () => {
  it("should fuse filter and map", () => {
    const result = pipe(
      A.range(0, 100),
      F.filter((n) => n > 10),
      F.map((n, i) => `[${i}]: ${n}`),
      F.filter((s) => s.endsWith("0")),
      F.run
    )

    expect(result).toEqual([
      "[0]: 20",
      "[1]: 30",
      "[2]: 40",
      "[3]: 50",
      "[4]: 60",
      "[5]: 70",
      "[6]: 80",
      "[7]: 90",
      "[8]: 100"
    ])
  })
})
