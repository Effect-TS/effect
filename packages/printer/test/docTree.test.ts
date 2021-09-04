import { Tagged } from "@effect-ts/core/Case"
import * as A from "@effect-ts/core/Collections/Immutable/Array"
import type { Endomorphism } from "@effect-ts/core/Function"
import * as Identity from "@effect-ts/core/Identity"
import * as IO from "@effect-ts/core/IO"
import { matchTag_ } from "@effect-ts/system/Utils"

import * as Doc from "../src/Core/Doc"
import * as DocStream from "../src/Core/DocStream"
import * as DocTree from "../src/Core/DocTree"
import * as Layout from "../src/Core/Layout"
import * as C from "../src/Terminal/Color"

describe("DocTree", () => {
  describe("constructors", () => {
    it("char", () => {
      expect(DocTree.treeForm(DocStream.char_(DocStream.empty, "a"))).toBeInstanceOf(
        DocTree.CharTree
      )
    })

    it("text", () => {
      expect(DocTree.treeForm(DocStream.text_(DocStream.empty, "foo"))).toBeInstanceOf(
        DocTree.TextTree
      )
    })

    it("line", () => {
      expect(DocTree.treeForm(DocStream.line_(DocStream.empty, 1))).toBeInstanceOf(
        DocTree.LineTree
      )
    })

    it("annotated", () => {
      expect(
        DocTree.treeForm(
          DocStream.pushAnnotation_(
            DocStream.char_(DocStream.popAnnotation(DocStream.empty), "a"),
            undefined
          )
        )
      ).toBeInstanceOf(DocTree.AnnotationTree)
    })

    it("concat", () => {
      expect(
        DocTree.treeForm(DocStream.char_(DocStream.char_(DocStream.empty, "c"), "a"))
      ).toBeInstanceOf(DocTree.ConcatTree)
    })
  })

  describe("parser", () => {
    it("should fail if parsing an empty stream", () => {
      expect(() => {
        DocTree.treeForm(DocStream.empty)
      }).toThrowError("bug, failed to convert DocStream to DocTree!")
    })

    it("should fail if attempting to parse a failed stream", () => {
      expect(() => {
        DocTree.treeForm(DocStream.failed)
      }).toThrowError("bug, found a failed stream while parsing!")
    })
  })

  describe("render", () => {
    it("should render an annotated document in tree-form", () => {
      type SimpleHtml = Bold | Italics | Color | Paragraph | Headline

      class Bold extends Tagged("Bold")<{}> {}
      class Color extends Tagged("Color")<{
        readonly color: C.Red | C.Green | C.Blue
      }> {}
      class Italics extends Tagged("Italics")<{}> {}
      class Paragraph extends Tagged("Paragraph")<{}> {}
      class Headline extends Tagged("Headline")<{}> {}

      const bold: Endomorphism<Doc.Doc<SimpleHtml>> = Doc.annotate(new Bold())

      const italics: Endomorphism<Doc.Doc<SimpleHtml>> = Doc.annotate(new Italics())

      const paragraph: Endomorphism<Doc.Doc<SimpleHtml>> = Doc.annotate(new Paragraph())

      const headline: Endomorphism<Doc.Doc<SimpleHtml>> = Doc.annotate(new Headline())

      function color(
        color: C.Red | C.Green | C.Blue
      ): Endomorphism<Doc.Doc<SimpleHtml>> {
        return Doc.annotate(new Color({ color }))
      }

      function colorToHex(color: C.Red | C.Green | C.Blue): string {
        return matchTag_(color, {
          Red: () => "#f00",
          Green: () => "#0f0",
          Blue: () => "#00f"
        })
      }

      function encloseInTagFor(html: SimpleHtml): Endomorphism<string> {
        return (x) =>
          matchTag_(html, {
            Bold: () => `<strong>${x}</strong>`,
            Italics: () => `<em>${x}</em>`,
            Color: ({ color }) =>
              `<span style="color:${colorToHex(color)}">${x}</span>`,
            Paragraph: () => `<p>${x}</p>`,
            Headline: () => `<h1>${x}</h1>`
          })
      }

      function renderTreeRec(tree: DocTree.DocTree<SimpleHtml>): IO.IO<string> {
        return IO.gen(function* (_) {
          switch (tree._tag) {
            case "EmptyTree":
              return ""
            case "CharTree":
              return tree.char
            case "TextTree":
              return tree.text
            case "LineTree":
              return "\n" + DocTree.textSpaces(tree.indentation)
            case "AnnotationTree":
              return encloseInTagFor(tree.annotation)(
                yield* _(renderTreeRec(tree.tree))
              )
            case "ConcatTree":
              return A.foldMap_(Identity.string)(tree.trees, (t) =>
                IO.run(renderTreeRec(t))
              )
          }
        })
      }

      function renderTree(tree: DocTree.DocTree<SimpleHtml>): string {
        return IO.run(renderTreeRec(tree))
      }

      function render(stream: DocStream.DocStream<SimpleHtml>): string {
        return renderTree(DocTree.treeForm(stream))
      }

      const document = Doc.vsep([
        headline(Doc.text("Example document")),
        paragraph(
          Doc.hsep([
            Doc.text("This is a"),
            Doc.cat_(color(new C.Red())(Doc.text("paragraph")), Doc.comma)
          ])
        ),
        paragraph(
          Doc.hsep([
            Doc.text("and"),
            Doc.cat_(bold(Doc.text("this text is bold!")), Doc.comma)
          ])
        ),
        paragraph(Doc.hsep([Doc.text("and"), italics(Doc.text("this is italicized!"))]))
      ])

      expect(render(Layout.pretty_(Layout.defaultLayoutOptions, document))).toBe(
        `<h1>Example document</h1>
<p>This is a <span style="color:#f00">paragraph</span>,</p>
<p>and <strong>this text is bold!</strong>,</p>
<p>and <em>this is italicized!</em></p>`.trim()
      )
    })
  })
})
