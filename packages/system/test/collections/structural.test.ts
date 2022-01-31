import * as L from "../../src/Collections/Immutable/List/index.js"
import * as St from "../../src/Structural/index.js"

describe("Structural", () => {
  it("Map eq/hash", () => {
    expect(
      St.hash(
        new Map([
          [0, "a"],
          [1, "b"]
        ])
      )
    ).not.equals(
      St.hash(
        new Map([
          [0, "a"],
          [1, "b"]
        ])
      )
    )
    expect(
      new Map([
        [0, "a"],
        [1, "b"]
      ])
    ).not.equals(
      new Map([
        [0, "a"],
        [1, "b"]
      ])
    )
  })
  it("Array eq/hash", () => {
    expect(
      St.hash([
        [0, "a"],
        [1, "b"]
      ])
    ).not.equals(
      St.hash([
        [0, "a"],
        [1, "b"]
      ])
    )
    expect([
      [0, "a"],
      [1, "b"]
    ]).not.equals([
      [0, "a"],
      [1, "b"]
    ])
  })
  it("List eq/hash", () => {
    expect(St.hash(L.from(["a", "b"]))).equals(St.hash(L.from(["a", "b"])))
    expect(L.from(["a", "b"])).equals(L.from(["a", "b"]))
  })
  it("buffer eq/hash", () => {
    expect(St.hash(Buffer.of(0, 1, 2, 3))).not.equals(St.hash(Buffer.of(0, 1, 2, 3)))
    expect(St.hash(Buffer.of(0, 1, 2, 3))).not.equals(
      St.hash(Buffer.concat([Buffer.of(0, 1), Buffer.of(2, 3)]))
    )
    expect(St.hash(Buffer.of(0, 1, 2, 3))).not.equals(St.hash(Buffer.of(0, 1, 2, 3, 4)))

    expect(Buffer.of(0, 1, 2, 3)).not.equals(Buffer.of(0, 1, 2, 3))
    expect(Buffer.of(0, 1, 2, 3)).not.equals(
      Buffer.concat([Buffer.of(0, 1), Buffer.of(2, 3)])
    )
    expect(Buffer.of(0, 1, 2, 3)).not.equals(Buffer.of(0, 1, 2, 3, 4))
  })
  it("Set eq/hash", () => {
    expect(
      St.hash(
        new Set([
          [0, "a"],
          [1, "b"]
        ])
      )
    ).not.equals(
      St.hash(
        new Set([
          [0, "a"],
          [1, "b"]
        ])
      )
    )
    expect(
      new Set([
        [0, "a"],
        [1, "b"]
      ])
    ).not.equals(
      new Set([
        [0, "a"],
        [1, "b"]
      ])
    )
  })
})
