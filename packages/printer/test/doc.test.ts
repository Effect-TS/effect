import type { Array } from "@effect-ts/core/Collections/Immutable/Array"
import * as A from "@effect-ts/core/Collections/Immutable/Array"
import { constant, flow, pipe } from "@effect-ts/system/Function"

import type { Doc } from "../src/Core/Doc"
import * as D from "../src/Core/Doc"
import * as PW from "../src/Core/PageWidth"
import * as R from "../src/Core/Render"

describe("Doc", () => {
  describe("constructors", () => {
    it("fail", () => {
      expect(D.fail).toBeInstanceOf(D.Fail)
    })

    it("empty", () => {
      const doc = D.vsep([D.text("hello"), D.parens(D.empty), D.text("world")])

      expect(R.renderPrettyDefault(doc)).toEqual(
        `
hello
()
world`.trim()
      )
    })

    it("char", () => {
      const doc = D.char("a")

      expect(R.renderPrettyDefault(doc)).toBe("a")
    })

    it("text", () => {
      const doc = D.text("foo")

      expect(R.renderPrettyDefault(doc)).toBe("foo")
    })

    it("string", () => {
      const doc = D.string("foo\nbar")

      expect(R.renderPrettyDefault(doc)).toBe("foobar")
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

      expect(R.renderPrettyDefault(doc)).toBe("ab")
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
          PW.PageWidth.matchStrict({
            AvailablePerLine: ({ lineWidth, ribbonFraction }) =>
              D.brackets(
                D.text(`Width: ${lineWidth}, Ribbon Fraction: ${ribbonFraction}`)
              ),
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

  describe("concatenation combinators", () => {
    it("concatWith", () => {
      const doc = D.concatWith_([D.char("a"), D.char("b")], D.appendWithSpace_)

      expect(R.renderPrettyDefault(doc)).toBe("a b")
    })

    it("appendWithSpace", () => {
      const doc = D.appendWithSpace_(D.char("a"), D.char("b"))

      expect(R.renderPrettyDefault(doc)).toBe("a b")
    })

    it("appendWithLine", () => {
      const doc = D.appendWithLine_(D.char("a"), D.char("b"))

      expect(R.renderPrettyDefault(doc)).toBe("a\nb")
    })

    it("appendWithLineBreak", () => {
      const doc = D.appendWithLineBreak_(D.char("a"), D.char("b"))

      expect(R.renderPrettyDefault(doc)).toBe("a\nb")
      expect(R.renderPrettyDefault(D.group(doc))).toBe("ab")
    })

    it("appendWithSoftLine", () => {
      const doc = D.appendWithSoftLine_(D.char("a"), D.char("b"))

      expect(R.renderPrettyDefault(doc)).toBe("a b")
      expect(pipe(doc, R.renderPretty(1))).toBe("a\nb")
    })

    it("appendWithSoftLineBreak", () => {
      const doc = D.appendWithSoftLineBreak_(D.char("a"), D.char("b"))

      expect(R.renderPrettyDefault(doc)).toBe("ab")
      expect(pipe(doc, R.renderPretty(1))).toBe("a\nb")
    })
  })

  describe("alternative combinators", () => {
    describe("group", () => {
      it("should ensure that the `left` document is less wide than the `right`", () => {
        const doc = D.group(D.flatAlt_(D.text("even wider"), D.text("too wide")))

        // If the `right` document does not fit the page, the algorithm falls
        // back to an even wider layout
        expect(pipe(doc, R.renderPretty(7))).toBe("even wider")
      })

      it("should flatten the right document", () => {
        const doc = D.group(
          D.flatAlt_(D.char("x"), D.hcat([D.char("y"), D.line, D.char("y")]))
        )

        expect(R.renderPrettyDefault(doc)).toBe("y y")
      })

      it("should never render an unflattenable `right` document", () => {
        const doc = D.group(
          D.flatAlt_(D.char("x"), D.hcat([D.char("y"), D.hardLine, D.char("y")]))
        )

        expect(R.renderPrettyDefault(doc)).toBe("x")
      })
    })
  })

  describe("sep combinators", () => {
    it("hsep", () => {
      const doc = D.hsep(D.words("lorem ipsum dolor sit amet"))

      expect(R.renderPrettyDefault(doc)).toBe("lorem ipsum dolor sit amet")
      expect(pipe(doc, R.renderPretty(5))).toBe("lorem ipsum dolor sit amet")
    })

    it("vsep", () => {
      const doc = D.hsep([D.text("prefix"), D.vsep(D.words("text to lay out"))])

      expect(R.renderPrettyDefault(doc)).toBe(
        `
prefix text
to
lay
out`.trim()
      )
    })

    it("fillSep", () => {
      const doc = D.fillSep(D.words("lorem ipsum dolor sit amet"))

      expect(R.renderPrettyDefault(doc)).toBe("lorem ipsum dolor sit amet")
      expect(pipe(doc, R.renderPretty(10))).toBe(
        `
lorem
ipsum
dolor sit
amet`.trim()
      )
    })

    it("sep", () => {
      const doc = D.hsep([D.text("prefix"), D.seps(D.words("text to lay out"))])

      expect(R.renderPrettyDefault(doc)).toBe("prefix text to lay out")
      expect(pipe(doc, R.renderPretty(20))).toBe(
        `
prefix text
to
lay
out`.trim()
      )
    })
  })

  describe("cat combinators", () => {
    it("hcat", () => {
      const doc = D.hcat(D.words("lorem ipsum dolor sit amet"))

      expect(R.renderPrettyDefault(doc)).toBe("loremipsumdolorsitamet")
    })

    it("vcat", () => {
      const doc = D.vcat(D.words("lorem ipsum dolor sit amet"))

      expect(R.renderPrettyDefault(doc)).toBe(
        `
lorem
ipsum
dolor
sit
amet`.trim()
      )
    })

    it("fillCat", () => {
      const doc = D.fillCat(D.words("lorem ipsum dolor sit amet"))

      expect(R.renderPrettyDefault(doc)).toBe("loremipsumdolorsitamet")
      expect(pipe(doc, R.renderPretty(10))).toBe(
        `
loremipsum
dolorsit
amet`.trim()
      )
    })

    it("cats", () => {
      const doc = D.hsep([D.text("Docs:"), D.cats(D.words("lorem ipsum dolor"))])

      expect(R.renderPrettyDefault(doc)).toBe("Docs: loremipsumdolor")
      expect(pipe(doc, R.renderPretty(10))).toBe(
        `
Docs: lorem
ipsum
dolor`.trim()
      )
    })
  })

  describe("filler combinators", () => {
    it("fill", () => {
      type Signature = [name: string, type: string]

      const signatures: Array<Signature> = [
        ["empty", "Doc"],
        ["nest", "Int -> Doc -> Doc"],
        ["fillSep", "[Doc] -> Doc"]
      ]

      const prettySignature = <A>([name, type]: Signature): Doc<A> =>
        D.hsep([D.fill_(D.text(name), 5), D.text("::"), D.text(type)])

      const doc = D.hsep([
        D.text("let"),
        D.align(D.vcat(A.map_(signatures, prettySignature)))
      ])

      expect(R.renderPrettyDefault(doc)).toBe(
        `
let empty :: Doc
    nest  :: Int -> Doc -> Doc
    fillSep :: [Doc] -> Doc`.trim()
      )
    })

    it("fillBreak", () => {
      type Signature = [name: string, type: string]

      const signatures: Array<Signature> = [
        ["empty", "Doc"],
        ["nest", "Int -> Doc -> Doc"],
        ["fillSep", "[Doc] -> Doc"]
      ]

      const prettySignature = <A>([name, type]: Signature): Doc<A> =>
        D.hsep([D.fillBreak_(D.text(name), 5), D.text("::"), D.text(type)])

      const doc = D.hsep([
        D.text("let"),
        D.align(D.vcat(A.map_(signatures, prettySignature)))
      ])

      expect(R.renderPrettyDefault(doc)).toBe(
        `
let empty :: Doc
    nest  :: Int -> Doc -> Doc
    fillSep
          :: [Doc] -> Doc`.trim()
      )
    })
  })

  describe("alignment combinators", () => {
    it("align", () => {
      const doc = D.hsep([
        D.text("lorem"),
        D.align(D.vsep([D.text("ipsum"), D.text("dolor")]))
      ])

      expect(R.renderPrettyDefault(doc)).toBe(
        `
lorem ipsum
      dolor`.trim()
      )
    })

    it("hang", () => {
      const doc = D.hsep([
        D.text("prefix"),
        D.hang_(D.reflow("Indenting these words with hang"), 4)
      ])

      expect(pipe(doc, R.renderPretty(24))).toBe(
        `
prefix Indenting these
           words with
           hang`.trim()
      )
    })

    it("indent", () => {
      const doc = D.hcat([
        D.text("prefix"),
        D.indent_(D.reflow("The indent function indents these words!"), 4)
      ])

      expect(pipe(doc, R.renderPretty(24))).toBe(
        `
prefix    The indent
          function
          indents these
          words!`.trim()
      )
    })

    it("encloseSep", () => {
      const doc = D.hsep([
        D.text("list"),
        D.align(
          pipe(
            A.map_(["1", "20", "300", "4000"], (n) =>
              n.length === 1 ? D.char(n) : D.text(n)
            ),
            D.encloseSep(D.lbracket, D.rbracket, D.comma)
          )
        )
      ])

      expect(R.renderPrettyDefault(doc)).toBe("list [1,20,300,4000]")

      expect(pipe(doc, R.renderPretty(10))).toBe(
        `
list [1
     ,20
     ,300
     ,4000]`.trim()
      )
    })

    it("list", () => {
      const doc = D.list(
        A.map_(["1", "20", "300", "4000"], (n) =>
          n.length === 1 ? D.char(n) : D.text(n)
        )
      )

      expect(R.renderPrettyDefault(doc)).toBe("[1, 20, 300, 4000]")
    })

    it("tupled", () => {
      const doc = D.tupled(
        A.map_(["1", "20", "300", "4000"], (n) =>
          n.length === 1 ? D.char(n) : D.text(n)
        )
      )

      expect(R.renderPrettyDefault(doc)).toBe("(1, 20, 300, 4000)")
    })
  })

  describe("reactive/conditional combinators", () => {
    const annotate: <A>(doc: Doc<A>) => Doc<A> = flow(
      D.brackets,
      D.width((w) => D.text(` <- width: ${w}`))
    )

    const docs = [
      D.text("---"),
      D.text("------"),
      D.indent_(D.text("---"), 3),
      D.vsep([D.text("---"), D.indent_(D.text("---"), 4)])
    ]

    const doc = D.align(D.vsep(A.map_(docs, annotate)))

    expect(R.renderPrettyDefault(doc)).toBe(
      `
[---] <- width: 5
[------] <- width: 8
[   ---] <- width: 8
[---
    ---] <- width: 8`.trim()
    )
  })

  describe("general combinators", () => {
    it("punctuate", () => {
      const docs = D.punctuate_(D.words("lorem ipsum dolor sit amet"), D.comma)

      expect(R.renderPrettyDefault(D.hsep(docs))).toBe("lorem, ipsum, dolor, sit, amet")
      // lorem, ipsum, dolor, sit, amet

      // The separators are put at the end of the entries, which can be better
      // visualzied if the documents are rendered vertically
      expect(R.renderPrettyDefault(D.vsep(docs))).toBe(
        `
lorem,
ipsum,
dolor,
sit,
amet`.trim()
      )
    })

    it("enclose", () => {
      const doc = pipe(D.char("-"), D.enclose(D.char("A"), D.char("Z")))

      expect(R.renderPrettyDefault(doc)).toBe("A-Z")
    })

    it("surround", () => {
      const doc = pipe(
        D.words("@effect-ts printer Core Doc"),
        D.concatWith(D.surround(D.slash))
      )

      expect(R.renderPrettyDefault(doc)).toBe("@effect-ts/printer/Core/Doc")
    })

    it("parens", () => {
      const doc = D.parens(D.char("a"))

      expect(R.renderPrettyDefault(doc)).toBe("(a)")
    })

    it("angles", () => {
      const doc = D.angles(D.char("a"))

      expect(R.renderPrettyDefault(doc)).toBe("<a>")
    })

    it("brackets", () => {
      const doc = D.brackets(D.char("a"))

      expect(R.renderPrettyDefault(doc)).toBe("[a]")
    })

    it("braces", () => {
      const doc = D.braces(D.char("a"))

      expect(R.renderPrettyDefault(doc)).toBe("{a}")
    })

    it("squotes", () => {
      const doc = D.squotes(D.char("a"))

      expect(R.renderPrettyDefault(doc)).toBe("'a'")
    })

    it("dquotes", () => {
      const doc = D.dquotes(D.char("a"))

      expect(R.renderPrettyDefault(doc)).toBe('"a"')
    })

    it("spaces", () => {
      const doc = D.brackets(D.dquotes(D.spaces(5)))

      expect(R.renderPrettyDefault(doc)).toBe('["     "]')
    })

    it("words", () => {
      const doc = D.tupled(D.words("lorem ipsum dolor"))

      expect(R.renderPrettyDefault(doc)).toBe("(lorem, ipsum, dolor)")
    })

    it("reflow", () => {
      const doc = D.reflow(
        "Lorem ipsum dolor sit amet, consectetur adipisicing elit, " +
          "sed do eiusmod tempor incididunt ut labore et dolore magna aliqua."
      )

      expect(pipe(doc, R.renderPretty(32))).toBe(
        `
Lorem ipsum dolor sit amet,
consectetur adipisicing elit,
sed do eiusmod tempor incididunt
ut labore et dolore magna
aliqua.`.trim()
      )
    })
  })

  describe("instances", () => {
    it("Associative", () => {
      const A = D.getAssociative<never>()
      const doc = A.combine(D.text("hello"), D.text("world"))

      expect(R.renderPrettyDefault(doc)).toBe("helloworld")
    })

    it("Identity", () => {
      const I = D.getIdentity<never>()
      const doc = I.combine(
        D.text("hello"),
        I.combine(D.parens(I.identity), D.text("world"))
      )

      expect(R.renderPrettyDefault(doc)).toEqual("hello()world")
    })
  })

  describe("utils", () => {
    it("textSpaces", () => {
      expect(D.textSpaces(4)).toBe("    ")
    })
  })
})
