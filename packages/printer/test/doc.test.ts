import * as Doc from "@effect/printer/Doc"
import { assert, describe, expect, it } from "@effect/vitest"
import * as String from "effect/String"

describe.concurrent("Doc", () => {
  describe.concurrent("constructors", () => {
    it("empty", () => {
      const doc = Doc.vsep([Doc.text("hello"), Doc.parenthesized(Doc.empty), Doc.text("world")])
      expect(Doc.render(doc, { style: "pretty" })).toBe(String.stripMargin(
        `|hello
         |()
         |world`
      ))
    })

    it("char", () => {
      const doc = Doc.char("a")
      expect(Doc.render(doc, { style: "pretty" })).toBe("a")
    })

    it("text", () => {
      const doc = Doc.text("foo")
      expect(Doc.render(doc, { style: "pretty" })).toBe("foo")
    })

    it("string", () => {
      const doc = Doc.string("foo\nbar")
      expect(Doc.render(doc, { style: "pretty" })).toBe("foobar")
    })

    it("flatAlt", () => {
      const open = Doc.flatAlt(Doc.empty, Doc.text("{ "))
      const close = Doc.flatAlt(Doc.empty, Doc.text(" }"))
      const separator = Doc.flatAlt(Doc.empty, Doc.text("; "))

      const prettyDo = <A>(docs: Iterable<Doc.Doc<A>>): Doc.Doc<A> =>
        Doc.group(Doc.hsep([
          Doc.text("do"),
          Doc.align(Doc.encloseSep(docs, open, close, separator))
        ]))

      const statements = [
        Doc.text("name:_ <- getArgs"),
        Doc.text("let greet = \"Hello, \" <> name\""),
        Doc.text("putStrLn greet")
      ]

      assert.strictEqual(
        Doc.render(prettyDo(statements), { style: "pretty" }),
        "do { name:_ <- getArgs; let greet = \"Hello, \" <> name\"; putStrLn greet }"
      )

      expect(Doc.render(prettyDo(statements), {
        style: "pretty",
        options: { lineWidth: 10 }
      })).toBe(String.stripMargin(
        `|do name:_ <- getArgs
         |   let greet = "Hello, " <> name"
         |   putStrLn greet`
      ))
    })

    it("union", () => {
      const doc = Doc.union(Doc.string("A long string of words"), Doc.char("b"))
      expect(Doc.render(doc, { style: "pretty" })).toBe("A long string of words")
      expect(Doc.render(doc, { style: "pretty", options: { lineWidth: 1 } })).toBe("b")
    })

    it("cat", () => {
      const doc = Doc.cat(Doc.char("a"), Doc.char("b"))
      expect(Doc.render(doc, { style: "pretty" })).toBe("ab")
    })

    it("line", () => {
      const doc = Doc.hcat([
        Doc.text("lorem ipsum"),
        Doc.line,
        Doc.text("dolor sit amet")
      ])
      expect(Doc.render(doc, { style: "pretty" })).toBe(String.stripMargin(
        `|lorem ipsum
         |dolor sit amet`
      ))
      expect(Doc.render(Doc.group(doc), { style: "pretty" })).toBe("lorem ipsum dolor sit amet")
    })

    it("lineBreak", () => {
      const doc = Doc.hcat([
        Doc.text("lorem ipsum"),
        Doc.lineBreak,
        Doc.text("dolor sit amet")
      ])
      expect(Doc.render(doc, { style: "pretty" })).toBe(String.stripMargin(
        `|lorem ipsum
         |dolor sit amet`
      ))
      expect(Doc.render(Doc.group(doc), { style: "pretty" })).toBe("lorem ipsumdolor sit amet")
    })

    it("softLine", () => {
      const doc = Doc.hcat([
        Doc.text("lorem ipsum"),
        Doc.softLine,
        Doc.text("dolor sit amet")
      ])
      expect(Doc.render(doc, { style: "pretty" })).toBe("lorem ipsum dolor sit amet")
      expect(Doc.render(doc, { style: "pretty", options: { lineWidth: 10 } })).toBe(String.stripMargin(
        `|lorem ipsum
         |dolor sit amet`
      ))
    })

    it("softLineBreak", () => {
      const doc = Doc.hcat([
        Doc.text("ThisText"),
        Doc.softLineBreak,
        Doc.text("IsWayTooLong")
      ])
      expect(Doc.render(doc, { style: "pretty" })).toBe("ThisTextIsWayTooLong")
      expect(Doc.render(doc, { style: "pretty", options: { lineWidth: 10 } })).toBe(String.stripMargin(
        `|ThisText
         |IsWayTooLong`
      ))
    })

    it("hardLine", () => {
      const doc = Doc.hcat([
        Doc.text("lorem ipsum"),
        Doc.hardLine,
        Doc.text("dolor sit amet")
      ])
      expect(Doc.render(doc, { style: "pretty", options: { lineWidth: 1000 } })).toBe(
        String.stripMargin(
          `|lorem ipsum
           |dolor sit amet`
        )
      )
    })

    it("nest", () => {
      const doc = Doc.vsep([
        Doc.nest(Doc.vsep(Doc.words("lorem ipsum dolor")), 4),
        Doc.text("sit"),
        Doc.text("amet")
      ])
      expect(Doc.render(doc, { style: "pretty" })).toBe(String.stripMargin(
        `|lorem
         |    ipsum
         |    dolor
         |sit
         |amet`
      ))
    })

    it("column", () => {
      const prefix = Doc.hsep([
        Doc.text("prefix"),
        Doc.column((l) => Doc.text(`| <- column ${l}`))
      ])
      const doc = Doc.vsep([0, 4, 8].map((n) => Doc.indent(prefix, n)))
      expect(Doc.render(doc, { style: "pretty" })).toBe(String.stripMargin(
        `|prefix | <- column 7
         |    prefix | <- column 11
         |        prefix | <- column 15`
      ))
    })

    it("nesting", () => {
      const prefix = Doc.hsep([
        Doc.text("prefix"),
        Doc.nesting((l) => Doc.squareBracketed(Doc.text(`Nested: ${l}`)))
      ])
      const doc = Doc.vsep([0, 4, 8].map((n) => Doc.indent(prefix, n)))
      expect(Doc.render(doc, { style: "pretty" })).toBe(String.stripMargin(
        `|prefix [Nested: 0]
         |    prefix [Nested: 4]
         |        prefix [Nested: 8]`
      ))
    })

    it("withPageWidth", () => {
      const prefix = Doc.hsep([
        Doc.text("prefix"),
        Doc.pageWidth((pageWidth) => {
          switch (pageWidth._tag) {
            case "AvailablePerLine": {
              const lineWidth = pageWidth.lineWidth
              const ribbonFraction = pageWidth.ribbonFraction
              return Doc.squareBracketed(
                Doc.text(`Width: ${lineWidth}, Ribbon Fraction: ${ribbonFraction}`)
              )
            }
            case "Unbounded": {
              return Doc.empty
            }
          }
        })
      ])
      const doc = Doc.vsep([0, 4, 8].map((n) => Doc.indent(prefix, n)))
      expect(Doc.render(doc, { style: "pretty", options: { lineWidth: 32 } })).toBe(
        String.stripMargin(
          `|prefix [Width: 32, Ribbon Fraction: 1]
           |    prefix [Width: 32, Ribbon Fraction: 1]
           |        prefix [Width: 32, Ribbon Fraction: 1]`
        )
      )
    })
  })

  describe.concurrent("refinements", () => {
    it("isFail", () => {
      expect(Doc.isFail(Doc.fail)).toBe(true)
      expect(Doc.isFail(Doc.char("a"))).toBe(false)
    })

    it("isEmpty", () => {
      expect(Doc.isEmpty(Doc.empty)).toBe(true)
      expect(Doc.isEmpty(Doc.char("a"))).toBe(false)
    })

    it("isChar", () => {
      expect(Doc.isChar(Doc.char("a"))).toBe(true)
      expect(Doc.isChar(Doc.text("foo"))).toBe(false)
    })

    it("isText", () => {
      expect(Doc.isText(Doc.text("foo"))).toBe(true)
      expect(Doc.isText(Doc.char("a"))).toBe(false)
    })

    it("isLine", () => {
      expect(Doc.isLine(Doc.hardLine)).toBe(true)
      expect(Doc.isLine(Doc.char("a"))).toBe(false)
    })

    it("isFlatAlt", () => {
      expect(Doc.isFlatAlt(Doc.flatAlt(Doc.char("a"), Doc.char("b")))).toBe(true)
      expect(Doc.isFlatAlt(Doc.char("a"))).toBe(false)
    })

    it("isCat", () => {
      expect(Doc.isCat(Doc.cat(Doc.char("a"), Doc.char("b")))).toBe(true)
      expect(Doc.isCat(Doc.char("a"))).toBe(false)
    })

    it("isNest", () => {
      expect(Doc.isNest(Doc.nest(Doc.char("a"), 4))).toBe(true)
      expect(Doc.isNest(Doc.char("a"))).toBe(false)
    })

    it("isUnion", () => {
      expect(Doc.isUnion(Doc.union(Doc.char("a"), Doc.char("b")))).toBe(true)
      expect(Doc.isUnion(Doc.char("a"))).toBe(false)
    })

    it("isColumn", () => {
      expect(Doc.isColumn(Doc.column(() => Doc.char("a")))).toBe(true)
      expect(Doc.isColumn(Doc.char("a"))).toBe(false)
    })

    it("isWithPageWidth", () => {
      expect(Doc.isWithPageWidth(Doc.pageWidth(() => Doc.char("a")))).toBe(true)
      expect(Doc.isWithPageWidth(Doc.char("a"))).toBe(false)
    })

    it("isNesting", () => {
      expect(Doc.isNesting(Doc.nesting(() => Doc.char("a")))).toBe(true)
      expect(Doc.isNesting(Doc.char("a"))).toBe(false)
    })

    it("isAnnotated", () => {
      expect(Doc.isAnnotated(Doc.annotate(Doc.char("a"), 1))).toBe(true)
      expect(Doc.isAnnotated(Doc.char("a"))).toBe(false)
    })
  })

  describe.concurrent("concatenation combinators", () => {
    it("concatWith", () => {
      const doc = Doc.concatWith([Doc.char("a"), Doc.char("b")], Doc.catWithSpace)
      expect(Doc.render(doc, { style: "pretty" })).toBe("a b")
    })

    it("catWithSpace", () => {
      const doc = Doc.catWithSpace(Doc.char("a"), Doc.char("b"))
      expect(Doc.render(doc, { style: "pretty" })).toBe("a b")
    })

    it("catWithLine", () => {
      const doc = Doc.catWithLine(Doc.char("a"), Doc.char("b"))
      expect(Doc.render(doc, { style: "pretty" })).toBe("a\nb")
    })

    it("catWithLineBreak", () => {
      const doc = Doc.catWithLineBreak(Doc.char("a"), Doc.char("b"))
      expect(Doc.render(doc, { style: "pretty" })).toBe("a\nb")
      expect(Doc.render(Doc.group(doc), { style: "pretty" })).toBe("ab")
    })

    it("catWithSoftLine", () => {
      const doc = Doc.catWithSoftLine(Doc.char("a"), Doc.char("b"))
      expect(Doc.render(doc, { style: "pretty" })).toBe("a b")
      expect(Doc.render(doc, { style: "pretty", options: { lineWidth: 1 } })).toBe("a\nb")
    })

    it("catWithSoftLineBreak", () => {
      const doc = Doc.catWithSoftLineBreak(Doc.char("a"), Doc.char("b"))
      expect(Doc.render(doc, { style: "pretty" })).toBe("ab")
      expect(Doc.render(doc, { style: "pretty", options: { lineWidth: 1 } })).toBe("a\nb")
    })
  })

  describe.concurrent("alternative combinators", () => {
    describe.concurrent("group", () => {
      it("should ensure that the `left` document is less wide than the `right`", () => {
        const doc = Doc.group(Doc.flatAlt(Doc.text("even wider"), Doc.text("too wide")))
        // If the `right` document does not fit the page, the algorithm falls
        // back to an even wider layout
        expect(Doc.render(doc, { style: "pretty", options: { lineWidth: 7 } })).toBe("even wider")
      })

      it("should flatten the right document", () => {
        const doc = Doc.group(
          Doc.flatAlt(Doc.char("x"), Doc.hcat([Doc.char("y"), Doc.line, Doc.char("y")]))
        )
        expect(Doc.render(doc, { style: "pretty" })).toBe("y y")
      })

      it("should never render an unflattenable `right` document", () => {
        const doc = Doc.group(
          Doc.flatAlt(Doc.char("x"), Doc.hcat([Doc.char("y"), Doc.hardLine, Doc.char("y")]))
        )
        expect(Doc.render(doc, { style: "pretty" })).toBe("x")
      })
    })
  })

  describe.concurrent("sep combinators", () => {
    it("hsep", () => {
      const doc = Doc.hsep(Doc.words("lorem ipsum dolor sit amet"))
      expect(Doc.render(doc, { style: "pretty" })).toBe("lorem ipsum dolor sit amet")
      expect(Doc.render(doc, { style: "pretty", options: { lineWidth: 5 } })).toBe(
        "lorem ipsum dolor sit amet"
      )
    })

    it("vsep", () => {
      const doc = Doc.hsep([Doc.text("prefix"), Doc.vsep(Doc.words("text to lay out"))])
      expect(Doc.render(doc, { style: "pretty" })).toBe(String.stripMargin(
        `|prefix text
         |to
         |lay
         |out`
      ))
    })

    it("fillSep", () => {
      const doc = Doc.fillSep(Doc.words("lorem ipsum dolor sit amet"))
      expect(Doc.render(doc, { style: "pretty" })).toBe("lorem ipsum dolor sit amet")
      expect(Doc.render(doc, { style: "pretty", options: { lineWidth: 10 } })).toBe(
        String.stripMargin(
          `|lorem
           |ipsum
           |dolor sit
           |amet`
        )
      )
    })

    it("sep", () => {
      const doc = Doc.hsep([Doc.text("prefix"), Doc.seps(Doc.words("text to lay out"))])
      expect(Doc.render(doc, { style: "pretty" })).toBe("prefix text to lay out")
      expect(Doc.render(doc, { style: "pretty", options: { lineWidth: 20 } })).toBe(
        String.stripMargin(
          `|prefix text
           |to
           |lay
           |out`
        )
      )
    })
  })

  describe.concurrent("cat combinators", () => {
    it("hcat", () => {
      const doc = Doc.hcat(Doc.words("lorem ipsum dolor sit amet"))
      expect(Doc.render(doc, { style: "pretty" })).toBe("loremipsumdolorsitamet")
    })

    it("vcat", () => {
      const doc = Doc.vcat(Doc.words("lorem ipsum dolor sit amet"))
      expect(Doc.render(doc, { style: "pretty" })).toBe(String.stripMargin(
        `|lorem
         |ipsum
         |dolor
         |sit
         |amet`
      ))
    })

    it("fillCat", () => {
      const doc = Doc.fillCat(Doc.words("lorem ipsum dolor sit amet"))
      expect(Doc.render(doc, { style: "pretty" })).toBe("loremipsumdolorsitamet")
      expect(Doc.render(doc, { style: "pretty", options: { lineWidth: 10 } })).toBe(
        String.stripMargin(
          `|loremipsum
           |dolorsit
           |amet`
        )
      )
    })

    it("cats", () => {
      const doc = Doc.hsep([Doc.text("Docs:"), Doc.cats(Doc.words("lorem ipsum dolor"))])
      expect(Doc.render(doc, { style: "pretty" })).toBe("Docs: loremipsumdolor")
      expect(Doc.render(doc, { style: "pretty", options: { lineWidth: 10 } })).toBe(
        String.stripMargin(
          `|Docs: lorem
           |ipsum
           |dolor`
        )
      )
    })
  })

  describe.concurrent("fill combinators", () => {
    it("fill", () => {
      type Signature = [name: string, type: string]

      const signatures: ReadonlyArray<Signature> = [
        ["empty", "Doc"],
        ["nest", "Int -> Doc -> Doc"],
        ["fillSep", "[Doc] -> Doc"]
      ]

      const prettySignature = <A>([name, type]: Signature): Doc.Doc<A> =>
        Doc.hsep([Doc.fill(Doc.text(name), 5), Doc.text("::"), Doc.text(type)])

      const doc = Doc.hsep([
        Doc.text("let"),
        Doc.align(Doc.vcat(signatures.map(prettySignature)))
      ])

      expect(Doc.render(doc, { style: "pretty" })).toBe(String.stripMargin(
        `|let empty :: Doc
         |    nest  :: Int -> Doc -> Doc
         |    fillSep :: [Doc] -> Doc`
      ))
    })

    it("fillBreak", () => {
      type Signature = [name: string, type: string]

      const signatures: ReadonlyArray<Signature> = [
        ["empty", "Doc"],
        ["nest", "Int -> Doc -> Doc"],
        ["fillSep", "[Doc] -> Doc"]
      ]

      const prettySignature = <A>([name, type]: Signature): Doc.Doc<A> =>
        Doc.hsep([Doc.fillBreak(Doc.text(name), 5), Doc.text("::"), Doc.text(type)])

      const doc = Doc.hsep([
        Doc.text("let"),
        Doc.align(Doc.vcat(signatures.map(prettySignature)))
      ])

      expect(Doc.render(doc, { style: "pretty" })).toBe(String.stripMargin(
        `|let empty :: Doc
         |    nest  :: Int -> Doc -> Doc
         |    fillSep
         |          :: [Doc] -> Doc`
      ))
    })
  })

  describe.concurrent("alignment combinators", () => {
    it("align", () => {
      const doc = Doc.hsep([
        Doc.text("lorem"),
        Doc.align(Doc.vsep([Doc.text("ipsum"), Doc.text("dolor")]))
      ])

      expect(Doc.render(doc, { style: "pretty" })).toBe(String.stripMargin(
        `|lorem ipsum
         |      dolor`
      ))
    })

    it("hang", () => {
      const doc = Doc.hsep([
        Doc.text("prefix"),
        Doc.hang(Doc.reflow("Indenting these words with hang"), 4)
      ])

      expect(Doc.render(doc, { style: "pretty", options: { lineWidth: 24 } })).toBe(String.stripMargin(
        `|prefix Indenting these
         |           words with
         |           hang`
      ))
    })

    it("indent", () => {
      const doc = Doc.hcat([
        Doc.text("prefix"),
        Doc.indent(Doc.reflow("The indent function indents these words!"), 4)
      ])

      expect(Doc.render(doc, { style: "pretty", options: { lineWidth: 24 } })).toBe(
        String.stripMargin(
          `|prefix    The indent
           |          function
           |          indents these
           |          words!`
        )
      )
    })

    it("encloseSep", () => {
      const doc = Doc.hsep([
        Doc.text("list"),
        Doc.align(Doc.encloseSep(
          ["1", "20", "300", "4000"].map((n) => n.length === 1 ? Doc.char(n) : Doc.text(n)),
          Doc.lbracket,
          Doc.rbracket,
          Doc.comma
        ))
      ])

      expect(Doc.render(doc, { style: "pretty" })).toBe("list [1,20,300,4000]")
      expect(Doc.render(doc, { style: "pretty", options: { lineWidth: 10 } })).toBe(
        String.stripMargin(
          `|list [1
           |     ,20
           |     ,300
           |     ,4000]`
        )
      )
    })

    it("list", () => {
      const doc = Doc.list(
        ["1", "20", "300", "4000"].map((n) => n.length === 1 ? Doc.char(n) : Doc.text(n))
      )
      expect(Doc.render(doc, { style: "pretty" })).toBe("[1, 20, 300, 4000]")
    })

    it("tupled", () => {
      const doc = Doc.tupled(
        ["1", "20", "300", "4000"].map((n) => n.length === 1 ? Doc.char(n) : Doc.text(n))
      )
      expect(Doc.render(doc, { style: "pretty" })).toBe("(1, 20, 300, 4000)")
    })
  })

  describe.concurrent("reactive/conditional combinators", () => {
    it("width", () => {
      const annotate = <A>(self: Doc.Doc<A>): Doc.Doc<A> =>
        Doc.width(Doc.squareBracketed(self), (w) => Doc.text(` <- width: ${w}`))

      const docs = [
        Doc.text("---"),
        Doc.text("------"),
        Doc.indent(Doc.text("---"), 3),
        Doc.vsep([Doc.text("---"), Doc.indent(Doc.text("---"), 4)])
      ]

      const doc = Doc.align(Doc.vsep(docs.map(annotate)))

      expect(Doc.render(doc, { style: "pretty" })).toBe(String.stripMargin(
        `|[---] <- width: 5
         |[------] <- width: 8
         |[   ---] <- width: 8
         |[---
         |    ---] <- width: 8`
      ))
    })
  })

  describe.concurrent("utility combinators", () => {
    it("punctuate", () => {
      const docs = Doc.punctuate(Doc.words("lorem ipsum dolor sit amet"), Doc.comma)
      expect(Doc.render(Doc.hsep(docs), { style: "pretty" })).toBe("lorem, ipsum, dolor, sit, amet")
      // The separators are put at the end of the entries, which can be better
      // visualzied if the documents are rendered vertically
      expect(Doc.render(Doc.vsep(docs), { style: "pretty" })).toBe(String.stripMargin(
        `|lorem,
         |ipsum,
         |dolor,
         |sit,
         |amet`
      ))
    })

    it("surround", () => {
      const doc = Doc.concatWith(
        Doc.words("@effect printer Doc"),
        (left, right) => Doc.surround(Doc.slash, left, right)
      )

      expect(Doc.render(doc, { style: "pretty" })).toBe("@effect/printer/Doc")
    })

    it("parenthesized", () => {
      const doc = Doc.parenthesized(Doc.char("a"))
      expect(Doc.render(doc, { style: "pretty" })).toBe("(a)")
    })

    it("angleBracketed", () => {
      const doc = Doc.angleBracketed(Doc.char("a"))
      expect(Doc.render(doc, { style: "pretty" })).toBe("<a>")
    })

    it("squareBracketed", () => {
      const doc = Doc.squareBracketed(Doc.char("a"))
      expect(Doc.render(doc, { style: "pretty" })).toBe("[a]")
    })

    it("curlyBraced", () => {
      const doc = Doc.curlyBraced(Doc.char("a"))
      expect(Doc.render(doc, { style: "pretty" })).toBe("{a}")
    })

    it("singleQuoted", () => {
      const doc = Doc.singleQuoted(Doc.char("a"))
      expect(Doc.render(doc, { style: "pretty" })).toBe("'a'")
    })

    it("doubleQuoted", () => {
      const doc = Doc.doubleQuoted(Doc.char("a"))
      expect(Doc.render(doc, { style: "pretty" })).toBe("\"a\"")
    })

    it("spaces", () => {
      const doc = Doc.squareBracketed(Doc.doubleQuoted(Doc.spaces(5)))
      expect(Doc.render(doc, { style: "pretty" })).toBe("[\"     \"]")
    })

    it("words", () => {
      const doc = Doc.tupled(Doc.words("lorem ipsum dolor"))
      expect(Doc.render(doc, { style: "pretty" })).toBe("(lorem, ipsum, dolor)")
    })

    it("reflow", () => {
      const doc = Doc.reflow("Lorem ipsum dolor sit amet, consectetur adipisicing elit")
      expect(Doc.render(doc, { style: "pretty", options: { lineWidth: 32 } })).toBe(
        String.stripMargin(
          `|Lorem ipsum dolor sit amet,
           |consectetur adipisicing elit`
        )
      )
    })

    it("textSpaces", () => {
      expect(Doc.textSpaces(4)).toBe("    ")
    })
  })

  describe.concurrent("instances", () => {
    it("Semigroup", () => {
      const S = Doc.getSemigroup<never>()
      const doc = S.combine(Doc.text("hello"), Doc.text("world"))

      expect(Doc.render(doc, { style: "pretty" })).toBe("helloworld")
    })

    it("Monoid", () => {
      const M = Doc.getMonoid<never>()
      const doc = M.combine(
        M.combine(Doc.text("hello"), Doc.parenthesized(M.empty)),
        Doc.text("world")
      )
      expect(Doc.render(doc, { style: "pretty" })).toBe("hello()world")
    })
  })
})
