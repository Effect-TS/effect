import * as Doc from "@effect/printer/Doc"
import { pipe } from "effect/Function"
import * as ReadonlyArray from "effect/Array"

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

console.log(Doc.render(doc, {
  style: "pretty",
  options: { lineWidth: 20 }
}))
