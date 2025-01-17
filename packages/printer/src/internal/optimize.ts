import * as Effect from "effect/Effect"
import { dual } from "effect/Function"
import type * as Doc from "../Doc.js"
import type * as Optimize from "../Optimize.js"
import * as InternalDoc from "./doc.js"

/** @internal */
export const optimize = dual<
  (depth: Optimize.Optimize.Depth) => <A>(self: Doc.Doc<A>) => Doc.Doc<A>,
  <A>(self: Doc.Doc<A>, depth: Optimize.Optimize.Depth) => Doc.Doc<A>
>(2, (self, depth) => Effect.runSync(optimizeSafe(self, depth)))

const optimizeSafe = <A>(
  self: Doc.Doc<A>,
  depth: Optimize.Optimize.Depth
): Effect.Effect<Doc.Doc<A>> => {
  const optimize = (self: Doc.Doc<A>): Effect.Effect<Doc.Doc<A>> =>
    Effect.gen(function*() {
      switch (self._tag) {
        case "Fail":
        case "Empty":
        case "Char":
        case "Text":
        case "Line": {
          return self
        }
        case "FlatAlt": {
          const left = yield* optimize(self.left)
          const right = yield* optimize(self.right)
          return InternalDoc.flatAlt(left, right)
        }
        case "Cat": {
          // Empty Documents
          if (InternalDoc.isEmpty(self.left)) {
            return yield* optimize(self.right)
          }
          if (InternalDoc.isEmpty(self.right)) {
            return yield* optimize(self.left)
          }
          // Text Documents
          if (InternalDoc.isChar(self.left) && InternalDoc.isChar(self.right)) {
            return InternalDoc.text(self.left.char + self.right.char)
          }
          if (InternalDoc.isText(self.left) && InternalDoc.isChar(self.right)) {
            return InternalDoc.text(self.left.text + self.right.char)
          }
          if (InternalDoc.isChar(self.left) && InternalDoc.isText(self.right)) {
            return InternalDoc.text(self.left.char + self.right.text)
          }
          if (InternalDoc.isText(self.left) && InternalDoc.isText(self.right)) {
            return InternalDoc.text(self.left.text + self.right.text)
          }
          // Nested Text Documents
          if (
            (
              InternalDoc.isChar(self.left) &&
              InternalDoc.isCat(self.right) &&
              InternalDoc.isChar(self.right.left)
            ) ||
            (
              InternalDoc.isChar(self.left) &&
              InternalDoc.isCat(self.right) &&
              InternalDoc.isText(self.right.left)
            ) ||
            (
              InternalDoc.isText(self.left) &&
              InternalDoc.isCat(self.right) &&
              InternalDoc.isChar(self.right.left)
            ) ||
            (
              InternalDoc.isText(self.left) &&
              InternalDoc.isCat(self.right) &&
              InternalDoc.isText(self.right.left)
            )
          ) {
            const inner = yield* optimize(InternalDoc.cat(self.left, self.right.left))
            return yield* optimize(InternalDoc.cat(inner, self.right.right))
          }
          // Nested Documents
          if (
            (
              InternalDoc.isCat(self.left) &&
              InternalDoc.isChar(self.left.right)
            ) ||
            (
              InternalDoc.isCat(self.left) &&
              InternalDoc.isText(self.left.right)
            )
          ) {
            const inner = yield* optimize(InternalDoc.cat(self.left.right, self.right))
            return yield* optimize(InternalDoc.cat(self.left.left, inner))
          }
          // Otherwise
          const left = yield* optimize(self.left)
          const right = yield* optimize(self.right)
          return InternalDoc.cat(left, right)
        }
        case "Nest": {
          if (self.indent === 0) {
            return yield* optimize(self.doc)
          }
          if (
            InternalDoc.isEmpty(self.doc) ||
            InternalDoc.isChar(self.doc) ||
            InternalDoc.isText(self.doc)
          ) {
            return self.doc
          }
          if (InternalDoc.isNest(self.doc)) {
            const indent = self.indent + self.doc.indent
            return yield* optimize(InternalDoc.nest(self.doc.doc, indent))
          }
          return InternalDoc.nest(yield* optimize(self.doc), self.indent)
        }
        case "Union": {
          const left = yield* optimize(self.left)
          const right = yield* optimize(self.right)
          return InternalDoc.union(left, right)
        }
        case "Column": {
          return depth._tag === "Shallow"
            ? self
            : InternalDoc.column((position) => Effect.runSync(optimizeSafe(self.react(position), depth)))
        }
        case "WithPageWidth": {
          return depth._tag === "Shallow"
            ? self
            : InternalDoc.pageWidth((pageWidth) => Effect.runSync(optimizeSafe(self.react(pageWidth), depth)))
        }
        case "Nesting": {
          return depth._tag === "Shallow"
            ? self
            : InternalDoc.nesting((level) => Effect.runSync(optimizeSafe(self.react(level), depth)))
        }
        case "Annotated": {
          return InternalDoc.annotate(yield* optimize(self.doc), self.annotation)
        }
      }
    })
  return optimize(self)
}
