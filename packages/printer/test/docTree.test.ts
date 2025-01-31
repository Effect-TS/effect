import * as Doc from "@effect/printer/Doc"
import * as DocStream from "@effect/printer/DocStream"
import * as DocTree from "@effect/printer/DocTree"
import * as Layout from "@effect/printer/Layout"
import { describe, expect, it } from "@effect/vitest"
import * as Array from "effect/Array"
import * as Effect from "effect/Effect"
import { pipe } from "effect/Function"
import * as String from "effect/String"

describe.concurrent("DocTree", () => {
  describe.concurrent("constructors", () => {
    it("char", () => {
      const tree = DocTree.treeForm(DocStream.char(DocStream.empty, "a"))
      expect(DocTree.isCharTree(tree)).toBe(true)
    })

    it("text", () => {
      const tree = DocTree.treeForm(DocStream.text(DocStream.empty, "foo"))
      expect(DocTree.isTextTree(tree)).toBe(true)
    })

    it("line", () => {
      const tree = DocTree.treeForm(DocStream.line(DocStream.empty, 1))
      expect(DocTree.isLineTree(tree)).toBe(true)
    })

    it("annotated", () => {
      const tree = DocTree.treeForm(
        pipe(
          DocStream.popAnnotation(DocStream.empty),
          DocStream.char("a"),
          DocStream.pushAnnotation(1)
        )
      )
      expect(DocTree.isAnnotationTree(tree)).toBe(true)
    })

    it("concat", () => {
      const tree = DocTree.treeForm(
        pipe(
          DocStream.char(DocStream.empty, "c"),
          DocStream.char("a")
        )
      )
      expect(DocTree.isConcatTree(tree)).toBe(true)
    })
  })

  describe("parser", () => {
    it("should fail if parsing an empty stream", () => {
      expect(() => {
        DocTree.treeForm(DocStream.empty)
      }).toThrowError(
        new Error(
          "BUG: DocTree.treeForm - failed to convert DocStream to DocTree" +
            " - please report an issue at https://github.com/Effect-TS/printer/issues"
        )
      )
    })

    it("should fail if attempting to parse a failed stream", () => {
      expect(() => {
        DocTree.treeForm(DocStream.failed)
      }).toThrowError(
        new Error(
          "BUG: DocTree.treeForm - found failed doc stream while parsing" +
            " - please report an issue at https://github.com/Effect-TS/printer/issues"
        )
      )
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

      const bold = (doc: Doc.Doc<SimpleHtml>): Doc.Doc<SimpleHtml> => Doc.annotate(doc, { _tag: "Bold" })

      const color = (
        doc: Doc.Doc<SimpleHtml>,
        color: "Red" | "Green" | "Blue"
      ): Doc.Doc<SimpleHtml> => Doc.annotate(doc, { _tag: "Color", color })

      const italicized = (doc: Doc.Doc<SimpleHtml>): Doc.Doc<SimpleHtml> => Doc.annotate(doc, { _tag: "Italicized" })

      const paragraph = (doc: Doc.Doc<SimpleHtml>): Doc.Doc<SimpleHtml> => Doc.annotate(doc, { _tag: "Paragraph" })

      const header = (doc: Doc.Doc<SimpleHtml>, level: number): Doc.Doc<SimpleHtml> =>
        Doc.annotate(doc, { _tag: "Header", level })

      const colorToHex = (color: "Red" | "Green" | "Blue"): string => {
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

      const encloseInTag = (content: string, html: SimpleHtml): string => {
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

      const renderTreeSafe = (
        tree: DocTree.DocTree<SimpleHtml>
      ): Effect.Effect<string> => {
        switch (tree._tag) {
          case "EmptyTree": {
            return Effect.succeed("")
          }
          case "CharTree": {
            return Effect.succeed(tree.char)
          }
          case "TextTree": {
            return Effect.succeed(tree.text)
          }
          case "LineTree": {
            return Effect.succeed("\n" + Doc.textSpaces(tree.indentation))
          }
          case "AnnotationTree": {
            return Effect.map(
              Effect.suspend(() => renderTreeSafe(tree.tree)),
              (content) => encloseInTag(content, tree.annotation)
            )
          }
          case "ConcatTree": {
            if (tree.trees.length === 0) {
              return Effect.succeed("")
            }
            const head = tree.trees[0]
            const tail = tree.trees.slice(1)
            return Array.reduce(
              tail,
              Effect.suspend(() => renderTreeSafe(head)),
              (acc, tree) =>
                Effect.zipWith(
                  acc,
                  Effect.suspend(() => renderTreeSafe(tree)),
                  (left, right) => left + right
                )
            )
          }
        }
      }

      const renderTree = (tree: DocTree.DocTree<SimpleHtml>): string => Effect.runSync(renderTreeSafe(tree))

      const render = (stream: DocStream.DocStream<SimpleHtml>): string => renderTree(DocTree.treeForm(stream))

      const document = Doc.vsep([
        header(Doc.text("Example document"), 1),
        paragraph(
          Doc.hsep([
            Doc.text("This is a"),
            Doc.cat(
              color(Doc.text("paragraph"), "Red"),
              Doc.comma
            )
          ])
        ),
        paragraph(
          Doc.hsep([
            Doc.text("and"),
            Doc.cat(
              bold(Doc.text("this text is bold!")),
              Doc.comma
            )
          ])
        ),
        paragraph(Doc.hsep([Doc.text("and"), italicized(Doc.text("this is italicized!"))]))
      ])

      expect(render(Layout.pretty(document, Layout.defaultOptions))).toBe(String.stripMargin(
        `|<h1>Example document</h1>
         |<p>This is a <span style="color:#f00">paragraph</span>,</p>
         |<p>and <strong>this text is bold!</strong>,</p>
         |<p>and <em>this is italicized!</em></p>`
      ))
    })
  })
})
