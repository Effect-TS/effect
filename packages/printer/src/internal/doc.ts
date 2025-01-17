import * as covariant from "@effect/typeclass/Covariant"
import type * as invariant from "@effect/typeclass/Invariant"
import type * as monoid from "@effect/typeclass/Monoid"
import type * as semigroup from "@effect/typeclass/Semigroup"
import * as Arr from "effect/Array"
import * as Effect from "effect/Effect"
import * as Equal from "effect/Equal"
import { dual, pipe } from "effect/Function"
import * as Hash from "effect/Hash"
import { pipeArguments } from "effect/Pipeable"
import type * as Doc from "../Doc.js"
import type * as Flatten from "../Flatten.js"
import type * as PageWidth from "../PageWidth.js"
import * as InternalFlatten from "./flatten.js"

const DocSymbolKey = "@effect/printer/Doc"

/** @internal */
export const DocTypeId: Doc.DocTypeId = Symbol.for(DocSymbolKey) as Doc.DocTypeId

const protoHash = {
  Fail: (_: Doc.Fail<any>) => Hash.combine(Hash.hash(DocSymbolKey))(Hash.hash("@effect/printer/Doc/Fail")),
  Empty: (_: Doc.Empty<any>) => Hash.combine(Hash.hash(DocSymbolKey))(Hash.hash("@effect/printer/Doc/Empty")),
  Char: (self: Doc.Char<any>) => Hash.combine(Hash.hash(DocSymbolKey))(Hash.string(self.char)),
  Text: (self: Doc.Text<any>) => Hash.combine(Hash.hash(DocSymbolKey))(Hash.string(self.text)),
  Line: (_: Doc.Line<any>) => Hash.combine(Hash.hash(DocSymbolKey))(Hash.hash("@effect/printer/Doc/Line")),
  FlatAlt: (self: Doc.FlatAlt<any>) =>
    Hash.combine(Hash.hash(DocSymbolKey))(
      Hash.combine(Hash.hash(self.left))(Hash.hash(self.right))
    ),
  Cat: (self: Doc.Cat<any>) =>
    Hash.combine(Hash.hash(DocSymbolKey))(
      Hash.combine(Hash.hash(self.left))(Hash.hash(self.right))
    ),
  Nest: (self: Doc.Nest<any>) =>
    Hash.combine(Hash.hash(DocSymbolKey))(
      Hash.combine(Hash.hash(self.indent))(Hash.hash(self.doc))
    ),
  Union: (self: Doc.Union<any>) =>
    Hash.combine(Hash.hash(DocSymbolKey))(
      Hash.combine(Hash.hash(self.left))(Hash.hash(self.right))
    ),
  Column: (self: Doc.Column<any>) => Hash.combine(Hash.hash(DocSymbolKey))(Hash.hash(self.react)),
  WithPageWidth: (self: Doc.WithPageWidth<any>) => Hash.combine(Hash.hash(DocSymbolKey))(Hash.hash(self.react)),
  Nesting: (self: Doc.Nesting<any>) => Hash.combine(Hash.hash(DocSymbolKey))(Hash.hash(self.react)),
  Annotated: (self: Doc.Annotated<any>) =>
    Hash.combine(Hash.hash(DocSymbolKey))(
      Hash.combine(Hash.hash(self.annotation))(Hash.hash(self.doc))
    )
} as const

const protoEqual = {
  Fail: (_: Doc.Fail<any>, that: unknown) => isDoc(that) && that._tag === "Fail",
  Empty: (_: Doc.Empty<any>, that: unknown) => isDoc(that) && that._tag === "Empty",
  Char: (self: Doc.Char<any>, that: unknown) => isDoc(that) && that._tag === "Char" && self.char === that.char,
  Text: (self: Doc.Text<any>, that: unknown) => isDoc(that) && that._tag === "Text" && self.text === that.text,
  Line: (_: Doc.Line<any>, that: unknown) => isDoc(that) && that._tag === "Line",
  FlatAlt: (self: Doc.FlatAlt<any>, that: unknown) =>
    isDoc(that) &&
    that._tag === "FlatAlt" &&
    Equal.equals(that.left)(self.left) &&
    Equal.equals(that.right)(self.right),
  Cat: (self: Doc.Cat<any>, that: unknown) =>
    isDoc(that) &&
    that._tag === "Cat" &&
    Equal.equals(that.left)(self.left) &&
    Equal.equals(that.right)(self.right),
  Nest: (self: Doc.Nest<any>, that: unknown) =>
    isDoc(that) &&
    that._tag === "Nest" &&
    self.indent === that.indent &&
    Equal.equals(that.doc)(self.doc),
  Union: (self: Doc.Union<any>, that: unknown) =>
    isDoc(that) &&
    that._tag === "Union" &&
    Equal.equals(that.left)(self.left) &&
    Equal.equals(that.right)(self.right),
  Column: (self: Doc.Column<any>, that: unknown) =>
    isDoc(that) &&
    that._tag === "Column" &&
    Equal.equals(that.react)(self.react),
  WithPageWidth: (self: Doc.WithPageWidth<any>, that: unknown) =>
    isDoc(that) &&
    that._tag === "WithPageWidth" &&
    Equal.equals(that.react)(self.react),
  Nesting: (self: Doc.Nesting<any>, that: unknown) =>
    isDoc(that) &&
    that._tag === "Nesting" &&
    Equal.equals(that.react)(self.react),
  Annotated: (self: Doc.Annotated<any>, that: unknown) =>
    isDoc(that) &&
    that._tag === "Annotated" &&
    Equal.equals(that.annotation)(self.annotation) &&
    Equal.equals(that.doc)(self.doc)
} as const

const proto = {
  [DocTypeId]: { _A: (_: never) => _ },
  [Hash.symbol](this: Doc.Doc<any>) {
    return Hash.cached(this, protoHash[this._tag](this as any))
  },
  [Equal.symbol](this: Doc.Doc<any>, that: unknown): boolean {
    return protoEqual[this._tag](this as any, that as any)
  },
  pipe() {
    return pipeArguments(this, arguments)
  }
}

// -----------------------------------------------------------------------------
// Refinements
// -----------------------------------------------------------------------------

/** @internal */
export const isDoc = (u: unknown): u is Doc.Doc<unknown> => typeof u === "object" && u != null && DocTypeId in u

/** @internal */
export const isFail = <A>(self: Doc.Doc<A>): self is Doc.Fail<A> => self._tag === "Fail"

/** @internal */
export const isEmpty = <A>(self: Doc.Doc<A>): self is Doc.Empty<A> => self._tag === "Empty"

/** @internal */
export const isChar = <A>(self: Doc.Doc<A>): self is Doc.Char<A> => self._tag === "Char"

/** @internal */
export const isText = <A>(self: Doc.Doc<A>): self is Doc.Text<A> => self._tag === "Text"

/** @internal */
export const isLine = <A>(self: Doc.Doc<A>): self is Doc.Line<A> => self._tag === "Line"

/** @internal */
export const isFlatAlt = <A>(self: Doc.Doc<A>): self is Doc.FlatAlt<A> => self._tag === "FlatAlt"

/** @internal */
export const isCat = <A>(self: Doc.Doc<A>): self is Doc.Cat<A> => self._tag === "Cat"

/** @internal */
export const isNest = <A>(self: Doc.Doc<A>): self is Doc.Nest<A> => self._tag === "Nest"

/** @internal */
export const isUnion = <A>(self: Doc.Doc<A>): self is Doc.Union<A> => self._tag === "Union"

/** @internal */
export const isColumn = <A>(self: Doc.Doc<A>): self is Doc.Column<A> => self._tag === "Column"

/** @internal */
export const isWithPageWidth = <A>(self: Doc.Doc<A>): self is Doc.WithPageWidth<A> => self._tag === "WithPageWidth"

/** @internal */
export const isNesting = <A>(self: Doc.Doc<A>): self is Doc.Nesting<A> => self._tag === "Nesting"

/** @internal */
export const isAnnotated = <A>(self: Doc.Doc<A>): self is Doc.Annotated<A> => self._tag === "Annotated"

// -----------------------------------------------------------------------------
// Primitives
// -----------------------------------------------------------------------------

/** @internal */
export const char = (char: string): Doc.Doc<never> => {
  const op = Object.create(proto)
  op._tag = "Char"
  op.char = char
  return op
}

/** @internal */
export const text = (text: string): Doc.Doc<never> => {
  const op = Object.create(proto)
  op._tag = "Text"
  op.text = text
  return op
}

/** @internal */
export const flatAlt = dual<
  <B>(that: Doc.Doc<B>) => <A>(self: Doc.Doc<A>) => Doc.Doc<A | B>,
  <A, B>(self: Doc.Doc<A>, that: Doc.Doc<B>) => Doc.Doc<A | B>
>(2, (self, that) => {
  const op = Object.create(proto)
  op._tag = "FlatAlt"
  op.left = self
  op.right = that
  return op
})

/** @internal */
export const union = dual<
  <B>(that: Doc.Doc<B>) => <A>(self: Doc.Doc<A>) => Doc.Doc<A | B>,
  <A, B>(self: Doc.Doc<A>, that: Doc.Doc<B>) => Doc.Doc<A | B>
>(2, (self, that) => {
  const op = Object.create(proto)
  op._tag = "Union"
  op.left = self
  op.right = that
  return op
})

/** @internal */
export const cat = dual<
  <B>(that: Doc.Doc<B>) => <A>(self: Doc.Doc<A>) => Doc.Doc<A | B>,
  <A, B>(self: Doc.Doc<A>, that: Doc.Doc<B>) => Doc.Doc<A | B>
>(2, (self, that) => {
  const op = Object.create(proto)
  op._tag = "Cat"
  op.left = self
  op.right = that
  return op
})

/** @internal */
export const empty: Doc.Doc<never> = (() => {
  const op = Object.create(proto)
  op._tag = "Empty"
  return op
})()

/** @internal */
export const fail: Doc.Doc<never> = (() => {
  const op = Object.create(proto)
  op._tag = "Fail"
  return op
})()

/** @internal */
export const hardLine: Doc.Doc<never> = (() => {
  const op = Object.create(proto)
  op._tag = "Line"
  return op
})()

/** @internal */
export const line: Doc.Doc<never> = flatAlt(hardLine, char(" "))

/** @internal */
export const lineBreak: Doc.Doc<never> = flatAlt(hardLine, empty)

/** @internal */
export const softLine: Doc.Doc<never> = union(char(" "), hardLine)

/** @internal */
export const softLineBreak: Doc.Doc<never> = union(empty, hardLine)

/** @internal */
export const backslash: Doc.Doc<never> = char("\\")

/** @internal */
export const colon: Doc.Doc<never> = char(":")

/** @internal */
export const comma: Doc.Doc<never> = char(",")

/** @internal */
export const dot: Doc.Doc<never> = char(".")

/** @internal */
export const dquote: Doc.Doc<never> = char("\"")

/** @internal */
export const equalSign: Doc.Doc<never> = char("=")

/** @internal */
export const langle: Doc.Doc<never> = char("<")

/** @internal */
export const lbrace: Doc.Doc<never> = char("{")

/** @internal */
export const lbracket: Doc.Doc<never> = char("[")

/** @internal */
export const lparen: Doc.Doc<never> = char("(")

/** @internal */
export const rangle: Doc.Doc<never> = char(">")

/** @internal */
export const rbrace: Doc.Doc<never> = char("}")

/** @internal */
export const rbracket: Doc.Doc<never> = char("]")

/** @internal */
export const rparen: Doc.Doc<never> = char(")")

/** @internal */
export const semi: Doc.Doc<never> = char(";")

/** @internal */
export const slash: Doc.Doc<never> = char("/")

/** @internal */
export const squote: Doc.Doc<never> = char("'")

/** @internal */
export const space: Doc.Doc<never> = char(" ")

/** @internal */
export const vbar: Doc.Doc<never> = char("|")

/** @internal */
export const cats = <A>(docs: Iterable<Doc.Doc<A>>): Doc.Doc<A> => group(vcat(docs))

/** @internal */
export const catWithLine = dual<
  <B>(that: Doc.Doc<B>) => <A>(self: Doc.Doc<A>) => Doc.Doc<A | B>,
  <A, B>(self: Doc.Doc<A>, that: Doc.Doc<B>) => Doc.Doc<A | B>
>(2, (self, that) => cat(self, cat(line, that)))

/** @internal */
export const catWithLineBreak = dual<
  <B>(that: Doc.Doc<B>) => <A>(self: Doc.Doc<A>) => Doc.Doc<A | B>,
  <A, B>(self: Doc.Doc<A>, that: Doc.Doc<B>) => Doc.Doc<A | B>
>(2, (self, that) => cat(self, cat(lineBreak, that)))

/** @internal */
export const catWithSoftLine = dual<
  <B>(that: Doc.Doc<B>) => <A>(self: Doc.Doc<A>) => Doc.Doc<A | B>,
  <A, B>(self: Doc.Doc<A>, that: Doc.Doc<B>) => Doc.Doc<A | B>
>(2, (self, that) => cat(self, cat(softLine, that)))

/** @internal */
export const catWithSoftLineBreak = dual<
  <B>(that: Doc.Doc<B>) => <A>(self: Doc.Doc<A>) => Doc.Doc<A | B>,
  <A, B>(self: Doc.Doc<A>, that: Doc.Doc<B>) => Doc.Doc<A | B>
>(2, (self, that) => cat(self, cat(softLineBreak, that)))

/** @internal */
export const catWithSpace = dual<
  <B>(that: Doc.Doc<B>) => <A>(self: Doc.Doc<A>) => Doc.Doc<A | B>,
  <A, B>(self: Doc.Doc<A>, that: Doc.Doc<B>) => Doc.Doc<A | B>
>(2, (self, that) => cat(self, cat(space, that)))

/** @internal */
export const concatWith = dual<
  <A>(
    f: (left: Doc.Doc<A>, right: Doc.Doc<A>) => Doc.Doc<A>
  ) => (docs: Iterable<Doc.Doc<A>>) => Doc.Doc<A>,
  <A>(
    docs: Iterable<Doc.Doc<A>>,
    f: (left: Doc.Doc<A>, right: Doc.Doc<A>) => Doc.Doc<A>
  ) => Doc.Doc<A>
>(2, (docs, f) =>
  Arr.matchRight(Arr.fromIterable(docs), {
    onEmpty: () => empty,
    onNonEmpty: (init, last) => Arr.reduceRight(init, last, (curr, acc) => f(acc, curr))
  }))

/** @internal */
export const vcat = <A>(docs: Iterable<Doc.Doc<A>>): Doc.Doc<A> =>
  concatWith(docs, (left, right) => catWithLineBreak(left, right))

/** @internal */
export const hcat = <A>(docs: Iterable<Doc.Doc<A>>): Doc.Doc<A> => concatWith(docs, (left, right) => cat(left, right))

/** @internal */
export const fillCat = <A>(docs: Iterable<Doc.Doc<A>>): Doc.Doc<A> =>
  concatWith(docs, (left, right) => catWithSoftLineBreak(left, right))

// -----------------------------------------------------------------------------
// Separation
// -----------------------------------------------------------------------------

/** @internal */
export const hsep = <A>(docs: Iterable<Doc.Doc<A>>): Doc.Doc<A> =>
  concatWith(docs, (left, right) => catWithSpace(left, right))

/** @internal */
export const vsep = <A>(docs: Iterable<Doc.Doc<A>>): Doc.Doc<A> =>
  concatWith(docs, (left, right) => catWithLine(left, right))

/** @internal */
export const fillSep = <A>(docs: Iterable<Doc.Doc<A>>): Doc.Doc<A> =>
  concatWith(docs, (left, right) => catWithSoftLine(left, right))

/** @internal */
export const seps = <A>(docs: Iterable<Doc.Doc<A>>): Doc.Doc<A> => group(vsep(docs))

/** @internal */
export const group = <A>(self: Doc.Doc<A>): Doc.Doc<A> => {
  switch (self._tag) {
    case "FlatAlt": {
      const flattened = changesUponFlattening(self.right)
      switch (flattened._tag) {
        case "Flattened": {
          return union(flattened.value, self.left)
        }
        case "AlreadyFlat": {
          return union(self.right, self.left)
        }
        case "NeverFlat": {
          return self.left
        }
      }
    }
    case "Union": {
      return self
    }
    default: {
      const flattened = changesUponFlattening(self)
      return InternalFlatten.isFlattened(flattened) ? union(flattened.value, self) : self
    }
  }
}

// -----------------------------------------------------------------------------
// Reactive Layouts
// -----------------------------------------------------------------------------

/** @internal */
export const column = <A>(react: (position: number) => Doc.Doc<A>): Doc.Doc<A> => {
  const op = Object.create(proto)
  op._tag = "Column"
  op.react = react
  return op
}

/** @internal */
export const nesting = <A>(react: (level: number) => Doc.Doc<A>): Doc.Doc<A> => {
  const op = Object.create(proto)
  op._tag = "Nesting"
  op.react = react
  return op
}

/** @internal */
export const width = dual<
  <A, B>(react: (width: number) => Doc.Doc<B>) => (self: Doc.Doc<A>) => Doc.Doc<A | B>,
  <A, B>(self: Doc.Doc<A>, react: (width: number) => Doc.Doc<B>) => Doc.Doc<A | B>
>(2, (self, react) => column((colStart) => cat(self, column((colEnd) => react(colEnd - colStart)))))

/** @internal */
export const pageWidth = <A>(react: (pageWidth: PageWidth.PageWidth) => Doc.Doc<A>): Doc.Doc<A> => {
  const op = Object.create(proto)
  op._tag = "WithPageWidth"
  op.react = react
  return op
}

// -----------------------------------------------------------------------------
// Alignment
// -----------------------------------------------------------------------------

/** @internal */
export const nest = dual<
  (indent: number) => <A>(self: Doc.Doc<A>) => Doc.Doc<A>,
  <A>(self: Doc.Doc<A>, indent: number) => Doc.Doc<A>
>(2, (self, indent) =>
  indent === 0 ? self : (() => {
    const op = Object.create(proto)
    op._tag = "Nest"
    op.indent = indent
    op.doc = self
    return op
  })())

/** @internal */
export const align = <A>(self: Doc.Doc<A>): Doc.Doc<A> =>
  column((position) => nesting((level) => nest(self, position - level)))

/** @internal */
export const hang = dual<
  (indent: number) => <A>(self: Doc.Doc<A>) => Doc.Doc<A>,
  <A>(self: Doc.Doc<A>, indent: number) => Doc.Doc<A>
>(2, (self, indent) => align(nest(self, indent)))

/** @internal */
export const indent = dual<
  (indent: number) => <A>(self: Doc.Doc<A>) => Doc.Doc<A>,
  <A>(self: Doc.Doc<A>, indent: number) => Doc.Doc<A>
>(2, (self, indent) => hang(cat(spaces(indent), self), indent))

/** @internal */
export const encloseSep = dual<
  <A, B, C>(
    left: Doc.Doc<A>,
    right: Doc.Doc<B>,
    sep: Doc.Doc<C>
  ) => <D>(
    docs: Iterable<Doc.Doc<D>>
  ) => Doc.Doc<A | B | C | D>,
  <A, B, C, D>(
    docs: Iterable<Doc.Doc<D>>,
    left: Doc.Doc<A>,
    right: Doc.Doc<B>,
    sep: Doc.Doc<C>
  ) => Doc.Doc<A | B | C | D>
>(4, <A, B, C, D>(
  docs: Iterable<Doc.Doc<D>>,
  left: Doc.Doc<A>,
  right: Doc.Doc<B>,
  sep: Doc.Doc<C>
) => {
  const documents = Arr.fromIterable(docs)
  if (Arr.isEmptyReadonlyArray(documents)) {
    return cat(left, right)
  }
  if (documents.length === 1) {
    return cat(left, cat(documents[0]!, right))
  }
  const xs = pipe(
    Arr.makeBy(documents.length - 1, () => sep),
    Arr.prepend(left),
    Arr.zipWith(documents, (left: Doc.Doc<A | C>, right) => cat(left, right))
  )
  return cat(cats(xs), right)
})

/** @internal */
export const list = <A>(docs: Iterable<Doc.Doc<A>>): Doc.Doc<A> =>
  group(
    encloseSep(
      docs,
      flatAlt(text("[ "), lbracket),
      flatAlt(text(" ]"), rbracket),
      text(", ")
    )
  )

/** @internal */
export const tupled = <A>(docs: Iterable<Doc.Doc<A>>): Doc.Doc<A> =>
  group(
    encloseSep(
      docs,
      flatAlt(text("( "), lparen),
      flatAlt(text(" )"), rparen),
      text(", ")
    )
  )

// -----------------------------------------------------------------------------
// Filling
// -----------------------------------------------------------------------------

/** @internal */
export const fill = dual<
  (w: number) => <A>(self: Doc.Doc<A>) => Doc.Doc<A>,
  <A>(self: Doc.Doc<A>, w: number) => Doc.Doc<A>
>(2, (self, w) => width(self, (i) => spaces(w - i)))

/** @internal */
export const fillBreak = dual<
  (w: number) => <A>(self: Doc.Doc<A>) => Doc.Doc<A>,
  <A>(self: Doc.Doc<A>, w: number) => Doc.Doc<A>
>(2, (self, w) =>
  width(self, (i) => (i > w ?
    nest(lineBreak, w) :
    spaces(w - i))))

// -----------------------------------------------------------------------------
// Flattening
// -----------------------------------------------------------------------------

/** @internal */
export const flatten = <A>(self: Doc.Doc<A>): Doc.Doc<A> => Effect.runSync(flattenSafe(self))

const flattenSafe = <A>(self: Doc.Doc<A>): Effect.Effect<Doc.Doc<A>> =>
  Effect.gen(function*() {
    switch (self._tag) {
      case "Fail": {
        return self
      }
      case "Empty": {
        return self
      }
      case "Char": {
        return self
      }
      case "Text": {
        return self
      }
      case "Line": {
        return fail
      }
      case "FlatAlt": {
        return yield* flattenSafe(self.right)
      }
      case "Cat": {
        const left = yield* flattenSafe(self.left)
        const right = yield* flattenSafe(self.right)
        return cat(left, right)
      }
      case "Nest": {
        const doc = yield* flattenSafe(self.doc)
        return nest(doc, self.indent)
      }
      case "Union": {
        return yield* flattenSafe(self.left)
      }
      case "Column": {
        return column((position) => flatten(self.react(position)))
      }
      case "WithPageWidth": {
        return pageWidth((pageWidth) => flatten(self.react(pageWidth)))
      }
      case "Nesting": {
        return nesting((level) => flatten(self.react(level)))
      }
      case "Annotated": {
        const doc = yield* flattenSafe(self.doc)
        return annotate(doc, self.annotation)
      }
    }
  })

/** @internal */
export const changesUponFlattening = <A>(self: Doc.Doc<A>): Flatten.Flatten<Doc.Doc<A>> =>
  Effect.runSync(changesUponFlatteningSafe(self))

const changesUponFlatteningSafe = <A>(self: Doc.Doc<A>): Effect.Effect<Flatten.Flatten<Doc.Doc<A>>> =>
  Effect.gen(function*() {
    switch (self._tag) {
      case "Fail":
      case "Line": {
        return InternalFlatten.neverFlat
      }
      case "Empty":
      case "Char":
      case "Text": {
        return InternalFlatten.alreadyFlat
      }
      case "FlatAlt": {
        const doc = yield* flattenSafe(self.right)
        return InternalFlatten.flattened(doc)
      }
      case "Cat": {
        const left = yield* changesUponFlatteningSafe(self.left)
        const right = yield* changesUponFlatteningSafe(self.right)
        if (InternalFlatten.isNeverFlat(left) || InternalFlatten.isNeverFlat(right)) {
          return InternalFlatten.neverFlat
        }
        if (InternalFlatten.isFlattened(left) && InternalFlatten.isFlattened(right)) {
          return InternalFlatten.flattened(cat(left.value, right.value))
        }
        if (InternalFlatten.isFlattened(left) && InternalFlatten.isAlreadyFlat(right)) {
          return InternalFlatten.flattened(cat(left.value, self.right))
        }
        if (InternalFlatten.isAlreadyFlat(left) && InternalFlatten.isFlattened(right)) {
          return InternalFlatten.flattened(cat(self.left, right.value))
        }
        if (InternalFlatten.isAlreadyFlat(left) && InternalFlatten.isAlreadyFlat(right)) {
          return InternalFlatten.alreadyFlat
        }
        throw new Error(
          "[BUG]: Doc.changesUponFlattening - unable to flatten a Cat document " +
            "- please open an issue at https://github.com/IMax153/contentlayer/issues/new"
        )
      }
      case "Nest": {
        return yield* pipe(
          changesUponFlatteningSafe(self.doc),
          Effect.map(InternalFlatten.map((doc) => nest(doc, self.indent)))
        )
      }
      case "Union": {
        return InternalFlatten.flattened(self.left)
      }
      case "Column": {
        const doc = column((position) => Effect.runSync(flattenSafe(self.react(position))))
        return InternalFlatten.flattened(doc)
      }
      case "WithPageWidth": {
        const doc = pageWidth((pageWidth) => Effect.runSync(flattenSafe(self.react(pageWidth))))
        return InternalFlatten.flattened(doc)
      }
      case "Nesting": {
        const doc = nesting((level) => Effect.runSync(flattenSafe(self.react(level))))
        return InternalFlatten.flattened(doc)
      }
      case "Annotated": {
        return yield* pipe(
          changesUponFlatteningSafe(self.doc),
          Effect.map(InternalFlatten.map((doc) => annotate(doc, self.annotation)))
        )
      }
    }
  })

// -----------------------------------------------------------------------------
// Annotations
// -----------------------------------------------------------------------------

/** @internal */
export const annotate = dual<
  <A>(annotation: A) => (self: Doc.Doc<A>) => Doc.Doc<A>,
  <A>(self: Doc.Doc<A>, annotation: A) => Doc.Doc<A>
>(2, (self, annotation) => {
  const op = Object.create(proto)
  op._tag = "Annotated"
  op.doc = self
  op.annotation = annotation
  return op
})

/** @internal */
export const alterAnnotations = dual<
  <A, B>(f: (a: A) => Iterable<B>) => (self: Doc.Doc<A>) => Doc.Doc<B>,
  <A, B>(self: Doc.Doc<A>, f: (a: A) => Iterable<B>) => Doc.Doc<B>
>(2, (self, f) => Effect.runSync(alterAnnotationsSafe(self, f)))

const alterAnnotationsSafe = <A, B>(
  self: Doc.Doc<A>,
  f: (a: A) => Iterable<B>
): Effect.Effect<Doc.Doc<B>> => {
  switch (self._tag) {
    case "Cat": {
      return Effect.zipWith(
        Effect.suspend(() => alterAnnotationsSafe(self.left, f)),
        alterAnnotationsSafe(self.right, f),
        (left, right) => cat(left, right)
      )
    }
    case "FlatAlt": {
      return Effect.zipWith(
        Effect.suspend(() => alterAnnotationsSafe(self.left, f)),
        alterAnnotationsSafe(self.right, f),
        (left, right) => flatAlt(left, right)
      )
    }
    case "Union": {
      return Effect.zipWith(
        Effect.suspend(() => alterAnnotationsSafe(self.left, f)),
        alterAnnotationsSafe(self.right, f),
        (left, right) => union(left, right)
      )
    }
    case "Nest": {
      return Effect.map(
        Effect.suspend(() => alterAnnotationsSafe(self.doc, f)),
        nest(self.indent)
      )
    }
    case "Column": {
      return Effect.succeed(
        column((position) => Effect.runSync(alterAnnotationsSafe(self.react(position), f)))
      )
    }
    case "WithPageWidth": {
      return Effect.succeed(
        pageWidth((pageWidth) => Effect.runSync(alterAnnotationsSafe(self.react(pageWidth), f)))
      )
    }
    case "Nesting": {
      return Effect.succeed(
        nesting((level) => Effect.runSync(alterAnnotationsSafe(self.react(level), f)))
      )
    }
    case "Annotated": {
      return Effect.map(alterAnnotationsSafe(self.doc, f), (doc) =>
        Arr.reduceRight(
          Arr.fromIterable(f(self.annotation)),
          doc,
          (doc, b) => annotate(doc, b)
        ))
    }
    default: {
      return Effect.succeed(self as unknown as Doc.Doc<B>)
    }
  }
}

/** @internal */
export const reAnnotate = dual<
  <A, B>(f: (a: A) => B) => (self: Doc.Doc<A>) => Doc.Doc<B>,
  <A, B>(self: Doc.Doc<A>, f: (a: A) => B) => Doc.Doc<B>
>(2, (self, f) => alterAnnotations(self, (a) => [f(a)]))

/** @internal */
export const unAnnotate = <A>(self: Doc.Doc<A>): Doc.Doc<never> => alterAnnotations(() => [])(self)

// -----------------------------------------------------------------------------
// Instances
// -----------------------------------------------------------------------------

/** @internal */
export const map: {
  <A, B>(f: (a: A) => B): (self: Doc.Doc<A>) => Doc.Doc<B>
  <A, B>(self: Doc.Doc<A>, f: (a: A) => B): Doc.Doc<B>
} = reAnnotate

/** @internal */
export const imap = covariant.imap<Doc.Doc.TypeLambda>(map)

/** @internal */
export const getSemigroup = <A>(): semigroup.Semigroup<Doc.Doc<A>> => ({
  combine: cat,
  combineMany: (self, others) => cat(self, cats(others))
})

/** @internal */
export const getMonoid = <A>(): monoid.Monoid<Doc.Doc<A>> => ({
  empty,
  combine: cat,
  combineMany: (self, others) => cat(self, cats(others)),
  combineAll: cats
})

/** @internal */
export const Covariant: covariant.Covariant<Doc.Doc.TypeLambda> = {
  map,
  imap
}

/** @internal */
export const Invariant: invariant.Invariant<Doc.Doc.TypeLambda> = {
  imap
}

// -----------------------------------------------------------------------------
// Utilities
// -----------------------------------------------------------------------------

/** @internal */
export const string = (str: string): Doc.Doc<never> => {
  return cats(
    str.split("\n").map((s) =>
      s.length === 0
        ? empty
        : s.length === 1
        ? char(s)
        : text(s)
    )
  )
}

/** @internal */
export const surround = dual<
  <A, B, C>(left: Doc.Doc<A>, right: Doc.Doc<B>) => (self: Doc.Doc<C>) => Doc.Doc<A | B | C>,
  <A, B, C>(self: Doc.Doc<C>, left: Doc.Doc<A>, right: Doc.Doc<B>) => Doc.Doc<A | B | C>
>(3, (self, left, right) => cat(left, cat(self, right)))

/** @internal */
export const singleQuoted = <A>(self: Doc.Doc<A>): Doc.Doc<A> => surround(self, squote, squote)

/** @Internal */
export const doubleQuoted = <A>(self: Doc.Doc<A>): Doc.Doc<A> => surround(self, dquote, dquote)

/** @internal */
export const parenthesized = <A>(self: Doc.Doc<A>): Doc.Doc<A> => surround(self, lparen, rparen)

/** @internal */
export const angleBracketed = <A>(self: Doc.Doc<A>): Doc.Doc<A> => surround(self, langle, rangle)

/** @internal */
export const squareBracketed = <A>(self: Doc.Doc<A>): Doc.Doc<A> => surround(self, lbracket, rbracket)

/** @internal */
export const curlyBraced = <A>(self: Doc.Doc<A>): Doc.Doc<A> => surround(self, lbrace, rbrace)

/** @internal */
export const spaces = (n: number): Doc.Doc<never> => {
  if (n <= 0) {
    return empty
  }
  if (n === 1) {
    return char(" ")
  }
  return text(textSpaces(n))
}

/** @internal */
export const words = (str: string, splitChar = " "): ReadonlyArray<Doc.Doc<never>> =>
  str.split(splitChar).map((word) => {
    if (word === "") {
      return empty
    }
    if (word === "\n") {
      return hardLine
    }
    if (word.length === 1) {
      return char(word)
    }
    return text(word)
  })

/** @internal */
export const reflow = (s: string, char = " "): Doc.Doc<never> => fillSep(words(s, char))

/** @internal */
export const punctuate = dual<
  <A, B>(punctuator: Doc.Doc<A>) => (docs: Iterable<Doc.Doc<B>>) => ReadonlyArray<Doc.Doc<A | B>>,
  <A, B>(docs: Iterable<Doc.Doc<B>>, punctuator: Doc.Doc<A>) => ReadonlyArray<Doc.Doc<A | B>>
>(2, (docs, punctuator) => {
  const documents = Arr.fromIterable(docs)
  return Arr.map(documents, (x, i) => documents.length - 1 === i ? x : cat(x, punctuator))
})

/** @internal */
export const match = dual<
  <A, R>(
    patterns: {
      readonly Fail: () => R
      readonly Empty: () => R
      readonly Char: (char: string) => R
      readonly Text: (text: string) => R
      readonly Line: () => R
      readonly FlatAlt: (x: Doc.Doc<A>, y: Doc.Doc<A>) => R
      readonly Cat: (x: Doc.Doc<A>, y: Doc.Doc<A>) => R
      readonly Nest: (indent: number, doc: Doc.Doc<A>) => R
      readonly Union: (x: Doc.Doc<A>, y: Doc.Doc<A>) => R
      readonly Column: (react: (position: number) => Doc.Doc<A>) => R
      readonly WithPageWidth: (react: (pageWidth: PageWidth.PageWidth) => Doc.Doc<A>) => R
      readonly Nesting: (react: (level: number) => Doc.Doc<A>) => R
      readonly Annotated: (annotation: A, doc: Doc.Doc<A>) => R
    }
  ) => (self: Doc.Doc<A>) => R,
  <A, R>(
    self: Doc.Doc<A>,
    patterns: {
      readonly Fail: () => R
      readonly Empty: () => R
      readonly Char: (char: string) => R
      readonly Text: (text: string) => R
      readonly Line: () => R
      readonly FlatAlt: (x: Doc.Doc<A>, y: Doc.Doc<A>) => R
      readonly Cat: (x: Doc.Doc<A>, y: Doc.Doc<A>) => R
      readonly Nest: (indent: number, doc: Doc.Doc<A>) => R
      readonly Union: (x: Doc.Doc<A>, y: Doc.Doc<A>) => R
      readonly Column: (react: (position: number) => Doc.Doc<A>) => R
      readonly WithPageWidth: (react: (pageWidth: PageWidth.PageWidth) => Doc.Doc<A>) => R
      readonly Nesting: (react: (level: number) => Doc.Doc<A>) => R
      readonly Annotated: (annotation: A, doc: Doc.Doc<A>) => R
    }
  ) => R
>(2, (self, patterns) => {
  switch (self._tag) {
    case "Fail": {
      return patterns.Fail()
    }
    case "Empty": {
      return patterns.Empty()
    }
    case "Char": {
      return patterns.Char(self.char)
    }
    case "Text": {
      return patterns.Text(self.text)
    }
    case "Line": {
      return patterns.Line()
    }
    case "FlatAlt": {
      return patterns.FlatAlt(self.left, self.right)
    }
    case "Cat": {
      return patterns.Cat(self.left, self.right)
    }
    case "Nest": {
      return patterns.Nest(self.indent, self.doc)
    }
    case "Union": {
      return patterns.Union(self.left, self.right)
    }
    case "Column": {
      return patterns.Column(self.react)
    }
    case "WithPageWidth": {
      return patterns.WithPageWidth(self.react)
    }
    case "Nesting": {
      return patterns.Nesting(self.react)
    }
    case "Annotated": {
      return patterns.Annotated(self.annotation, self.doc)
    }
  }
})

/** @internal */
export const textSpaces = (n: number): string => {
  let s = ""
  for (let i = 0; i < n; i++) {
    s = s += " "
  }
  return s
}
