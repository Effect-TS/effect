import * as Doc from "@effect/printer/Doc"
import * as Render from "@effect/printer/Render"
import { pipe } from "@fp-ts/data/Function"
import * as ReadonlyArray from "@fp-ts/data/ReadonlyArray"

const prettyTypes = (types: ReadonlyArray<string>): Doc.Doc<never> => {
  const symbolDocuments = pipe(
    types.length - 1,
    ReadonlyArray.makeBy(() => Doc.text("->")),
    ReadonlyArray.prepend(Doc.text("::"))
  )
  const typeDocuments = types.map(Doc.text)
  const documents = pipe(
    symbolDocuments,
    ReadonlyArray.zipWith(typeDocuments, (left, right) => pipe(left, Doc.catWithSpace(right)))
  )
  return pipe(documents, Doc.seps, Doc.align)
}

const prettyDeclaration = (name: string, types: ReadonlyArray<string>): Doc.Doc<never> => {
  return pipe(
    Doc.text(name),
    Doc.catWithSpace(prettyTypes(types))
  )
}

const doc: Doc.Doc<never> = prettyDeclaration("example", ["Int", "Bool", "Char", "IO ()"])

console.log(pipe(doc, Render.pretty(20)))
