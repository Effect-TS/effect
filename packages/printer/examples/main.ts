import * as Doc from "@effect/printer/Doc"
import * as Render from "@effect/printer/Render"
import { pipe } from "effect/Function"
import * as ReadonlyArray from "effect/ReadonlyArray"

const prettyTypes = (types: ReadonlyArray<string>): Doc.Doc<never> => {
  const symbolDocuments = pipe(
    ReadonlyArray.makeBy(types.length - 1, () => Doc.text("->")),
    ReadonlyArray.prepend(Doc.text("::"))
  )
  const typeDocuments = types.map(Doc.text)
  const documents = ReadonlyArray.zipWith(
    symbolDocuments,
    typeDocuments,
    (left, right) => Doc.catWithSpace(left, right)
  )
  return Doc.align(Doc.seps(documents))
}

const prettyDeclaration = (name: string, types: ReadonlyArray<string>): Doc.Doc<never> =>
  Doc.catWithSpace(Doc.text(name), prettyTypes(types))

const doc: Doc.Doc<never> = prettyDeclaration("example", ["Int", "Bool", "Char", "IO ()"])

console.log(Render.pretty(doc, { lineWidth: 20 }))
