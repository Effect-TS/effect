import * as L from "../../src/Collections/Immutable/List"
import * as St from "../../src/Structural"

describe("Structural", () => {
  it("Map eq/hash", () => {
    expect(
      St.hash(
        new Map([
          [0, "a"],
          [1, "b"]
        ])
      )
    ).equals(
      St.hash(
        new Map([
          [0, "a"],
          [1, "b"]
        ])
      )
    )
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
          [1, "b"],
          [0, "a"]
        ])
      )
    )
    expect(
      new Map([
        [0, "a"],
        [1, "b"]
      ])
    ).equals(
      new Map([
        [0, "a"],
        [1, "b"]
      ])
    )
    expect(
      new Map([
        [0, "a"],
        [1, "b"]
      ])
    ).not.equals(
      new Map([
        [1, "b"],
        [0, "a"]
      ])
    )
  })
  it("Array eq/hash", () => {
    expect(
      St.hash([
        [0, "a"],
        [1, "b"]
      ])
    ).equals(
      St.hash([
        [0, "a"],
        [1, "b"]
      ])
    )
    expect(
      St.hash([
        [0, "a"],
        [1, "b"]
      ])
    ).not.equals(
      St.hash([
        [1, "b"],
        [0, "a"]
      ])
    )
    expect([
      [0, "a"],
      [1, "b"]
    ]).equals([
      [0, "a"],
      [1, "b"]
    ])
    expect([
      [0, "a"],
      [1, "b"]
    ]).not.equals([
      [1, "b"],
      [0, "a"]
    ])
  })
  it("List eq/hash", () => {
    expect(
      St.hash(
        L.from([
          [0, "a"],
          [1, "b"]
        ])
      )
    ).equals(
      St.hash(
        L.from([
          [0, "a"],
          [1, "b"]
        ])
      )
    )
    expect(
      St.hash(
        L.from([
          [0, "a"],
          [1, "b"]
        ])
      )
    ).not.equals(
      St.hash(
        L.from([
          [1, "b"],
          [0, "a"]
        ])
      )
    )
    expect(
      L.from([
        [0, "a"],
        [1, "b"]
      ])
    ).equals(
      L.from([
        [0, "a"],
        [1, "b"]
      ])
    )
    expect(
      L.from([
        [0, "a"],
        [1, "b"]
      ])
    ).not.equals(
      L.from([
        [1, "b"],
        [0, "a"]
      ])
    )
  })
  it("buffer eq/hash", () => {
    expect(St.hash(Buffer.of(0, 1, 2, 3))).equals(St.hash(Buffer.of(0, 1, 2, 3)))
    expect(St.hash(Buffer.of(0, 1, 2, 3))).equals(
      St.hash(Buffer.concat([Buffer.of(0, 1), Buffer.of(2, 3)]))
    )
    expect(St.hash(Buffer.of(0, 1, 2, 3))).not.equals(St.hash(Buffer.of(0, 1, 2, 3, 4)))

    expect(Buffer.of(0, 1, 2, 3)).equals(Buffer.of(0, 1, 2, 3))
    expect(Buffer.of(0, 1, 2, 3)).equals(
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
    ).equals(
      St.hash(
        new Set([
          [0, "a"],
          [1, "b"]
        ])
      )
    )
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
          [1, "b"],
          [0, "a"]
        ])
      )
    )
    expect(
      new Set([
        [0, "a"],
        [1, "b"]
      ])
    ).equals(
      new Set([
        [0, "a"],
        [1, "b"]
      ])
    )
    expect(
      new Set([
        [0, "a"],
        [1, "b"]
      ])
    ).not.equals(
      new Set([
        [1, "b"],
        [0, "a"]
      ])
    )
  })
})
