import { pipe } from "@fp-ts/data/Function"
import * as SafeEval from "@fp-ts/data/SafeEval"

/** @internal */
export function optimize<A>(depth: Optimize.Depth) {
  return (self: Doc<A>): Doc<A> => SafeEval.execute(optimizeSafe(self, depth))
}

function optimizeSafe<A>(self: Doc<A>, depth: Optimize.Depth): SafeEval.SafeEval<Doc<A>> {
  switch (self._tag) {
    case "FlatAlt": {
      return pipe(
        SafeEval.suspend(() => optimizeSafe(self.left, depth)),
        SafeEval.zipWith(
          SafeEval.suspend(() => optimizeSafe(self.right, depth)),
          (a, b) => Doc.flatAlt(b)(a)
        )
      )
    }
    case "Cat": {
      // Empty documents
      if (Doc.isEmpty(self.left)) {
        return SafeEval.suspend(() => optimizeSafe(self.right, depth))
      }
      if (Doc.isEmpty(self.right)) {
        return SafeEval.suspend(() => optimizeSafe(self.left, depth))
      }
      // String documents
      if (Doc.isChar(self.left) && Doc.isChar(self.right)) {
        return SafeEval.succeed(Doc.text(self.left.char + self.right.char))
      }
      if (Doc.isText(self.left) && Doc.isChar(self.right)) {
        return SafeEval.succeed(Doc.text(self.left.text + self.right.char))
      }
      if (Doc.isChar(self.left) && Doc.isText(self.right)) {
        return SafeEval.succeed(Doc.text(self.left.char + self.right.text))
      }
      if (Doc.isText(self.left) && Doc.isText(self.right)) {
        return SafeEval.succeed(Doc.text(self.left.text + self.right.text))
      }
      // Nested strings
      if (Doc.isChar(self.left) && Doc.isCat(self.right) && Doc.isChar(self.right.left)) {
        const left = self.right.left
        const right = self.right.right
        return pipe(
          SafeEval.suspend(() => optimizeSafe(self.left.cat(left), depth)),
          SafeEval.flatMap((inner) => SafeEval.suspend(() => optimizeSafe(right.cat(inner), depth)))
        )
      }
      if (Doc.isText(self.left) && Doc.isCat(self.right) && Doc.isChar(self.right.left)) {
        const left = self.right.left
        const right = self.right.right
        return pipe(
          SafeEval.suspend(() => optimizeSafe(self.left.cat(left), depth)),
          SafeEval.flatMap((inner) => SafeEval.suspend(() => optimizeSafe(inner.cat(right), depth)))
        )
      }
      if (Doc.isChar(self.left) && Doc.isCat(self.right) && Doc.isText(self.right.left)) {
        const left = self.right.left
        const right = self.right.right
        return pipe(
          SafeEval.suspend(() => optimizeSafe(self.left.cat(left), depth)),
          SafeEval.flatMap((inner) => SafeEval.suspend(() => optimizeSafe(inner.cat(right), depth)))
        )
      }
      if (Doc.isText(self.left) && Doc.isCat(self.right) && Doc.isText(self.right.left)) {
        const left = self.right.left
        const right = self.right.right
        return pipe(
          SafeEval.suspend(() => optimizeSafe(self.left.cat(left), depth)),
          SafeEval.flatMap((inner) => SafeEval.suspend(() => optimizeSafe(inner.cat(right), depth)))
        )
      }
      if (Doc.isCat(self.left) && Doc.isChar(self.left.right)) {
        const left = self.left.left
        const right = self.left.right
        return pipe(
          SafeEval.suspend(() => optimizeSafe(right.cat(self.right), depth)),
          SafeEval.flatMap((inner) => SafeEval.suspend(() => optimizeSafe(left.cat(inner), depth)))
        )
      }
      if (Doc.isCat(self.left) && Doc.isText(self.left.right)) {
        const left = self.left.left
        const right = self.left.right
        return pipe(
          SafeEval.suspend(() => optimizeSafe(right.cat(self.right), depth)),
          SafeEval.flatMap((inner) => SafeEval.suspend(() => optimizeSafe(left.cat(inner), depth)))
        )
      }
      return pipe(
        SafeEval.suspend(() => optimizeSafe(self.left, depth)),
        SafeEval.zipWith(
          SafeEval.suspend(() => optimizeSafe(self.right, depth)),
          (a, b) => a.cat(b)
        )
      )
    }
    case "Nest": {
      if (Doc.isEmpty(self.doc)) {
        return SafeEval.succeed(self.doc)
      }
      if (Doc.isChar(self.doc)) {
        return SafeEval.succeed(self.doc)
      }
      if (Doc.isText(self.doc)) {
        return SafeEval.succeed(self.doc)
      }
      if (Doc.isNest(self.doc)) {
        const doc = self.doc
        return SafeEval.suspend(() => optimizeSafe(doc.doc.nest(self.indent + doc.indent), depth))
      }
      if (self.indent === 0) {
        return SafeEval.suspend(() => optimizeSafe(self.doc, depth))
      }
      return pipe(
        SafeEval.suspend(() => optimizeSafe(self.doc, depth)),
        SafeEval.map((doc) => doc.nest(self.indent))
      )
    }
    case "Union": {
      return pipe(
        SafeEval.suspend(() => optimizeSafe(self.left, depth)),
        SafeEval.zipWith(
          SafeEval.suspend(() => optimizeSafe(self.right, depth)),
          (a, b) => a.union(b)
        )
      )
    }
    case "Column": {
      return depth._tag === "Shallow"
        ? SafeEval.succeed(Doc.column(self.react))
        : SafeEval.succeed(
          Doc.column((position) => SafeEval.execute(optimizeSafe(self.react(position), depth)))
        )
    }
    case "WithPageWidth": {
      return depth._tag === "Shallow"
        ? SafeEval.succeed(Doc.pageWidth(self.react))
        : SafeEval.succeed(
          Doc.pageWidth((pageWidth) => SafeEval.execute(optimizeSafe(self.react(pageWidth), depth)))
        )
    }
    case "Nesting": {
      return depth._tag === "Shallow"
        ? SafeEval.succeed(Doc.nesting(self.react))
        : SafeEval.succeed(
          Doc.nesting((level) => SafeEval.execute(optimizeSafe(self.react(level), depth)))
        )
    }
    case "Annotated": {
      return pipe(
        SafeEval.suspend(() => optimizeSafe(self.doc, depth)),
        SafeEval.map((doc) => doc.annotate(self.annotation))
      )
    }
    default:
      return SafeEval.succeed(self)
  }
}
