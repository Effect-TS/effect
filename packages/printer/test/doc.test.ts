import { pipe } from "@fp-ts/data/Function"
import * as String from "@fp-ts/data/String"

describe.concurrent("Doc", () => {
  describe.concurrent("constructors", () => {
    it("empty", () => {
      const doc = Doc.vsep([Doc.text("hello"), Doc.empty.parenthesized, Doc.text("world")])

      assert.strictEqual(
        doc.prettyDefault,
        String.stripMargin(
          `|hello
           |()
           |world`
        )
      )
    })

    it("char", () => {
      const doc = Doc.char("a")

      assert.strictEqual(doc.prettyDefault, "a")
    })

    it("text", () => {
      const doc = Doc.text("foo")

      assert.strictEqual(doc.prettyDefault, "foo")
    })

    it("string", () => {
      const doc = Doc.string("foo\nbar")

      assert.strictEqual(doc.prettyDefault, "foobar")
    })

    it("flatAlt", () => {
      const open = Doc.empty.flatAlt(Doc.text("{ "))
      const close = Doc.empty.flatAlt(Doc.text(" }"))
      const separator = Doc.empty.flatAlt(Doc.text("; "))

      function prettyDo<A>(docs: Iterable<Doc<A>>): Doc<A> {
        return Doc.hsep([
          Doc.text("do"),
          pipe(docs, Doc.encloseSep(open, close, separator)).align
        ]).group
      }

      const statements = [
        Doc.text("name:_ <- getArgs"),
        Doc.text("let greet = \"Hello, \" <> name\""),
        Doc.text("putStrLn greet")
      ]

      assert.strictEqual(
        prettyDo(statements).pretty(80),
        "do { name:_ <- getArgs; let greet = \"Hello, \" <> name\"; putStrLn greet }"
      )

      assert.strictEqual(
        prettyDo(statements).pretty(10),
        String.stripMargin(
          `|do name:_ <- getArgs
           |   let greet = "Hello, " <> name"
           |   putStrLn greet`
        )
      )
    })

    it("union", () => {
      const doc = Doc.string("A long string of words").union(Doc.char("b"))

      assert.strictEqual(doc.prettyDefault, "A long string of words")
      assert.strictEqual(doc.pretty(1), "b")
    })

    it("cat", () => {
      const doc = Doc.char("a").cat(Doc.char("b"))

      assert.strictEqual(doc.prettyDefault, "ab")
    })

    it("line", () => {
      const doc = Doc.hcat([
        Doc.text("lorem ipsum"),
        Doc.line,
        Doc.text("dolor sit amet")
      ])

      assert.strictEqual(
        doc.prettyDefault,
        String.stripMargin(
          `|lorem ipsum
           |dolor sit amet`
        )
      )
      assert.strictEqual(
        doc.group.prettyDefault,
        "lorem ipsum dolor sit amet"
      )
    })

    it("lineBreak", () => {
      const doc = Doc.hcat([
        Doc.text("lorem ipsum"),
        Doc.lineBreak,
        Doc.text("dolor sit amet")
      ])

      assert.strictEqual(
        doc.prettyDefault,
        String.stripMargin(
          `|lorem ipsum
           |dolor sit amet`
        )
      )
      assert.strictEqual(
        doc.group.prettyDefault,
        "lorem ipsumdolor sit amet"
      )
    })

    it("softLine", () => {
      const doc = Doc.hcat([
        Doc.text("lorem ipsum"),
        Doc.softLine,
        Doc.text("dolor sit amet")
      ])

      assert.strictEqual(doc.pretty(80), "lorem ipsum dolor sit amet")
      assert.strictEqual(
        doc.pretty(10),
        String.stripMargin(
          `|lorem ipsum
           |dolor sit amet`
        )
      )
    })

    it("softLineBreak", () => {
      const doc = Doc.hcat([
        Doc.text("ThisText"),
        Doc.softLineBreak,
        Doc.text("IsWayTooLong")
      ])

      assert.strictEqual(doc.pretty(80), "ThisTextIsWayTooLong")
      assert.strictEqual(
        doc.pretty(10),
        String.stripMargin(
          `|ThisText
           |IsWayTooLong`
        )
      )
    })

    it("hardLine", () => {
      const doc = Doc.hcat([
        Doc.text("lorem ipsum"),
        Doc.hardLine,
        Doc.text("dolor sit amet")
      ])

      assert.strictEqual(
        doc.pretty(1000),
        String.stripMargin(
          `|lorem ipsum
           |dolor sit amet`
        )
      )
    })

    it("nest", () => {
      const doc = Doc.vsep([
        Doc.vsep(Doc.words("lorem ipsum dolor")).nest(4),
        Doc.text("sit"),
        Doc.text("amet")
      ])

      assert.strictEqual(
        doc.prettyDefault,
        String.stripMargin(
          `|lorem
           |    ipsum
           |    dolor
           |sit
           |amet`
        )
      )
    })

    it("column", () => {
      const prefix = Doc.hsep([
        Doc.text("prefix"),
        Doc.column((l) => Doc.text(`| <- column ${l}`))
      ])
      const doc = Doc.vsep([0, 4, 8].map((n) => prefix.indent(n)))

      assert.strictEqual(
        doc.prettyDefault,
        String.stripMargin(
          `|prefix | <- column 7
           |    prefix | <- column 11
           |        prefix | <- column 15`
        )
      )
    })

    it("nesting", () => {
      const prefix = Doc.hsep([
        Doc.text("prefix"),
        Doc.nesting((l) => Doc.text(`Nested: ${l}`).squareBracketed)
      ])
      const doc = Doc.vsep([0, 4, 8].map((n) => prefix.indent(n)))

      assert.strictEqual(
        doc.prettyDefault,
        String.stripMargin(
          `|prefix [Nested: 0]
           |    prefix [Nested: 4]
           |        prefix [Nested: 8]`
        )
      )
    })

    it("withPageWidth", () => {
      const prefix = Doc.hsep([
        Doc.text("prefix"),
        Doc.pageWidth((pageWidth) => {
          switch (pageWidth._tag) {
            case "AvailablePerLine": {
              const lineWidth = pageWidth.lineWidth
              const ribbonFraction = pageWidth.ribbonFraction
              return Doc.text(`Width: ${lineWidth}, Ribbon Fraction: ${ribbonFraction}`).squareBracketed
            }
            case "Unbounded": {
              return Doc.empty
            }
          }
        })
      ])
      const doc = Doc.vsep([0, 4, 8].map((n) => prefix.indent(n)))

      assert.strictEqual(
        doc.pretty(32),
        String.stripMargin(
          `|prefix [Width: 32, Ribbon Fraction: 1]
           |    prefix [Width: 32, Ribbon Fraction: 1]
           |        prefix [Width: 32, Ribbon Fraction: 1]`
        )
      )
    })

    describe.concurrent("guards", () => {
      it("isFail", () => {
        assert.isTrue(Doc.isFail(Doc.fail))
        assert.isFalse(Doc.isFail(Doc.char("a")))
      })

      it("isEmpty", () => {
        assert.isTrue(Doc.isEmpty(Doc.empty))
        assert.isFalse(Doc.isEmpty(Doc.char("a")))
      })

      it("isChar", () => {
        assert.isTrue(Doc.isChar(Doc.char("a")))
        assert.isFalse(Doc.isChar(Doc.text("foo")))
      })

      it("isText", () => {
        assert.isTrue(Doc.isText(Doc.text("foo")))
        assert.isFalse(Doc.isText(Doc.char("a")))
      })

      it("isLine", () => {
        assert.isTrue(Doc.isLine(Doc.hardLine))
        assert.isFalse(Doc.isLine(Doc.char("a")))
      })

      it("isFlatAlt", () => {
        assert.isTrue(Doc.isFlatAlt(Doc.char("a").flatAlt(Doc.char("b"))))
        assert.isFalse(Doc.isFlatAlt(Doc.char("a")))
      })

      it("isCat", () => {
        assert.isTrue(Doc.isCat(Doc.char("a").cat(Doc.char("b"))))
        assert.isFalse(Doc.isCat(Doc.char("a")))
      })

      it("isNest", () => {
        assert.isTrue(Doc.isNest(Doc.char("a").nest(4)))
        assert.isFalse(Doc.isNest(Doc.char("a")))
      })

      it("isUnion", () => {
        assert.isTrue(Doc.isUnion(Doc.char("a").union(Doc.char("b"))))
        assert.isFalse(Doc.isUnion(Doc.char("a")))
      })

      it("isColumn", () => {
        assert.isTrue(Doc.isColumn(Doc.column(() => Doc.char("a"))))
        assert.isFalse(Doc.isColumn(Doc.char("a")))
      })

      it("isWithPageWidth", () => {
        assert.isTrue(Doc.isWithPageWidth(Doc.pageWidth(() => Doc.char("a"))))
        assert.isFalse(Doc.isWithPageWidth(Doc.char("a")))
      })

      it("isNesting", () => {
        assert.isTrue(Doc.isNesting(Doc.nesting(() => Doc.char("a"))))
        assert.isFalse(Doc.isNesting(Doc.char("a")))
      })

      it("isAnnotated", () => {
        assert.isTrue(Doc.isAnnotated(Doc.char("a").annotate(1)))
        assert.isFalse(Doc.isAnnotated(Doc.char("a")))
      })
    })

    describe.concurrent("concatenation combinators", () => {
      it("concatWith", () => {
        const doc = pipe(
          [Doc.char("a"), Doc.char("b")],
          Doc.concatWith((a, b) => a.catWithSpace(b))
        )

        assert.strictEqual(doc.prettyDefault, "a b")
      })

      it("appendWithSpace", () => {
        const doc = Doc.char("a").catWithSpace(Doc.char("b"))

        assert.strictEqual(doc.prettyDefault, "a b")
      })

      it("appendWithLine", () => {
        const doc = Doc.char("a").catWithLine(Doc.char("b"))

        assert.strictEqual(doc.prettyDefault, "a\nb")
      })

      it("appendWithLineBreak", () => {
        const doc = Doc.char("a").catWithLineBreak(Doc.char("b"))

        assert.strictEqual(doc.prettyDefault, "a\nb")
        assert.strictEqual(doc.group.prettyDefault, "ab")
      })

      it("appendWithSoftLine", () => {
        const doc = Doc.char("a").catWithSoftLine(Doc.char("b"))

        assert.strictEqual(doc.prettyDefault, "a b")
        assert.strictEqual(doc.pretty(1), "a\nb")
      })

      it("appendWithSoftLineBreak", () => {
        const doc = Doc.char("a").catWithSoftLineBreak(Doc.char("b"))

        assert.strictEqual(doc.prettyDefault, "ab")
        assert.strictEqual(doc.pretty(1), "a\nb")
      })
    })

    describe.concurrent("alternative combinators", () => {
      describe.concurrent("group", () => {
        it("should ensure that the `left` document is less wide than the `right`", () => {
          const doc = Doc.text("even wider").flatAlt(Doc.text("too wide")).group

          // If the `right` document does not fit the page, the algorithm falls
          // back to an even wider layout
          assert.strictEqual(doc.pretty(7), "even wider")
        })

        it("should flatten the right document", () => {
          const doc = Doc.char("x").flatAlt(Doc.hcat([Doc.char("y"), Doc.line, Doc.char("y")])).group

          assert.strictEqual(doc.prettyDefault, "y y")
        })

        it("should never render an unflattenable `right` document", () => {
          const doc = Doc.char("x").flatAlt(Doc.hcat([Doc.char("y"), Doc.hardLine, Doc.char("y")])).group

          assert.strictEqual(doc.prettyDefault, "x")
        })
      })
    })

    describe.concurrent("sep combinators", () => {
      it("hsep", () => {
        const doc = Doc.hsep(Doc.words("lorem ipsum dolor sit amet"))

        assert.strictEqual(doc.prettyDefault, "lorem ipsum dolor sit amet")
        assert.strictEqual(doc.pretty(5), "lorem ipsum dolor sit amet")
      })

      it("vsep", () => {
        const doc = Doc.hsep([Doc.text("prefix"), Doc.vsep(Doc.words("text to lay out"))])

        assert.strictEqual(
          doc.prettyDefault,
          String.stripMargin(
            `|prefix text
             |to
             |lay
             |out`
          )
        )
      })

      it("fillSep", () => {
        const doc = Doc.fillSep(Doc.words("lorem ipsum dolor sit amet"))

        assert.strictEqual(doc.prettyDefault, "lorem ipsum dolor sit amet")
        assert.strictEqual(
          doc.pretty(10),
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

        assert.strictEqual(doc.prettyDefault, "prefix text to lay out")
        assert.strictEqual(
          doc.pretty(20),
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

        assert.strictEqual(doc.prettyDefault, "loremipsumdolorsitamet")
      })

      it("vcat", () => {
        const doc = Doc.vcat(Doc.words("lorem ipsum dolor sit amet"))

        assert.strictEqual(
          doc.prettyDefault,
          String.stripMargin(
            `|lorem
             |ipsum
             |dolor
             |sit
             |amet`
          )
        )
      })

      it("fillCat", () => {
        const doc = Doc.fillCat(Doc.words("lorem ipsum dolor sit amet"))

        assert.strictEqual(doc.prettyDefault, "loremipsumdolorsitamet")
        assert.strictEqual(
          doc.pretty(10),
          String.stripMargin(
            `|loremipsum
             |dolorsit
             |amet`
          )
        )
      })

      it("cats", () => {
        const doc = Doc.hsep([Doc.text("Docs:"), Doc.cats(Doc.words("lorem ipsum dolor"))])

        assert.strictEqual(doc.prettyDefault, "Docs: loremipsumdolor")
        assert.strictEqual(
          doc.pretty(10),
          String.stripMargin(
            `|Docs: lorem
             |ipsum
             |dolor`
          )
        )
      })
    })

    describe.concurrent("filler combinators", () => {
      it("fill", () => {
        type Signature = [name: string, type: string]

        const signatures: ReadonlyArray<Signature> = [
          ["empty", "Doc"],
          ["nest", "Int -> Doc -> Doc"],
          ["fillSep", "[Doc] -> Doc"]
        ]

        function prettySignature<A>([name, type]: Signature): Doc<A> {
          return Doc.hsep([Doc.text(name).fill(5), Doc.text("::"), Doc.text(type)])
        }

        const doc = Doc.hsep([
          Doc.text("let"),
          Doc.vcat(signatures.map(prettySignature)).align
        ])

        assert.strictEqual(
          doc.prettyDefault,
          String.stripMargin(
            `|let empty :: Doc
             |    nest  :: Int -> Doc -> Doc
             |    fillSep :: [Doc] -> Doc`
          )
        )
      })

      it("fillBreak", () => {
        type Signature = [name: string, type: string]

        const signatures: ReadonlyArray<Signature> = [
          ["empty", "Doc"],
          ["nest", "Int -> Doc -> Doc"],
          ["fillSep", "[Doc] -> Doc"]
        ]

        function prettySignature<A>([name, type]: Signature): Doc<A> {
          return Doc.hsep([Doc.text(name).fillBreak(5), Doc.text("::"), Doc.text(type)])
        }

        const doc = Doc.hsep([
          Doc.text("let"),
          Doc.vcat(signatures.map(prettySignature)).align
        ])

        assert.strictEqual(
          doc.prettyDefault,
          String.stripMargin(
            `|let empty :: Doc
             |    nest  :: Int -> Doc -> Doc
             |    fillSep
             |          :: [Doc] -> Doc`
          )
        )
      })
    })

    describe.concurrent("alignment combinators", () => {
      it("align", () => {
        const doc = Doc.hsep([
          Doc.text("lorem"),
          Doc.vsep([Doc.text("ipsum"), Doc.text("dolor")]).align
        ])

        assert.strictEqual(
          doc.prettyDefault,
          String.stripMargin(
            `|lorem ipsum
             |      dolor`
          )
        )
      })

      it("hang", () => {
        const doc = Doc.hsep([
          Doc.text("prefix"),
          Doc.reflow("Indenting these words with hang").hang(4)
        ])

        assert.strictEqual(
          doc.pretty(24),
          String.stripMargin(
            `|prefix Indenting these
             |           words with
             |           hang`
          )
        )
      })

      it("indent", () => {
        const doc = Doc.hcat([
          Doc.text("prefix"),
          Doc.reflow("The indent function indents these words!").indent(4)
        ])

        assert.strictEqual(
          doc.pretty(24),
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
          pipe(
            ["1", "20", "300", "4000"].map((n) => n.length === 1 ? Doc.char(n) : Doc.text(n)),
            Doc.encloseSep(
              Doc.lbracket,
              Doc.rbracket,
              Doc.comma
            )
          ).align
        ])

        assert.strictEqual(doc.prettyDefault, "list [1,20,300,4000]")
        assert.strictEqual(
          doc.pretty(10),
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

        assert.strictEqual(doc.prettyDefault, "[1, 20, 300, 4000]")
      })

      it("tupled", () => {
        const doc = Doc.tupled(
          ["1", "20", "300", "4000"].map((n) => n.length === 1 ? Doc.char(n) : Doc.text(n))
        )

        assert.strictEqual(doc.prettyDefault, "(1, 20, 300, 4000)")
      })
    })

    describe.concurrent("reactive/conditional combinators", () => {
      it("width", () => {
        function annotate<A>(self: Doc<A>): Doc<A> {
          return self.squareBracketed.width((w) => Doc.text(` <- width: ${w}`))
        }

        const docs = [
          Doc.text("---"),
          Doc.text("------"),
          Doc.text("---").indent(3),
          Doc.vsep([Doc.text("---"), Doc.text("---").indent(4)])
        ]

        const doc = Doc.vsep(docs.map(annotate)).align

        assert.strictEqual(
          doc.prettyDefault,
          String.stripMargin(
            `|[---] <- width: 5
             |[------] <- width: 8
             |[   ---] <- width: 8
             |[---
             |    ---] <- width: 8`
          )
        )
      })
    })

    describe.concurrent("general combinators", () => {
      it("punctuate", () => {
        const docs = pipe(Doc.words("lorem ipsum dolor sit amet"), Doc.punctuate(Doc.comma))

        assert.strictEqual(Doc.hsep(docs).prettyDefault, "lorem, ipsum, dolor, sit, amet")

        // The separators are put at the end of the entries, which can be better
        // visualzied if the documents are rendered vertically
        assert.strictEqual(
          Doc.vsep(docs).prettyDefault,
          String.stripMargin(
            `|lorem,
             |ipsum,
             |dolor,
             |sit,
             |amet`
          )
        )
      })

      it("surround", () => {
        const doc = pipe(
          Doc.words("@effect-ts printer Core Doc"),
          Doc.concatWith((x, y) => Doc.slash.surround(x, y))
        )

        assert.strictEqual(doc.prettyDefault, "@effect-ts/printer/Core/Doc")
      })

      it("parenthesized", () => {
        const doc = Doc.char("a").parenthesized

        assert.strictEqual(doc.prettyDefault, "(a)")
      })

      it("angled", () => {
        const doc = Doc.char("a").angledBracketed

        assert.strictEqual(doc.prettyDefault, "<a>")
      })

      it("bracketed", () => {
        const doc = Doc.char("a").squareBracketed

        assert.strictEqual(doc.prettyDefault, "[a]")
      })

      it("braced", () => {
        const doc = Doc.char("a").curlyBraced

        assert.strictEqual(doc.prettyDefault, "{a}")
      })

      it("singleQuoted", () => {
        const doc = Doc.char("a").singleQuoted

        assert.strictEqual(doc.prettyDefault, "'a'")
      })

      it("doubleQuoted", () => {
        const doc = Doc.char("a").doubleQuoted

        assert.strictEqual(doc.prettyDefault, "\"a\"")
      })

      it("spaces", () => {
        const doc = Doc.spaces(5).doubleQuoted.squareBracketed

        assert.strictEqual(doc.prettyDefault, "[\"     \"]")
      })

      it("words", () => {
        const doc = Doc.tupled(Doc.words("lorem ipsum dolor"))

        assert.strictEqual(doc.prettyDefault, "(lorem, ipsum, dolor)")
      })

      it("reflow", () => {
        const doc = Doc.reflow(
          "Lorem ipsum dolor sit amet, consectetur adipisicing elit, " +
            "sed do eiusmod tempor incididunt ut labore et dolore magna aliqua."
        )

        assert.strictEqual(
          doc.pretty(32),
          String.stripMargin(
            `|Lorem ipsum dolor sit amet,
             |consectetur adipisicing elit,
             |sed do eiusmod tempor incididunt
             |ut labore et dolore magna
             |aliqua.`
          )
        )
      })
    })

    describe.concurrent("instances", () => {
      it("Semigroup", () => {
        const S = Doc.getSemigroup<never>()
        const doc = pipe(Doc.text("hello"), S.combine(Doc.text("world")))

        assert.strictEqual(doc.prettyDefault, "helloworld")
      })

      it("Monoid", () => {
        const M = Doc.getMonoid<never>()
        const doc = pipe(
          Doc.text("hello"),
          M.combine(M.empty.parenthesized),
          M.combine(Doc.text("world"))
        )

        assert.strictEqual(doc.prettyDefault, "hello()world")
      })
    })

    describe.concurrent("utils", () => {
      it("textSpaces", () => {
        assert.strictEqual(Doc.textSpaces(4), "    ")
      })
    })
  })
})
