import type * as D from "@effect/printer/Doc"
import type * as functor from "@fp-ts/core/Functor"
import type * as monoid from "@fp-ts/core/Monoid"
import type * as semigroup from "@fp-ts/core/Semigroup"
import * as Equal from "@fp-ts/data/Equal"
import { pipe } from "@fp-ts/data/Function"
import * as ReadonlyArray from "@fp-ts/data/ReadonlyArray"
import * as SafeEval from "@fp-ts/data/SafeEval"

// -----------------------------------------------------------------------------
// Models
// -----------------------------------------------------------------------------

const DocSymbolKey = "@effect/printer/Doc"
/** @internal */
export const DocTypeId: D.TypeId = Symbol.for(DocSymbolKey) as D.TypeId

function variance<A, B>(_: A): B {
  return _ as unknown as B
}

class Fail<A> implements D.Fail<A>, Equal.Equal {
  readonly _tag = "Fail"
  readonly _id: D.TypeId = DocTypeId
  readonly _A: (_: never) => A = variance;
  // constructor(readonly id: (_: never) => A) {}
  [Equal.symbolHash](): number {
    return Equal.hashCombine(Equal.hash("@effect/printer/Doc/Fail"))(Equal.hash(DocSymbolKey))
  }
  [Equal.symbolEqual](that: unknown): boolean {
    return isDoc(that) && that._tag === "Fail"
  }
}

class Empty<A> implements D.Empty<A>, Equal.Equal {
  readonly _tag = "Empty"
  readonly _id: D.TypeId = DocTypeId
  readonly _A: (_: never) => A = variance;
  // constructor(readonly id: (_: never) => A) {}
  [Equal.symbolHash](): number {
    return Equal.hashCombine(Equal.hash("@effect/printer/Doc/Empty"))(Equal.hash(DocSymbolKey))
  }
  [Equal.symbolEqual](that: unknown): boolean {
    return isDoc(that) && that._tag === "Empty"
  }
}

class Char<A> implements D.Char<A>, Equal.Equal {
  readonly _tag = "Char"
  readonly _id: D.TypeId = DocTypeId
  readonly _A: (_: never) => A = variance
  constructor(readonly char: string /*, readonly id: (_: never) => A */) {}
  [Equal.symbolHash](): number {
    return Equal.hashCombine(Equal.hash(this.char))(Equal.hash(DocSymbolKey))
  }
  [Equal.symbolEqual](that: unknown): boolean {
    return isDoc(that) && that._tag === "Char" && this.char === that.char
  }
}

class Text<A> implements D.Text<A>, Equal.Equal {
  readonly _tag = "Text"
  readonly _id: D.TypeId = DocTypeId
  readonly _A: (_: never) => A = variance
  constructor(readonly text: string /*, readonly id: (_: never) => A */) {}
  [Equal.symbolHash](): number {
    return Equal.hashCombine(Equal.hash(this.text))(Equal.hash(DocSymbolKey))
  }
  [Equal.symbolEqual](that: unknown): boolean {
    return isDoc(that) && that._tag === "Text" && this.text === that.text
  }
}

class Line<A> implements D.Line<A>, Equal.Equal {
  readonly _tag = "Line"
  readonly _id: D.TypeId = DocTypeId
  readonly _A: (_: never) => A = variance;
  // constructor(readonly id: (_: never) => A) {}
  [Equal.symbolHash](): number {
    return Equal.hashCombine(Equal.hash("@effect/printer/Doc/Line"))(Equal.hash(DocSymbolKey))
  }
  [Equal.symbolEqual](that: unknown): boolean {
    return isDoc(that) && that._tag === "Line"
  }
}

class FlatAlt<A> implements D.FlatAlt<A>, Equal.Equal {
  readonly _tag = "FlatAlt"
  readonly _id: D.TypeId = DocTypeId
  readonly _A: (_: never) => A = variance
  constructor(readonly left: Doc<A>, readonly right: Doc<A>) {}
  [Equal.symbolHash](): number {
    return Equal.hashCombine(Equal.hash(this.right))(Equal.hash(this.left))
  }
  [Equal.symbolEqual](that: unknown): boolean {
    return isDoc(that) &&
      that._tag === "FlatAlt" &&
      Equal.equals(this.left, that.left) &&
      Equal.equals(this.right, that.right)
  }
}

class Cat<A> implements D.Cat<A>, Equal.Equal {
  readonly _tag = "Cat"
  readonly _id: D.TypeId = DocTypeId
  readonly _A: (_: never) => A = variance
  constructor(readonly left: Doc<A>, readonly right: Doc<A>) {}
  [Equal.symbolHash](): number {
    return Equal.hashCombine(Equal.hash(this.right))(Equal.hash(this.left))
  }
  [Equal.symbolEqual](that: unknown): boolean {
    return isDoc(that) &&
      that._tag === "Cat" &&
      Equal.equals(this.left, that.left) &&
      Equal.equals(this.right, that.right)
  }
}

class Nest<A> implements D.Nest<A>, Equal.Equal {
  readonly _tag = "Nest"
  readonly _id: D.TypeId = DocTypeId
  readonly _A: (_: never) => A = variance
  constructor(readonly indent: number, readonly doc: Doc<A>) {}
  [Equal.symbolHash](): number {
    return Equal.hashCombine(Equal.hash(this.doc))(Equal.hash(this.indent))
  }
  [Equal.symbolEqual](that: unknown): boolean {
    return isDoc(that) &&
      that._tag === "Nest" &&
      this.indent === that.indent &&
      Equal.equals(this.doc, that.doc)
  }
}

class Union<A> implements D.Union<A>, Equal.Equal {
  readonly _tag = "Union"
  readonly _id: D.TypeId = DocTypeId
  readonly _A: (_: never) => A = variance
  constructor(readonly left: Doc<A>, readonly right: Doc<A>) {}
  [Equal.symbolHash](): number {
    return Equal.hashCombine(Equal.hash(this.right))(Equal.hash(this.left))
  }
  [Equal.symbolEqual](that: unknown): boolean {
    return isDoc(that) &&
      that._tag === "Union" &&
      Equal.equals(this.left, that.left) &&
      Equal.equals(this.right, that.right)
  }
}

class Column<A> implements D.Column<A>, Equal.Equal {
  readonly _tag = "Column"
  readonly _id: D.TypeId = DocTypeId
  readonly _A: (_: never) => A = variance
  constructor(readonly react: (position: number) => Doc<A>) {}
  [Equal.symbolHash](): number {
    return pipe(
      Equal.hash(DocSymbolKey),
      Equal.hashCombine(Equal.hash("@effect/printer/Doc/Column")),
      Equal.hashCombine(Equal.hash(this.react))
    )
  }
  [Equal.symbolEqual](that: unknown): boolean {
    return isDoc(that) &&
      that._tag === "Column" &&
      Equal.equals(this.react, that.react)
  }
}

class WithPageWidth<A> implements D.WithPageWidth<A>, Equal.Equal {
  readonly _tag = "WithPageWidth"
  readonly _id: D.TypeId = DocTypeId
  readonly _A: (_: never) => A = variance
  constructor(readonly react: (pageWidth: PageWidth) => Doc<A>) {}
  [Equal.symbolHash](): number {
    return pipe(
      Equal.hash(DocSymbolKey),
      Equal.hashCombine(Equal.hash("@effect/printer/Doc/WithPageWidth")),
      Equal.hashCombine(Equal.hash(this.react))
    )
  }
  [Equal.symbolEqual](that: unknown): boolean {
    return isDoc(that) &&
      that._tag === "WithPageWidth" &&
      Equal.equals(this.react, that.react)
  }
}

class Nesting<A> implements D.Nesting<A>, Equal.Equal {
  readonly _tag = "Nesting"
  readonly _id: D.TypeId = DocTypeId
  readonly _A: (_: never) => A = variance
  constructor(readonly react: (level: number) => Doc<A>) {}
  [Equal.symbolHash](): number {
    return pipe(
      Equal.hash(DocSymbolKey),
      Equal.hashCombine(Equal.hash("@effect/printer/Doc/Nesting")),
      Equal.hashCombine(Equal.hash(this.react))
    )
  }
  [Equal.symbolEqual](that: unknown): boolean {
    return isDoc(that) &&
      that._tag === "Nesting" &&
      Equal.equals(this.react, that.react)
  }
}

class Annotated<A> implements D.Annotated<A>, Equal.Equal {
  readonly _tag = "Annotated"
  readonly _id: D.TypeId = DocTypeId
  readonly _A: (_: never) => A = variance
  constructor(readonly annotation: A, readonly doc: Doc<A>) {}
  [Equal.symbolHash](): number {
    return Equal.hashCombine(Equal.hash(this.doc))(Equal.hash(this.annotation))
  }
  [Equal.symbolEqual](that: unknown): boolean {
    return isDoc(that) &&
      that._tag === "Annotated" &&
      Equal.equals(this.annotation, that.annotation) &&
      Equal.equals(this.doc, that.doc)
  }
}

// -----------------------------------------------------------------------------
// Refinements
// -----------------------------------------------------------------------------

/** @internal */
export function isDoc(u: unknown): u is Doc<unknown> {
  return typeof u === "object" && u != null && "_id" in u && u["_id"] === DocTypeId
}

/** @internal */
export function isFail<A>(self: Doc<A>): self is D.Fail<A> {
  return self._tag === "Fail"
}

/** @internal */
export function isEmpty<A>(self: Doc<A>): self is D.Empty<A> {
  return self._tag === "Empty"
}

/** @internal */
export function isChar<A>(self: Doc<A>): self is D.Char<A> {
  return self._tag === "Char"
}

/** @internal */
export function isText<A>(self: Doc<A>): self is D.Text<A> {
  return self._tag === "Text"
}

/** @internal */
export function isLine<A>(self: Doc<A>): self is D.Line<A> {
  return self._tag === "Line"
}

/** @internal */
export function isFlatAlt<A>(self: Doc<A>): self is D.FlatAlt<A> {
  return self._tag === "FlatAlt"
}

/** @internal */
export function isCat<A>(self: Doc<A>): self is D.Cat<A> {
  return self._tag === "Cat"
}

/** @internal */
export function isNest<A>(self: Doc<A>): self is D.Nest<A> {
  return self._tag === "Nest"
}

/** @internal */
export function isUnion<A>(self: Doc<A>): self is D.Union<A> {
  return self._tag === "Union"
}

/** @internal */
export function isColumn<A>(self: Doc<A>): self is D.Column<A> {
  return self._tag === "Column"
}

/** @internal */
export function isWithPageWidth<A>(self: Doc<A>): self is D.WithPageWidth<A> {
  return self._tag === "WithPageWidth"
}

/** @internal */
export function isNesting<A>(self: Doc<A>): self is D.Nesting<A> {
  return self._tag === "Nesting"
}

/** @internal */
export function isAnnotated<A>(self: Doc<A>): self is D.Annotated<A> {
  return self._tag === "Annotated"
}

// -----------------------------------------------------------------------------
// Constructors
// -----------------------------------------------------------------------------

/** @internal */
export function char(char: string): Doc<never> {
  return new Char(char /*, identity */)
}

/** @internal */
export function text(text: string): Doc<never> {
  return new Text(text /*, identity */)
}

/** @internal */
export function string(str: string): Doc<never> {
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

// -----------------------------------------------------------------------------
// Primitives
// -----------------------------------------------------------------------------

/** @internal */
export const empty: Doc<never> = new Empty() /*, identity */

/** @internal */
export const fail: Doc<never> = new Fail() /*, identity */

/** @internal */
export const hardLine: Doc<never> = new Line() /*, identity */

/** @internal */
export const line: Doc<never> = flatAlt(char(" "))(hardLine)

/** @internal */
export const lineBreak: Doc<never> = flatAlt(empty)(hardLine)

/** @internal */
export const softLine: Doc<never> = union(hardLine)(char(" "))

/** @internal */
export const softLineBreak: Doc<never> = union(hardLine)(empty)

/** @internal */
export const backslash: Doc<never> = char("\\")

/** @internal */
export const colon: Doc<never> = char(":")

/** @internal */
export const comma: Doc<never> = char(",")

/** @internal */
export const dot: Doc<never> = char(".")

/** @internal */
export const dquote: Doc<never> = char("\"")

/** @internal */
export const equalSign: Doc<never> = char("=")

/** @internal */
export const langle: Doc<never> = char("<")

/** @internal */
export const lbrace: Doc<never> = char("{")

/** @internal */
export const lbracket: Doc<never> = char("[")

/** @internal */
export const lparen: Doc<never> = char("(")

/** @internal */
export const rangle: Doc<never> = char(">")

/** @internal */
export const rbrace: Doc<never> = char("}")

/** @internal */
export const rbracket: Doc<never> = char("]")

/** @internal */
export const rparen: Doc<never> = char(")")

/** @internal */
export const semi: Doc<never> = char(";")

/** @internal */
export const slash: Doc<never> = char("/")

/** @internal */
export const squote: Doc<never> = char("'")

/** @internal */
export const space: Doc<never> = char(" ")

/** @internal */
export const vbar: Doc<never> = char("|")

// -----------------------------------------------------------------------------
// Concatenation
// -----------------------------------------------------------------------------

/** @internal */
export function cat<B>(that: Doc<B>) {
  return <A>(self: Doc<A>): Doc<A | B> => new Cat<A | B>(self, that)
}

/** @internal */
export function cats<A>(docs: Iterable<Doc<A>>): Doc<A> {
  return group(vcat(docs))
}

/** @internal */
export function catWithLine<B>(that: Doc<B>) {
  return <A>(self: Doc<A>): Doc<A | B> => cat(cat(that)(line))(self)
}

/** @internal */
export function catWithLineBreak<B>(that: Doc<B>) {
  return <A>(self: Doc<A>): Doc<A | B> => cat(cat(that)(lineBreak))(self)
}

/** @internal */
export function catWithSoftLine<B>(that: Doc<B>) {
  return <A>(self: Doc<A>): Doc<A | B> => cat(cat(that)(softLine))(self)
}

/** @internal */
export function catWithSoftLineBreak<B>(that: Doc<B>) {
  return <A>(self: Doc<A>): Doc<A | B> => cat(cat(that)(softLineBreak))(self)
}

/** @internal */
export function catWithSpace<B>(that: Doc<B>) {
  return <A>(self: Doc<A>): Doc<A | B> => cat(cat(that)(space))(self)
}

/** @internal */
export function concatWith<A>(f: (x: Doc<A>, y: Doc<A>) => Doc<A>) {
  return (docs: Iterable<Doc<A>>): Doc<A> => {
    const docs0 = Array.from(docs)
    if (docs0.length === 0) {
      return empty
    }
    const head = docs0[0]!
    const tail = docs0.slice(1)
    return tail.reduce((acc, curr) => f(acc, curr), head)
  }
}

/** @internal */
export function vcat<A>(docs: Iterable<Doc<A>>): Doc<A> {
  return concatWith<A>((a, b) => catWithLineBreak(b)(a))(docs)
}

/** @internal */
export function hcat<A>(docs: Iterable<Doc<A>>): Doc<A> {
  return concatWith<A>((a, b) => cat(b)(a))(docs)
}

/** @internal */
export function fillCat<A>(docs: Iterable<Doc<A>>): Doc<A> {
  return concatWith<A>((a, b) => catWithSoftLineBreak(b)(a))(docs)
}

// -----------------------------------------------------------------------------
// Separation
// -----------------------------------------------------------------------------

/** @internal */
export function hsep<A>(docs: Iterable<Doc<A>>): Doc<A> {
  return concatWith<A>((a, b) => catWithSpace(b)(a))(docs)
}

/** @internal */
export function vsep<A>(docs: Iterable<Doc<A>>): Doc<A> {
  return concatWith<A>((a, b) => catWithLine(b)(a))(docs)
}

/** @internal */
export function fillSep<A>(docs: Iterable<Doc<A>>): Doc<A> {
  return concatWith<A>((a, b) => catWithSoftLine(b)(a))(docs)
}

/** @internal */
export function seps<A>(docs: Iterable<Doc<A>>): Doc<A> {
  return group(vsep(docs))
}

// -----------------------------------------------------------------------------
// Alternative Layouts
// -----------------------------------------------------------------------------

/** @internal */
export function flatAlt<B>(that: Doc<B>) {
  return <A>(self: Doc<A>): Doc<A | B> => new FlatAlt<A | B>(self, that)
}

/** @internal */
export function union<B>(that: Doc<B>) {
  return <A>(self: Doc<A>): Doc<A | B> => new Union<A | B>(self, that)
}

/** @internal */
export function group<A>(self: Doc<A>): Doc<A> {
  switch (self._tag) {
    case "FlatAlt": {
      const flattened = changesUponFlattening(self.right)
      switch (flattened._tag) {
        case "Flattened": {
          return union(self.left)(flattened.value)
        }
        case "AlreadyFlat": {
          return union(self.left)(self.right)
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
      switch (flattened._tag) {
        case "Flattened": {
          return union(self)(flattened.value)
        }
        default: {
          return self
        }
      }
    }
  }
}

// -----------------------------------------------------------------------------
// Reactive Layouts
// -----------------------------------------------------------------------------

/** @internal */
export function column<A>(react: (position: number) => Doc<A>): Doc<A> {
  return new Column(react)
}

/** @internal */
export function nesting<A>(react: (level: number) => Doc<A>): Doc<A> {
  return new Nesting(react)
}

/** @internal */
export function width<A, B>(react: (width: number) => Doc<A>) {
  return (self: Doc<B>): Doc<A | B> => {
    return column((colStart) => cat(column((colEnd) => react(colEnd - colStart)))(self))
  }
}

/** @internal */
export function pageWidth<A>(react: (pageWidth: PageWidth) => Doc<A>): Doc<A> {
  return new WithPageWidth(react)
}

// -----------------------------------------------------------------------------
// Alignment
// -----------------------------------------------------------------------------

/** @internal */
export function nest(indent: number) {
  return <A>(self: Doc<A>): Doc<A> => indent === 0 ? self : new Nest(indent, self)
}

/** @internal */
export function align<A>(self: Doc<A>): Doc<A> {
  return column((position) => nesting((level) => nest(position - level)(self)))
}

/** @internal */
export function hang<A>(indent: number) {
  return (self: Doc<A>): Doc<A> => align(nest(indent)(self))
}

/** @internal */
export function indent<A>(indent: number) {
  return (self: Doc<A>): Doc<A> => hang<A>(indent)(cat(self)(spaces(indent)))
}

/** @internal */
export function encloseSep<A, B, C>(left: Doc<A>, right: Doc<B>, sep: Doc<C>) {
  return <D>(docs: Iterable<Doc<D>>): Doc<A | B | C | D> => {
    const docs0 = ReadonlyArray.fromIterable(docs)
    if (docs0.length === 0) {
      return cat(right)(left)
    }
    if (docs0.length === 1) {
      return cat(cat(right)(docs0[0]!))(left)
    }
    const xs = pipe(
      ReadonlyArray.makeBy(() => sep)(docs0.length - 1),
      ReadonlyArray.prepend(left),
      ReadonlyArray.zipWith<Doc<D>, Doc<A | C>, Doc<A | C | D>>(docs0, (left, right) => cat(right)(left))
    )
    return cat(right)(cats(xs))
  }
}

/** @internal */
export function list<A>(docs: Iterable<Doc<A>>): Doc<A> {
  return group(
    encloseSep(
      flatAlt<A>(lbracket)(text("[ ")),
      flatAlt<A>(rbracket)(text(" ]")),
      text(", ")
    )(docs)
  )
}

/** @internal */
export function tupled<A>(docs: Iterable<Doc<A>>): Doc<A> {
  return group(
    encloseSep(
      flatAlt<A>(lparen)(text("( ")),
      flatAlt<A>(rparen)(text(" )")),
      text(", ")
    )(docs)
  )
}

// -----------------------------------------------------------------------------
// Filling
// -----------------------------------------------------------------------------

/** @internal */
export function fill<A>(w: number) {
  return (self: Doc<A>): Doc<A> => width<A, A>((i) => spaces(w - i))(self)
}

/** @internal */
export function fillBreak<A>(w: number) {
  return (self: Doc<A>): Doc<A> => {
    return width<A, A>((i) => (i > w ?
      nest(w)(lineBreak) :
      spaces(w - i))
    )(self)
  }
}

// -----------------------------------------------------------------------------
// Flattening
// -----------------------------------------------------------------------------

/** @internal */
export function flatten<A>(self: Doc<A>): Doc<A> {
  return SafeEval.execute(flattenSafe(self))
}

function flattenSafe<A>(self: Doc<A>): SafeEval.SafeEval<Doc<A>> {
  switch (self._tag) {
    case "Line":
      return SafeEval.succeed(fail)
    case "Cat":
      return pipe(
        SafeEval.suspend(() => flattenSafe(self.left)),
        SafeEval.zipWith(SafeEval.suspend(() => flattenSafe(self.right)), (a, b) => cat(b)(a))
      )
    case "FlatAlt":
      return SafeEval.suspend(() => flattenSafe(self.right))
    case "Union":
      return SafeEval.suspend(() => flattenSafe(self.left))
    case "Nest":
      return pipe(
        SafeEval.suspend(() => flattenSafe(self.doc)),
        SafeEval.map(nest(self.indent))
      )
    case "Column":
      return SafeEval.succeed(
        column((position) => SafeEval.execute(flattenSafe(self.react(position))))
      )
    case "WithPageWidth":
      return SafeEval.succeed(
        pageWidth((pageWidth) => SafeEval.execute(flattenSafe(self.react(pageWidth))))
      )
    case "Nesting":
      return SafeEval.succeed(
        nesting((level) => SafeEval.execute(flattenSafe(self.react(level))))
      )
    case "Annotated":
      return pipe(
        SafeEval.suspend(() => flattenSafe(self.doc)),
        SafeEval.map(annotate(self.annotation))
      )
    default:
      return SafeEval.succeed(self)
  }
}

/** @internal */
export function changesUponFlattening<A>(self: Doc<A>): Flatten<Doc<A>> {
  return SafeEval.execute(changesUponFlatteningSafe(self))
}

function changesUponFlatteningSafe<A>(self: Doc<A>): SafeEval.SafeEval<Flatten<Doc<A>>> {
  switch (self._tag) {
    case "Fail":
      return SafeEval.succeed(Flatten.NeverFlat)
    case "Line":
      return SafeEval.succeed(Flatten.NeverFlat)
    case "FlatAlt":
      return SafeEval.succeed(Flatten.Flattened(flatten(self.right)))
    case "Cat": {
      return pipe(
        SafeEval.suspend(() => changesUponFlatteningSafe(self.left)),
        SafeEval.zipWith(
          SafeEval.suspend(() => changesUponFlatteningSafe(self.right)),
          (left, right) => {
            if (left.isNeverFlat() || right.isNeverFlat()) {
              return Flatten.NeverFlat
            }
            if (left.isFlattened() && right.isFlattened()) {
              return Flatten.Flattened(cat(right.value)(left.value))
            }
            if (left.isFlattened() && right.isAlreadyFlat()) {
              return Flatten.Flattened(cat(self.right)(left.value))
            }
            if (left.isAlreadyFlat() && right.isFlattened()) {
              return Flatten.Flattened(cat(right.value)(self.left))
            }
            if (left.isAlreadyFlat() && right.isAlreadyFlat()) {
              return Flatten.AlreadyFlat
            }

            throw new Error("bug, it seems we didn't manage a branch")
          }
        )
      )
    }
    case "Nest": {
      return pipe(
        SafeEval.suspend(() => changesUponFlatteningSafe(self.doc)),
        SafeEval.map(Flatten.$.map(nest(self.indent)))
      )
    }
    case "Union":
      return SafeEval.succeed(Flatten.Flattened(self.left))
    case "Column":
      return SafeEval.succeed(Flatten.Flattened(column((position) => flatten(self.react(position)))))
    case "WithPageWidth":
      return SafeEval.succeed(Flatten.Flattened(pageWidth((pageWidth) => flatten(self.react(pageWidth)))))
    case "Nesting":
      return SafeEval.succeed(Flatten.Flattened(nesting((level) => flatten(self.react(level)))))
    case "Annotated": {
      return pipe(
        SafeEval.suspend(() => changesUponFlatteningSafe(self.doc)),
        SafeEval.map(Flatten.$.map(annotate(self.annotation)))
      )
    }
    default: {
      return SafeEval.succeed(Flatten.AlreadyFlat)
    }
  }
}

// -----------------------------------------------------------------------------
// Annotations
// -----------------------------------------------------------------------------

/** @internal */
export function annotate<A>(annotation: A) {
  return <B>(self: Doc<B>): Doc<A | B> => new Annotated<A | B>(annotation, self)
}

/** @internal */
export function alterAnnotations<A, B>(f: (a: A) => Iterable<B>) {
  return (self: Doc<A>): Doc<B> => SafeEval.execute(alterAnnotationsSafe(self, f))
}

function alterAnnotationsSafe<A, B>(self: Doc<A>, f: (a: A) => Iterable<B>): SafeEval.SafeEval<Doc<B>> {
  switch (self._tag) {
    case "Cat": {
      return pipe(
        SafeEval.suspend(() => alterAnnotationsSafe(self.left, f)),
        SafeEval.zipWith(alterAnnotationsSafe(self.right, f), (a, b) => cat(b)(a))
      )
    }
    case "FlatAlt": {
      return pipe(
        SafeEval.suspend(() => alterAnnotationsSafe(self.left, f)),
        SafeEval.zipWith(alterAnnotationsSafe(self.right, f), (a, b) => flatAlt(b)(a))
      )
    }
    case "Union": {
      return pipe(
        SafeEval.suspend(() => alterAnnotationsSafe(self.left, f)),
        SafeEval.zipWith(alterAnnotationsSafe(self.right, f), (a, b) => union(b)(a))
      )
    }
    case "Nest": {
      return pipe(
        SafeEval.suspend(() => alterAnnotationsSafe(self.doc, f)),
        SafeEval.map(nest(self.indent))
      )
    }
    case "Column": {
      return SafeEval.succeed(column((position) => SafeEval.execute(alterAnnotationsSafe(self.react(position), f))))
    }
    case "WithPageWidth": {
      return SafeEval.succeed(
        pageWidth((pageWidth) => SafeEval.execute(alterAnnotationsSafe(self.react(pageWidth), f)))
      )
    }
    case "Nesting": {
      return SafeEval.succeed(nesting((level) => SafeEval.execute(alterAnnotationsSafe(self.react(level), f))))
    }
    case "Annotated": {
      return pipe(
        alterAnnotationsSafe(self.doc, f),
        SafeEval.map((doc) =>
          pipe(
            ReadonlyArray.fromIterable(f(self.annotation)),
            ReadonlyArray.reduceRight(doc, (b, doc) => annotate(b)(doc))
          )
        )
      )
    }
    default: {
      return SafeEval.succeed(self as unknown as Doc<B>)
    }
  }
}

/** @internal */
export function reAnnotate<A, B>(f: (a: A) => B) {
  return (self: Doc<A>): Doc<B> => {
    return alterAnnotations<A, B>((annotation) => [f(annotation)])(self)
  }
}

/** @internal */
export function unAnnotate<A>(self: Doc<A>): Doc<never> {
  return alterAnnotations(() => [])(self)
}

// -----------------------------------------------------------------------------
// Instances
// -----------------------------------------------------------------------------

/** @internal */
export function getSemigroup<A>(): semigroup.Semigroup<Doc<A>> {
  return {
    combine: cat,
    combineMany: (others) => cat(cats(others))
  }
}

/** @internal */
export function getMonoid<A>(): monoid.Monoid<Doc<A>> {
  return {
    empty,
    combine: cat,
    combineMany: (others) => cat(cats(others)),
    combineAll: cats
  }
}

/** @internal */
export const Functor: functor.Functor<Doc.TypeLambda> = {
  map: reAnnotate
}

// -----------------------------------------------------------------------------
// Utilities
// -----------------------------------------------------------------------------

/** @internal */
export function surround<B, C>(left: Doc<B>, right: Doc<C>) {
  return <A>(self: Doc<A>): Doc<A | B | C> => cat(cat(right)(self))(left)
}

/** @internal */
export function singleQuoted<A>(self: Doc<A>): Doc<A> {
  return surround(squote, squote)(self)
}

/** @Internal */
export function doubleQuoted<A>(self: Doc<A>): Doc<A> {
  return surround(dquote, dquote)(self)
}

/** @internal */
export function parenthesized<A>(self: Doc<A>): Doc<A> {
  return surround(lparen, rparen)(self)
}

/** @internal */
export function angleBracketed<A>(self: Doc<A>): Doc<A> {
  return surround(langle, rangle)(self)
}

/** @internal */
export function squareBracketed<A>(self: Doc<A>): Doc<A> {
  return surround(lbracket, rbracket)(self)
}

/** @internal */
export function curlyBraced<A>(self: Doc<A>): Doc<A> {
  return surround(lbrace, rbrace)(self)
}

/** @internal */
export function spaces(n: number): Doc<never> {
  if (n <= 0) {
    return empty
  }
  if (n === 1) {
    return char(" ")
  }
  return text(textSpaces(n))
}

/** @internal */
export function words(s: string, char = " "): ReadonlyArray<Doc<never>> {
  return s.split(char).map(string)
}

/** @internal */
export function reflow(s: string, char = " "): Doc<never> {
  return fillSep(words(s, char))
}

/** @internal */
export function punctuate<A, B>(punctuator: Doc<A>) {
  return (docs: Iterable<Doc<B>>): ReadonlyArray<Doc<A | B>> => {
    const docs0 = ReadonlyArray.fromIterable(docs)
    return pipe(
      docs0,
      ReadonlyArray.mapWithIndex((i, x) => docs0.length - 1 === i ? x : cat(punctuator)(x))
    )
  }
}

/** @internal */
export function match<A, R>(
  patterns: {
    readonly Fail: () => R
    readonly Empty: () => R
    readonly Char: (char: string) => R
    readonly Text: (text: string) => R
    readonly Line: () => R
    readonly FlatAlt: (x: Doc<A>, y: Doc<A>) => R
    readonly Cat: (x: Doc<A>, y: Doc<A>) => R
    readonly Nest: (indent: number, doc: Doc<A>) => R
    readonly Union: (x: Doc<A>, y: Doc<A>) => R
    readonly Column: (react: (position: number) => Doc<A>) => R
    readonly WithPageWidth: (react: (pageWidth: PageWidth) => Doc<A>) => R
    readonly Nesting: (react: (level: number) => Doc<A>) => R
    readonly Annotated: (annotation: A, doc: Doc<A>) => R
  }
) {
  return (self: Doc<A>): R => {
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
  }
}

/** @internal */
export function textSpaces(n: number): string {
  let s = ""
  for (let i = 0; i < n; i++) {
    s = s += " "
  }
  return s
}
