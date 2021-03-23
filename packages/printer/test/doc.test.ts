import type { Array } from "@effect-ts/core/Array"
import * as A from "@effect-ts/core/Array"
import { constant, identity, pipe } from "@effect-ts/system/Function"

import type { Doc } from "../src/Core/Doc"
import * as D from "../src/Core/Doc"
import * as PW from "../src/Core/PageWidth"
import * as R from "../src/Core/Render"

describe("Doc", () => {
  describe("definition", () => {
    it("Fail", () => {
      const doc = new D.Fail(identity)

      expect(doc).toBeInstanceOf(D.Fail)
      expect(doc.id).toBeDefined()
    })

    it("Char", () => {
      const doc = new D.Char("a", identity)

      expect(doc).toBeInstanceOf(D.Char)
      expect(doc.id).toBeDefined()
      expect(doc.char).toBe("a")
    })

    it("Text", () => {
      const doc = new D.Text("foo", identity)

      expect(doc).toBeInstanceOf(D.Text)
      expect(doc.id).toBeDefined()
      expect(doc.text).toBe("foo")
    })

    it("FlatAlt", () => {
      const doc = new D.FlatAlt(new D.Char("a", identity), new D.Char("b", identity))

      expect(doc).toBeInstanceOf(D.FlatAlt)
      expect(doc.left).toBeInstanceOf(D.Char)
      expect(doc.left).toHaveProperty("char", "a")
      expect(doc.right).toBeInstanceOf(D.Char)
      expect(doc.right).toHaveProperty("char", "b")
    })

    it("Cat", () => {
      const doc = new D.Cat(new D.Char("a", identity), new D.Char("b", identity))

      expect(doc).toBeInstanceOf(D.Cat)
      expect(doc.left).toBeInstanceOf(D.Char)
      expect(doc.left).toHaveProperty("char", "a")
      expect(doc.right).toBeInstanceOf(D.Char)
      expect(doc.right).toHaveProperty("char", "b")
    })

    it("Nest", () => {
      const doc = new D.Nest(4, new D.Char("a", identity))

      expect(doc).toBeInstanceOf(D.Nest)
      expect(doc.doc).toBeInstanceOf(D.Char)
      expect(doc.doc).toHaveProperty("char", "a")
      expect(doc.indent).toBe(4)
    })

    it("Union", () => {
      const doc = new D.Union(new D.Char("a", identity), new D.Char("b", identity))

      expect(doc).toBeInstanceOf(D.Union)
      expect(doc.left).toBeInstanceOf(D.Char)
      expect(doc.left).toHaveProperty("char", "a")
      expect(doc.right).toBeInstanceOf(D.Char)
      expect(doc.right).toHaveProperty("char", "b")
    })

    it("Column", () => {
      const doc = new D.Column((pos) => new D.Text(`${pos}`, identity))
      const reactedDoc = doc.react(4)

      expect(doc).toBeInstanceOf(D.Column)
      expect(doc.react).toBeDefined()
      expect(reactedDoc).toBeInstanceOf(D.Text)
      expect(reactedDoc).toHaveProperty("text", "4")
    })

    it("WithPageWidth", () => {
      const react = (w: PW.PageWidth): D.Doc<never> =>
        w._tag === "AvailablePerLine"
          ? new D.Text(`${w.lineWidth}`, identity)
          : new D.Char("a", identity)
      const doc = new D.WithPageWidth(react)
      const availablePerLineDoc = doc.react(PW.availablePerLine(80, 1))
      const unboundedDoc = doc.react(PW.unbounded)

      expect(doc).toBeInstanceOf(D.WithPageWidth)
      expect(doc.react).toBeDefined()
      expect(availablePerLineDoc).toBeInstanceOf(D.Text)
      expect(availablePerLineDoc).toHaveProperty("text", "80")
      expect(unboundedDoc).toBeInstanceOf(D.Char)
      expect(unboundedDoc).toHaveProperty("char", "a")
    })

    it("Nesting", () => {
      const doc = new D.Nesting((l: number): Doc<never> => new D.Text(`${l}`, identity))
      const reactedDoc = doc.react(4)

      expect(doc).toBeInstanceOf(D.Nesting)
      expect(doc.react).toBeDefined()
      expect(reactedDoc).toBeInstanceOf(D.Text)
      expect(reactedDoc).toHaveProperty("text", "4")
    })

    it("Annotated", () => {
      const doc = new D.Annotated(1, new D.Char("a", identity))

      expect(doc).toBeInstanceOf(D.Annotated)
      expect(doc.annotation).toBe(1)
      expect(doc.doc).toBeInstanceOf(D.Char)
      expect(doc.doc).toHaveProperty("char", "a")
    })
  })

  describe("constructors", () => {
    it("fail", () => {
      expect(D.fail).toBeInstanceOf(D.Fail)
    })

    it("empty", () => {
      const doc = D.vsep([D.text("hello"), D.parens(D.empty), D.text("world")])
      const actual = R.renderPrettyDefault(doc)
      const expected = `
hello
()
world`.trim()

      expect(actual).toEqual(expected)
    })

    it("char", () => {
      const doc = D.char("a")
      const actual = R.renderPrettyDefault(doc)
      const expected = "a"

      expect(actual).toBe(expected)
    })

    it("text", () => {
      const doc = D.text("foo")
      const actual = R.renderPrettyDefault(doc)
      const expected = "foo"

      expect(actual).toBe(expected)
    })

    it("string", () => {
      const doc = D.string("foo\nbar")
      const actual = R.renderPrettyDefault(doc)
      const expected = "foobar"

      expect(actual).toBe(expected)
    })

    it("flatAlt", () => {
      const open = D.flatAlt_(D.empty, D.text("{ "))
      const close = D.flatAlt_(D.empty, D.text(" }"))
      const separator = D.flatAlt_(D.empty, D.text("; "))

      const prettyDo = <A>(xs: Array<Doc<A>>): Doc<A> =>
        D.group(
          D.hsep([D.text("do"), D.align(D.encloseSep_(xs, open, close, separator))])
        )

      const statements = [
        D.text("name:_ <- getArgs"),
        D.text('let greet = "Hello, " <> name"'),
        D.text("putStrLn greet")
      ]

      expect(pipe(prettyDo(statements), R.renderPretty(80))).toBe(
        `
do { name:_ <- getArgs; let greet = "Hello, " <> name"; putStrLn greet }
      `.trim()
      )

      expect(pipe(prettyDo(statements), R.renderPretty(10))).toBe(
        `
do name:_ <- getArgs
   let greet = "Hello, " <> name"
   putStrLn greet
      `.trim()
      )
    })

    it("union", () => {
      const doc = D.union_(D.string("A long string of words"), D.char("b"))

      expect(R.renderPrettyDefault(doc)).toBe("A long string of words")
      expect(R.renderPretty(1)(doc)).toBe("b")
    })

    it("cat", () => {
      const doc = D.cat_(D.char("a"), D.char("b"))
      const actual = R.renderPrettyDefault(doc)
      const expected = "ab"

      expect(actual).toBe(expected)
    })

    it("line", () => {
      const doc = D.hcat([D.text("lorem ipsum"), D.line, D.text("dolor sit amet")])

      expect(R.renderPrettyDefault(doc)).toBe(
        `
lorem ipsum
dolor sit amet`.trim()
      )
      expect(R.renderPrettyDefault(D.group(doc))).toBe("lorem ipsum dolor sit amet")
    })

    it("lineBreak", () => {
      const doc = D.hcat([D.text("lorem ipsum"), D.lineBreak, D.text("dolor sit amet")])

      expect(R.renderPrettyDefault(doc)).toBe(
        `
lorem ipsum
dolor sit amet`.trim()
      )
      expect(R.renderPrettyDefault(D.group(doc))).toBe("lorem ipsumdolor sit amet")
    })

    it("softLine", () => {
      const doc = D.hcat([D.text("lorem ipsum"), D.softLine, D.text("dolor sit amet")])

      expect(pipe(doc, R.renderPretty(80))).toBe("lorem ipsum dolor sit amet")
      expect(pipe(doc, R.renderPretty(10))).toBe(
        `
lorem ipsum
dolor sit amet`.trim()
      )
    })

    it("softLineBreak", () => {
      const doc = D.hcat([D.text("ThisText"), D.softLineBreak, D.text("IsWayTooLong")])

      expect(pipe(doc, R.renderPretty(80))).toBe("ThisTextIsWayTooLong")
      expect(pipe(doc, R.renderPretty(10))).toBe(
        `
ThisText
IsWayTooLong`.trim()
      )
    })

    it("hardLine", () => {
      const doc = D.hcat([D.text("lorem ipsum"), D.hardLine, D.text("dolor sit amet")])

      expect(pipe(doc, R.renderPretty(1000))).toBe(
        `
lorem ipsum
dolor sit amet`.trim()
      )
    })

    it("nest", () => {
      const doc = D.vsep([
        D.nest_(D.vsep(D.words("lorem ipsum dolor")), 4),
        D.text("sit"),
        D.text("amet")
      ])

      expect(R.renderPrettyDefault(doc)).toBe(
        `
lorem
    ipsum
    dolor
sit
amet`.trim()
      )
    })

    it("column", () => {
      const prefix = D.hsep([
        D.text("prefix"),
        D.column((l) => D.text(`| <- column ${l}`))
      ])
      const doc = D.vsep(A.map_([0, 4, 8], (n) => D.indent_(prefix, n)))

      expect(R.renderPrettyDefault(doc)).toBe(
        `
prefix | <- column 7
    prefix | <- column 11
        prefix | <- column 15`.trim()
      )
    })

    it("nesting", () => {
      const prefix = D.hsep([
        D.text("prefix"),
        D.nesting((l) => D.brackets(D.text(`Nested: ${l}`)))
      ])
      const doc = D.vsep(A.map_([0, 4, 8], (n) => D.indent_(prefix, n)))

      expect(R.renderPrettyDefault(doc)).toBe(
        `
prefix [Nested: 0]
    prefix [Nested: 4]
        prefix [Nested: 8]`.trim()
      )
    })

    it("withPageWidth", () => {
      const prefix = D.hsep([
        D.text("prefix"),
        D.withPageWidth(
          PW.match({
            AvailablePerLine: (lw, rf) =>
              D.brackets(D.text(`Width: ${lw}, Ribbon Fraction: ${rf}`)),
            Unbounded: () => D.empty
          })
        )
      ])
      const doc = D.vsep(A.map_([0, 4, 8], (n) => D.indent_(prefix, n)))

      expect(pipe(doc, R.renderPretty(32))).toBe(
        `
prefix [Width: 32, Ribbon Fraction: 1]
    prefix [Width: 32, Ribbon Fraction: 1]
        prefix [Width: 32, Ribbon Fraction: 1]`.trim()
      )
    })

    it("annotate", () => {
      const doc = D.annotate_(D.text("foo"), 1)

      expect(R.renderPrettyDefault(doc)).toBe("foo")
    })
  })

  describe("destructors", () => {
    it("match", () => {
      const match = D.match({
        Fail: constant("Fail"),
        Empty: constant("Empty"),
        Char: constant("Char"),
        Text: constant("Text"),
        Line: constant("Line"),
        FlatAlt: constant("FlatAlt"),
        Cat: constant("Cat"),
        Nest: constant("Nest"),
        Union: constant("Union"),
        Column: constant("Column"),
        WithPageWidth: constant("WithPageWidth"),
        Nesting: constant("Nesting"),
        Annotated: constant("Annotated")
      })

      expect(match(D.fail)).toBe("Fail")
      expect(match(D.empty)).toBe("Empty")
      expect(match(D.char("a"))).toBe("Char")
      expect(match(D.text("foo"))).toBe("Text")
      expect(match(D.hardLine)).toBe("Line")
      expect(match(D.flatAlt_(D.char("a"), D.char("b")))).toBe("FlatAlt")
      expect(match(D.cat_(D.char("a"), D.char("b")))).toBe("Cat")
      expect(match(D.nest_(D.char("a"), 4))).toBe("Nest")
      expect(match(D.union_(D.char("a"), D.char("b")))).toBe("Union")
      expect(match(D.column(() => D.char("a")))).toBe("Column")
      expect(match(D.withPageWidth(() => D.char("a")))).toBe("WithPageWidth")
      expect(match(D.nesting(() => D.char("a")))).toBe("Nesting")
      expect(match(D.annotate_(D.char("a"), 1))).toBe("Annotated")
    })
  })

  describe("operations", () => {
    it("isFail", () => {
      expect(D.isFail(D.fail)).toBeTruthy()
      expect(D.isFail(D.char("a"))).toBeFalsy()
    })

    it("isEmpty", () => {
      expect(D.isEmpty(D.empty)).toBeTruthy()
      expect(D.isEmpty(D.char("a"))).toBeFalsy()
    })

    it("isChar", () => {
      expect(D.isChar(D.char("a"))).toBeTruthy()
      expect(D.isChar(D.text("foo"))).toBeFalsy()
    })

    it("isText", () => {
      expect(D.isText(D.text("foo"))).toBeTruthy()
      expect(D.isText(D.char("a"))).toBeFalsy()
    })

    it("isLine", () => {
      expect(D.isLine(D.hardLine)).toBeTruthy()
      expect(D.isLine(D.char("a"))).toBeFalsy()
    })

    it("isFlatAlt", () => {
      expect(D.isFlatAlt(D.flatAlt_(D.char("a"), D.char("b")))).toBeTruthy()
      expect(D.isFlatAlt(D.char("a"))).toBeFalsy()
    })

    it("isCat", () => {
      expect(D.isCat(D.cat_(D.char("a"), D.char("b")))).toBeTruthy()
      expect(D.isCat(D.char("a"))).toBeFalsy()
    })

    it("isNest", () => {
      expect(D.isNest(D.nest_(D.char("a"), 4))).toBeTruthy()
      expect(D.isNest(D.char("a"))).toBeFalsy()
    })

    it("isUnion", () => {
      expect(D.isUnion(D.union_(D.char("a"), D.char("b")))).toBeTruthy()
      expect(D.isUnion(D.char("a"))).toBeFalsy()
    })

    it("isColumn", () => {
      expect(D.isColumn(D.column(() => D.char("a")))).toBeTruthy()
      expect(D.isColumn(D.char("a"))).toBeFalsy()
    })

    it("isWithPageWidth", () => {
      expect(D.isWithPageWidth(D.withPageWidth(() => D.char("a")))).toBeTruthy()
      expect(D.isWithPageWidth(D.char("a"))).toBeFalsy()
    })

    it("isNesting", () => {
      expect(D.isNesting(D.nesting(() => D.char("a")))).toBeTruthy()
      expect(D.isNesting(D.char("a"))).toBeFalsy()
    })

    it("isAnnotated", () => {
      expect(D.isAnnotated(D.annotate_(D.char("a"), 1))).toBeTruthy()
      expect(D.isAnnotated(D.char("a"))).toBeFalsy()
    })
  })
})
