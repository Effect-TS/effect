import * as PW from "../src/Core/PageWidth"

describe("PageWidth", () => {
  describe("constructors", () => {
    it("availablePerLine", () => {
      expect(PW.availablePerLine(80, 1)).toMatchObject({
        _tag: "AvailablePerLine",
        lineWidth: 80,
        ribbonFraction: 1
      })
    })

    it("unbounded", () => {
      expect(PW.unbounded).toMatchObject({ _tag: "Unbounded" })
    })

    it("defaultPageWidth", () => {
      expect(PW.defaultPageWidth).toMatchObject(PW.availablePerLine(80, 1))
    })
  })

  describe("operations", () => {
    it("remainingWidth", () => {
      expect(PW.remainingWidth(80, 1, 4, 40)).toBe(40)
    })
  })
})
