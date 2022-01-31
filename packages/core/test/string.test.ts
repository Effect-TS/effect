import * as String from "../src/String/index.js"

describe("String", () => {
  it("should strip a leading prefix from each line", () => {
    const actual = String.stripMargin(
      `|
       |Hello,
       |World!
       |`
    )
    const expected = "\nHello,\nWorld!\n"

    expect(actual).toBe(expected)
  })

  it("should strip a leading prefix from each line using a margin character", () => {
    const actual = String.stripMarginWith_(
      `$
       $Hello,
       $World!
       $`,
      "$"
    )
    const expected = "\nHello,\nWorld!\n"

    expect(actual).toBe(expected)
  })
})
