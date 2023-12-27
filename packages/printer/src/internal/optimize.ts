import * as Effect from "effect/Effect"
import { dual } from "effect/Function"
import type * as Doc from "../Doc.js"
import type * as Optimize from "../Optimize.js"
import * as _doc from "./doc.js"

/** @internal */
export const optimize = dual<
  (depth: Optimize.Optimize.Depth) => <A>(self: Doc.Doc<A>) => Doc.Doc<A>,
  <A>(self: Doc.Doc<A>, depth: Optimize.Optimize.Depth) => Doc.Doc<A>
>(2, (self, depth) => Effect.runSync(optimizeSafe(self, depth)))

const optimizeSafe = <A>(
  self: Doc.Doc<A>,
  depth: Optimize.Optimize.Depth
): Effect.Effect<never, never, Doc.Doc<A>> => {
  switch (self._tag) {
    case "FlatAlt": {
      return Effect.zipWith(
        Effect.suspend(() => optimizeSafe(self.left, depth)),
        Effect.suspend(() => optimizeSafe(self.right, depth)),
        (left, right) => _doc.flatAlt(left, right)
      )
    }
    case "Cat": {
      // Empty documents
      if (_doc.isEmpty(self.left)) {
        return Effect.suspend(() => optimizeSafe(self.right, depth))
      }
      if (_doc.isEmpty(self.right)) {
        return Effect.suspend(() => optimizeSafe(self.left, depth))
      }
      // String documents
      if (_doc.isChar(self.left) && _doc.isChar(self.right)) {
        return Effect.succeed(_doc.text(self.left.char + self.right.char))
      }
      if (_doc.isText(self.left) && _doc.isChar(self.right)) {
        return Effect.succeed(_doc.text(self.left.text + self.right.char))
      }
      if (_doc.isChar(self.left) && _doc.isText(self.right)) {
        return Effect.succeed(_doc.text(self.left.char + self.right.text))
      }
      if (_doc.isText(self.left) && _doc.isText(self.right)) {
        return Effect.succeed(_doc.text(self.left.text + self.right.text))
      }
      // Nested strings
      if (_doc.isChar(self.left) && _doc.isCat(self.right) && _doc.isChar(self.right.left)) {
        const left = self.right.left
        const right = self.right.right
        return Effect.flatMap(
          Effect.suspend(() => optimizeSafe(_doc.cat(self.left, left), depth)),
          (inner) => optimizeSafe(_doc.cat(right, inner), depth)
        )
      }
      if (_doc.isText(self.left) && _doc.isCat(self.right) && _doc.isChar(self.right.left)) {
        const left = self.right.left
        const right = self.right.right
        return Effect.flatMap(
          Effect.suspend(() => optimizeSafe(_doc.cat(self.left, left), depth)),
          (inner) => optimizeSafe(_doc.cat(inner, right), depth)
        )
      }
      if (_doc.isChar(self.left) && _doc.isCat(self.right) && _doc.isText(self.right.left)) {
        const left = self.right.left
        const right = self.right.right
        return Effect.flatMap(
          Effect.suspend(() => optimizeSafe(_doc.cat(self.left, left), depth)),
          (inner) => optimizeSafe(_doc.cat(inner, right), depth)
        )
      }
      if (_doc.isText(self.left) && _doc.isCat(self.right) && _doc.isText(self.right.left)) {
        const left = self.right.left
        const right = self.right.right
        return Effect.flatMap(
          Effect.suspend(() => optimizeSafe(_doc.cat(self.left, left), depth)),
          (inner) => optimizeSafe(_doc.cat(inner, right), depth)
        )
      }
      if (_doc.isCat(self.left) && _doc.isChar(self.left.right)) {
        const left = self.left.left
        const right = self.left.right
        return Effect.flatMap(
          Effect.suspend(() => optimizeSafe(_doc.cat(right, self.right), depth)),
          (inner) => optimizeSafe(_doc.cat(left, inner), depth)
        )
      }
      if (_doc.isCat(self.left) && _doc.isText(self.left.right)) {
        const left = self.left.left
        const right = self.left.right
        return Effect.flatMap(
          Effect.suspend(() => optimizeSafe(_doc.cat(right, self.right), depth)),
          (inner) => optimizeSafe(_doc.cat(left, inner), depth)
        )
      }
      return Effect.zipWith(
        Effect.suspend(() => optimizeSafe(self.left, depth)),
        Effect.suspend(() => optimizeSafe(self.right, depth)),
        (left, right) => _doc.cat(left, right)
      )
    }
    case "Nest": {
      if (_doc.isEmpty(self.doc)) {
        return Effect.succeed(self.doc)
      }
      if (_doc.isChar(self.doc)) {
        return Effect.succeed(self.doc)
      }
      if (_doc.isText(self.doc)) {
        return Effect.succeed(self.doc)
      }
      if (_doc.isNest(self.doc)) {
        const doc = self.doc
        return Effect.suspend(() => optimizeSafe(_doc.nest(doc.doc, self.indent + doc.indent), depth))
      }
      if (self.indent === 0) {
        return Effect.suspend(() => optimizeSafe(self.doc, depth))
      }
      return Effect.map(
        Effect.suspend(() => optimizeSafe(self.doc, depth)),
        (doc) => _doc.nest(doc, self.indent)
      )
    }
    case "Union": {
      return Effect.zipWith(
        Effect.suspend(() => optimizeSafe(self.left, depth)),
        Effect.suspend(() => optimizeSafe(self.right, depth)),
        (left, right) => _doc.union(left, right)
      )
    }
    case "Column": {
      return depth._tag === "Shallow"
        ? Effect.succeed(_doc.column(self.react))
        : Effect.succeed(_doc.column(
          (position) => Effect.runSync(optimizeSafe(self.react(position), depth))
        ))
    }
    case "WithPageWidth": {
      return depth._tag === "Shallow"
        ? Effect.succeed(_doc.pageWidth(self.react))
        : Effect.succeed(_doc.pageWidth(
          (pageWidth) => Effect.runSync(optimizeSafe(self.react(pageWidth), depth))
        ))
    }
    case "Nesting": {
      return depth._tag === "Shallow"
        ? Effect.succeed(_doc.nesting(self.react))
        : Effect.succeed(_doc.nesting(
          (level) => Effect.runSync(optimizeSafe(self.react(level), depth))
        ))
    }
    case "Annotated": {
      return Effect.map(
        Effect.suspend(() => optimizeSafe(self.doc, depth)),
        (doc) => _doc.annotate(doc, self.annotation)
      )
    }
    default:
      return Effect.succeed(self)
  }
}
