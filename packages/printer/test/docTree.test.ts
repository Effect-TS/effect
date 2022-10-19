import * as Chunk from "@fp-ts/data/Chunk"
import { pipe } from "@fp-ts/data/Function"
import * as SafeEval from "@fp-ts/data/SafeEval"
import * as String from "@fp-ts/data/String"

describe.concurrent("DocTree", () => {
  describe.concurrent("constructors", () => {
    it("char", () => {
      assert.isTrue(DocStream.char("a")(DocStream.empty).treeForm.isCharTree())
    })

    it("text", () => {
      assert.isTrue(DocStream.text("foo")(DocStream.empty).treeForm.isTextTree())
    })

    it("line", () => {
      assert.isTrue(DocStream.line(1)(DocStream.empty).treeForm.isLineTree())
    })

    it("annotated", () => {
      assert.isTrue(
        pipe(
          DocStream.empty,
          DocStream.popAnnotation,
          DocStream.char("a"),
          DocStream.pushAnnotation(undefined)
        ).treeForm.isAnnotationTree()
      )
    })

    it("concat", () => {
      assert.isTrue(
        pipe(
          DocStream.empty,
          DocStream.char("c"),
          DocStream.char("a")
        ).treeForm.isConcatTree()
      )
    })
  })

  describe("parser", () => {
    it("should fail if parsing an empty stream", () => {
      assert.throws(() => {
        console.log(DocStream.empty.treeForm)
        DocStream.empty.treeForm
      })
    })

    it("should fail if attempting to parse a failed stream", () => {
      assert.throws(() => {
        DocStream.failed.treeForm
      })
    })
  })

  describe("render", () => {
    it("should render an annotated document in tree-form", () => {
      type SimpleHtml = Bold | Italicized | Color | Paragraph | Header

      interface Bold {
        readonly _tag: "Bold"
      }

      interface Color {
        readonly _tag: "Color"
        readonly color: "Red" | "Green" | "Blue"
      }

      interface Italicized {
        readonly _tag: "Italicized"
      }

      interface Paragraph {
        readonly _tag: "Paragraph"
      }

      interface Header {
        readonly _tag: "Header"
        readonly level: number
      }

      function bold(doc: Doc<SimpleHtml>): Doc<SimpleHtml> {
        return doc.annotate({ _tag: "Bold" })
      }

      function color(doc: Doc<SimpleHtml>, color: "Red" | "Green" | "Blue"): Doc<SimpleHtml> {
        return doc.annotate({ _tag: "Color", color })
      }

      function italicized(doc: Doc<SimpleHtml>): Doc<SimpleHtml> {
        return doc.annotate({ _tag: "Italicized" })
      }

      function paragraph(doc: Doc<SimpleHtml>): Doc<SimpleHtml> {
        return doc.annotate({ _tag: "Paragraph" })
      }

      function header(doc: Doc<SimpleHtml>, level: number): Doc<SimpleHtml> {
        return doc.annotate({ _tag: "Header", level })
      }

      function colorToHex(color: "Red" | "Green" | "Blue"): string {
        switch (color) {
          case "Red": {
            return "#f00"
          }
          case "Green": {
            return "#0f0"
          }
          case "Blue": {
            return "#00f"
          }
        }
      }

      function encloseInTag(content: string, html: SimpleHtml): string {
        switch (html._tag) {
          case "Bold": {
            return `<strong>${content}</strong>`
          }
          case "Color": {
            return `<span style="color:${colorToHex(html.color)}">${content}</span>`
          }
          case "Italicized": {
            return `<em>${content}</em>`
          }
          case "Paragraph": {
            return `<p>${content}</p>`
          }
          case "Header": {
            return `<h${html.level}>${content}</h${html.level}>`
          }
        }
      }

      function renderTreeSafe(tree: DocTree<SimpleHtml>): SafeEval.SafeEval<string> {
        switch (tree._tag) {
          case "EmptyTree": {
            return SafeEval.succeed("")
          }
          case "CharTree": {
            return SafeEval.succeed(tree.char)
          }
          case "TextTree": {
            return SafeEval.succeed(tree.text)
          }
          case "LineTree": {
            return SafeEval.succeed("\n" + Doc.textSpaces(tree.indentation))
          }
          case "AnnotationTree": {
            return pipe(
              SafeEval.suspend(() => renderTreeSafe(tree.tree)),
              SafeEval.map((content) => encloseInTag(content, tree.annotation))
            )
          }
          case "ConcatTree": {
            if (tree.trees.length === 0) {
              return SafeEval.succeed("")
            }
            const head = Chunk.unsafeHead(tree.trees)
            return pipe(
              tree.trees,
              Chunk.drop(1),
              Chunk.reduce(
                SafeEval.suspend(() => renderTreeSafe(head)),
                (acc, tree) =>
                  pipe(
                    acc,
                    SafeEval.zipWith(SafeEval.suspend(() => renderTreeSafe(tree)), (a, b) => a + b)
                  )
              )
            )
          }
        }
      }

      function renderTree(tree: DocTree<SimpleHtml>): string {
        return SafeEval.execute(renderTreeSafe(tree))
      }

      function render(stream: DocStream<SimpleHtml>): string {
        return renderTree(stream.treeForm)
      }

      const document = Doc.vsep([
        header(Doc.text("Example document"), 1),
        paragraph(
          Doc.hsep([
            Doc.text("This is a"),
            color(Doc.text("paragraph"), "Red").cat(Doc.comma)
          ])
        ),
        paragraph(
          Doc.hsep([
            Doc.text("and"),
            bold(Doc.text("this text is bold!")).cat(Doc.comma)
          ])
        ),
        paragraph(Doc.hsep([Doc.text("and"), italicized(Doc.text("this is italicized!"))]))
      ])

      assert.strictEqual(
        render(document.layoutPretty(Layout.Options.default)),
        String.stripMargin(
          `|<h1>Example document</h1>
           |<p>This is a <span style="color:#f00">paragraph</span>,</p>
           |<p>and <strong>this text is bold!</strong>,</p>
           |<p>and <em>this is italicized!</em></p>`
        )
      )
    })
  })
})
