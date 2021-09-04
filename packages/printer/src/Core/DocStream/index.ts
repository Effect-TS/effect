// tracing: off

import type { Array } from "@effect-ts/core/Collections/Immutable/Array"
import * as A from "@effect-ts/core/Collections/Immutable/Array"
import { identity } from "@effect-ts/core/Function"
import type { Identity } from "@effect-ts/core/Identity"
import * as IO from "@effect-ts/core/IO"
import type { Option } from "@effect-ts/core/Option"
import * as O from "@effect-ts/core/Option"
import type { URI } from "@effect-ts/core/Prelude"
import * as P from "@effect-ts/core/Prelude"

// -------------------------------------------------------------------------------------
// model
// -------------------------------------------------------------------------------------

/**
 * Represents a document that has been laid out and can be processed used
 * by the rendering algorithms.
 *
 * A simplified view is that a `Doc` is equivalent to an array of `DocStream`,
 * and the layout algorithms simply pick a `DocStream` based upon which
 * instance best fits the layout constraints. Therefore, a `DocStream` has all
 * complexity contained in a `Doc` resolved, making it very easy to convert to
 * other formats, such as plaintext or terminal output.
 */
export type DocStream<A> =
  | FailedStream<A>
  | EmptyStream<A>
  | CharStream<A>
  | TextStream<A>
  | LineStream<A>
  | PushAnnotationStream<A>
  | PopAnnotationStream<A>

/**
 * Represents a `Doc` that failed to be laid out.
 */
export class FailedStream<A> {
  readonly _tag = "FailedStream"
  readonly _A!: () => A
  constructor(readonly id: (_: never) => A) {}
}

/**
 * Represents the an empty `Doc`.
 */
export class EmptyStream<A> {
  readonly _tag = "EmptyStream"
  readonly _A!: () => A
  constructor(readonly id: (_: never) => A) {}
}

/**
 * Represents a `Doc` containing a single character.
 */
export class CharStream<A> {
  readonly _tag = "CharStream"
  readonly _A!: () => A
  constructor(readonly char: string, readonly stream: DocStream<A>) {}
}

/**
 * Represents a `Doc` containing a string of text.
 */
export class TextStream<A> {
  readonly _tag = "TextStream"
  readonly _A!: () => A
  constructor(readonly text: string, readonly stream: DocStream<A>) {}
}

/**
 * Represents a `Doc` containing a single line. The `indentation`
 * represents the indentation level for the subsequent line in the
 * `Doc`.
 */
export class LineStream<A> {
  readonly _tag = "LineStream"
  readonly _A!: () => A
  constructor(readonly indentation: number, readonly stream: DocStream<A>) {}
}

/**
 * Represents the addition of an annotation of type `A` to a `Doc`.
 */
export class PushAnnotationStream<A> {
  readonly _tag = "PushAnnotationStream"
  readonly _A!: () => A
  constructor(readonly annotation: A, readonly stream: DocStream<A>) {}
}

/**
 * Represents the removal of a previously pushed annotation from a `Doc`.
 */
export class PopAnnotationStream<A> {
  readonly _tag = "PopAnnotationStream"
  readonly _A!: () => A
  constructor(readonly stream: DocStream<A>) {}
}

// -------------------------------------------------------------------------------------
// constructors
// -------------------------------------------------------------------------------------

export const failed: DocStream<never> = new FailedStream(identity)

export const empty: DocStream<never> = new EmptyStream(identity)

export function char_<A>(stream: DocStream<A>, char: string): DocStream<A> {
  return new CharStream(char, stream)
}

/**
 * @dataFirst char_
 */
export function char(char: string) {
  return <A>(stream: DocStream<A>): DocStream<A> => new CharStream(char, stream)
}

export function text_<A>(stream: DocStream<A>, text: string): DocStream<A> {
  return new TextStream(text, stream)
}

/**
 * @dataFirst text_
 */
export function text(text: string) {
  return <A>(stream: DocStream<A>): DocStream<A> => new TextStream(text, stream)
}

export function line_<A>(stream: DocStream<A>, indentation: number): DocStream<A> {
  return new LineStream(indentation, stream)
}

/**
 * @dataFirst line_
 */
export function line(indentation: number) {
  return <A>(stream: DocStream<A>): DocStream<A> => new LineStream(indentation, stream)
}

export function pushAnnotation_<A, B>(
  stream: DocStream<B>,
  annotation: A
): DocStream<A | B> {
  return new PushAnnotationStream<A | B>(annotation, stream)
}

/**
 * @dataFirst pushAnnotation_
 */
export function pushAnnotation<A>(annotation: A) {
  return <B>(stream: DocStream<B>): DocStream<A | B> =>
    new PushAnnotationStream<A | B>(annotation, stream)
}

export function popAnnotation<A>(stream: DocStream<A>): DocStream<A> {
  return new PopAnnotationStream(stream)
}

// -------------------------------------------------------------------------------------
// destructors
// -------------------------------------------------------------------------------------

export function match_<A, R>(
  stream: DocStream<A>,
  patterns: {
    readonly FailedStream: () => R
    readonly EmptyStream: () => R
    readonly CharStream: (char: string, stream: DocStream<A>) => R
    readonly TextStream: (text: string, stream: DocStream<A>) => R
    readonly LineStream: (indentation: number, stream: DocStream<A>) => R
    readonly PushAnnotationStream: (annotation: A, stream: DocStream<A>) => R
    readonly PopAnnotationStream: (stream: DocStream<A>) => R
  }
): R {
  switch (stream._tag) {
    case "FailedStream":
      return patterns.FailedStream()
    case "EmptyStream":
      return patterns.EmptyStream()
    case "CharStream":
      return patterns.CharStream(stream.char, stream.stream)
    case "TextStream":
      return patterns.TextStream(stream.text, stream.stream)
    case "LineStream":
      return patterns.LineStream(stream.indentation, stream.stream)
    case "PushAnnotationStream":
      return patterns.PushAnnotationStream(stream.annotation, stream.stream)
    case "PopAnnotationStream":
      return patterns.PopAnnotationStream(stream.stream)
  }
}

/**
 * @dataFirst match_
 */
export function match<A, R>(patterns: {
  readonly FailedStream: () => R
  readonly EmptyStream: () => R
  readonly CharStream: (char: string, stream: DocStream<A>) => R
  readonly TextStream: (text: string, stream: DocStream<A>) => R
  readonly LineStream: (indentation: number, stream: DocStream<A>) => R
  readonly PushAnnotationStream: (annotation: A, stream: DocStream<A>) => R
  readonly PopAnnotationStream: (stream: DocStream<A>) => R
}) {
  return (stream: DocStream<A>): R => match_(stream, patterns)
}

// -------------------------------------------------------------------------------------
// operations
// -------------------------------------------------------------------------------------

export function isFailedStream<A>(stream: DocStream<A>): stream is FailedStream<A> {
  return stream._tag === "FailedStream"
}

export function isEmptyStream<A>(stream: DocStream<A>): stream is EmptyStream<A> {
  return stream._tag === "EmptyStream"
}

export function isCharStream<A>(stream: DocStream<A>): stream is CharStream<A> {
  return stream._tag === "CharStream"
}

export function isTextStream<A>(stream: DocStream<A>): stream is TextStream<A> {
  return stream._tag === "TextStream"
}

export function isLineStream<A>(stream: DocStream<A>): stream is LineStream<A> {
  return stream._tag === "LineStream"
}

export function isPushAnnotationStream<A>(
  stream: DocStream<A>
): stream is PushAnnotationStream<A> {
  return stream._tag === "PushAnnotationStream"
}

export function isPopAnnotationStream<A>(
  stream: DocStream<A>
): stream is PopAnnotationStream<A> {
  return stream._tag === "PopAnnotationStream"
}

function reAnnotateRec_<A, B>(x: DocStream<A>, f: (a: A) => B): IO.IO<DocStream<B>> {
  return IO.gen(function* (_) {
    switch (x._tag) {
      case "CharStream":
        return char_(yield* _(reAnnotateRec_(x.stream, f)), x.char)
      case "TextStream":
        return text_(yield* _(reAnnotateRec_(x.stream, f)), x.text)
      case "LineStream":
        return line_(yield* _(reAnnotateRec_(x.stream, f)), x.indentation)
      case "PushAnnotationStream":
        return pushAnnotation_(yield* _(reAnnotateRec_(x.stream, f)), f(x.annotation))
      case "PopAnnotationStream":
        return yield* _(reAnnotateRec_(x.stream, f))
      case "FailedStream":
        return failed
      case "EmptyStream":
        return empty
    }
  })
}

/**
 * Modify the annotations of a document.
 */
export function reAnnotate_<A, B>(stream: DocStream<A>, f: (a: A) => B): DocStream<B> {
  return IO.run(reAnnotateRec_(stream, f))
}

/**
 * @dataFirst reAnnotate_
 */
export function reAnnotate<A, B>(f: (a: A) => B) {
  return (stream: DocStream<A>): DocStream<B> => reAnnotate_(stream, f)
}

function unAnnotateRec<A>(x: DocStream<A>): IO.IO<DocStream<never>> {
  return IO.gen(function* (_) {
    switch (x._tag) {
      case "CharStream":
        return char_(yield* _(unAnnotateRec(x.stream)), x.char)
      case "TextStream":
        return text_(yield* _(unAnnotateRec(x.stream)), x.text)
      case "LineStream":
        return line_(yield* _(unAnnotateRec(x.stream)), x.indentation)
      case "PushAnnotationStream":
        return yield* _(unAnnotateRec(x.stream))
      case "PopAnnotationStream":
        return yield* _(unAnnotateRec(x.stream))
      case "FailedStream":
        return failed
      case "EmptyStream":
        return empty
    }
  })
}

/**
 * Remove all annotations from a document.
 */
export function unAnnotate<A>(stream: DocStream<A>): DocStream<never> {
  return IO.run(unAnnotateRec(stream))
}

type AnnotationRemoval = "Remove" | "DontRemove"

const Remove: AnnotationRemoval = "Remove"

const DontRemove: AnnotationRemoval = "DontRemove"

function alterAnnotationRec_<A, B>(
  f: (a: A) => Option<B>,
  stack: Array<AnnotationRemoval>,
  x: DocStream<A>
): IO.IO<DocStream<B>> {
  return IO.gen(function* (_) {
    switch (x._tag) {
      case "CharStream":
        return char_(yield* _(alterAnnotationRec_(f, stack, x.stream)), x.char)
      case "TextStream":
        return text_(yield* _(alterAnnotationRec_(f, stack, x.stream)), x.text)
      case "LineStream":
        return line_(yield* _(alterAnnotationRec_(f, stack, x.stream)), x.indentation)
      case "PushAnnotationStream": {
        const altered = f(x.annotation)
        if (O.isSome(altered)) {
          return pushAnnotation_(
            yield* _(alterAnnotationRec_(f, A.cons_(stack, DontRemove), x.stream)),
            altered.value
          )
        }
        return yield* _(alterAnnotationRec_(f, A.cons_(stack, Remove), x.stream))
      }
      case "PopAnnotationStream": {
        if (A.isEmpty(stack)) {
          throw new Error("bug, we ended up with an empty stack to pop from!")
        }
        const [head, ...tail] = stack
        if (head === DontRemove) {
          return popAnnotation(yield* _(alterAnnotationRec_(f, tail, x.stream)))
        }
        return yield* _(alterAnnotationRec_(f, tail, x.stream))
      }
      case "FailedStream":
        return failed
      case "EmptyStream":
        return empty
    }
  })
}

/**
 * Changes the annotation of a document to a different annotation, or to
 * none at all.
 */
export function alterAnnotation_<A, B>(
  stream: DocStream<A>,
  f: (a: A) => Option<B>
): DocStream<B> {
  return IO.run(alterAnnotationRec_(f, A.empty, stream))
}

/**
 * @dataFirst alterAnnotation_
 */
export function alterAnnotation<A, B>(f: (a: A) => Option<B>) {
  return (stream: DocStream<A>): DocStream<B> => alterAnnotation_(stream, f)
}

export const map_ = reAnnotate_

/**
 * @dataFirst map_
 */
export const map = reAnnotate

function foldMapRec_<A, I>(I: Identity<I>, f: (a: A) => I, x: DocStream<A>): IO.IO<I> {
  return IO.gen(function* (_) {
    switch (x._tag) {
      case "CharStream":
        return yield* _(foldMapRec_(I, f, x.stream))
      case "TextStream":
        return yield* _(foldMapRec_(I, f, x.stream))
      case "LineStream":
        return yield* _(foldMapRec_(I, f, x.stream))
      case "PushAnnotationStream":
        return I.combine(f(x.annotation), yield* _(foldMapRec_(I, f, x.stream)))
      case "PopAnnotationStream":
        return yield* _(foldMapRec_(I, f, x.stream))
      default:
        return I.identity
    }
  })
}

export function foldMap_<I>(I: Identity<I>) {
  return <A>(fa: DocStream<A>, f: (a: A) => I): I => {
    return IO.run(foldMapRec_(I, f, fa))
  }
}

/**
 * @dataFirst foldMap_
 */
export function foldMap<I>(I: Identity<I>) {
  return <A>(f: (a: A) => I) =>
    (fa: DocStream<A>): I =>
      foldMap_(I)(fa, f)
}

// -------------------------------------------------------------------------------------
// instances
// -------------------------------------------------------------------------------------

export const DocStreamURI = "@effect-ts/printer/DocStream"

export type DocStreamURI = typeof DocStreamURI

declare module "@effect-ts/core/Prelude/HKT" {
  interface URItoKind<FC, TC, K, Q, W, X, I, S, R, E, A> {
    readonly [DocStreamURI]: DocStream<A>
  }
}

export const Covariant = P.instance<P.Covariant<[URI<DocStreamURI>]>>({
  map
})
