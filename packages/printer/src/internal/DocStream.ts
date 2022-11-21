import type * as DS from "@effect/printer/DocStream"
import * as functor from "@fp-ts/core/typeclass/Covariant"
import type * as monoid from "@fp-ts/core/typeclass/Monoid"
import * as Equal from "@fp-ts/data/Equal"
import { pipe } from "@fp-ts/data/Function"
import * as Option from "@fp-ts/data/Option"
import * as SafeEval from "@fp-ts/data/SafeEval"

// -----------------------------------------------------------------------------
// Models
// -----------------------------------------------------------------------------

const DocStreamSymbolKey = "@effect/printer/DocStream"
/** @internal */
export const DocStreamTypeId: DS.TypeId = Symbol.for(DocStreamSymbolKey) as DS.TypeId

function variance<A, B>(_: A): B {
  return _ as unknown as B
}

class FailedStream<A> implements DS.FailedStream<A>, Equal.Equal {
  readonly _tag = "FailedStream"
  readonly _id: DS.TypeId = DocStreamTypeId
  readonly _A: (_: never) => A = variance;
  [Equal.symbolHash](): number {
    return pipe(
      Equal.hash("@effect/printer/DocStream/EmptyStream"),
      Equal.hashCombine(Equal.hash(DocStreamSymbolKey))
    )
  }
  [Equal.symbolEqual](that: unknown): boolean {
    return isDocStream(that) && that._tag === "FailedStream"
  }
}

class EmptyStream<A> implements DS.EmptyStream<A>, Equal.Equal {
  readonly _tag = "EmptyStream"
  readonly _id: DS.TypeId = DocStreamTypeId
  readonly _A: (_: never) => A = variance;
  [Equal.symbolHash](): number {
    return pipe(
      Equal.hash("@effect/printer/DocStream/EmptyStream"),
      Equal.hashCombine(Equal.hash(DocStreamSymbolKey))
    )
  }
  [Equal.symbolEqual](that: unknown): boolean {
    return isDocStream(that) && that._tag === "EmptyStream"
  }
}

class CharStream<A> implements DS.CharStream<A>, Equal.Equal {
  readonly _tag = "CharStream"
  readonly _id: DS.TypeId = DocStreamTypeId
  readonly _A: (_: never) => A = variance
  constructor(
    readonly char: string,
    readonly stream: DocStream<A>
  ) {}
  [Equal.symbolHash](): number {
    return pipe(
      Equal.hash("@effect/printer/DocStream/CharStream"),
      Equal.hashCombine(Equal.hash(this.char)),
      Equal.hashCombine(Equal.hash(this.stream))
    )
  }
  [Equal.symbolEqual](that: unknown): boolean {
    return isDocStream(that) &&
      that._tag === "CharStream" &&
      this.char === that.char &&
      Equal.equals(this.stream, that.stream)
  }
}

class TextStream<A> implements DS.TextStream<A>, Equal.Equal {
  readonly _tag = "TextStream"
  readonly _id: DS.TypeId = DocStreamTypeId
  readonly _A: (_: never) => A = variance
  constructor(
    readonly text: string,
    readonly stream: DocStream<A>
  ) {}
  [Equal.symbolHash](): number {
    return pipe(
      Equal.hash("@effect/printer/DocStream/TextStream"),
      Equal.hashCombine(Equal.hash(this.text)),
      Equal.hashCombine(Equal.hash(this.stream))
    )
  }
  [Equal.symbolEqual](that: unknown): boolean {
    return isDocStream(that) &&
      that._tag === "TextStream" &&
      this.text === that.text &&
      Equal.equals(this.stream, that.stream)
  }
}

class LineStream<A> implements DS.LineStream<A>, Equal.Equal {
  readonly _tag = "LineStream"
  readonly _id: DS.TypeId = DocStreamTypeId
  readonly _A: (_: never) => A = variance
  constructor(
    readonly indentation: number,
    readonly stream: DocStream<A>
  ) {}
  [Equal.symbolHash](): number {
    return pipe(
      Equal.hash("@effect/printer/DocStream/LineStream"),
      Equal.hashCombine(Equal.hash(this.indentation)),
      Equal.hashCombine(Equal.hash(this.stream))
    )
  }
  [Equal.symbolEqual](that: unknown): boolean {
    return isDocStream(that) &&
      that._tag === "LineStream" &&
      this.indentation === that.indentation &&
      Equal.equals(this.stream, that.stream)
  }
}

class PushAnnotationStream<A> implements DS.PushAnnotationStream<A>, Equal.Equal {
  readonly _tag = "PushAnnotationStream"
  readonly _id: DS.TypeId = DocStreamTypeId
  readonly _A: (_: never) => A = variance
  constructor(
    readonly annotation: A,
    readonly stream: DocStream<A>
  ) {}
  [Equal.symbolHash](): number {
    return pipe(
      Equal.hash("@effect/printer/DocStream/PopAnnotationStream"),
      Equal.hashCombine(Equal.hash(this.annotation)),
      Equal.hashCombine(Equal.hash(this.stream))
    )
  }
  [Equal.symbolEqual](that: unknown): boolean {
    return isDocStream(that) &&
      that._tag === "PushAnnotationStream" &&
      Equal.equals(this.annotation, that.annotation) &&
      Equal.equals(this.stream, that.stream)
  }
}

class PopAnnotationStream<A> implements DS.PopAnnotationStream<A>, Equal.Equal {
  readonly _tag = "PopAnnotationStream"
  readonly _id: DS.TypeId = DocStreamTypeId
  readonly _A: (_: never) => A = variance
  constructor(readonly stream: DocStream<A>) {}
  [Equal.symbolHash](): number {
    return pipe(
      Equal.hash("@effect/printer/DocStream/PopAnnotationStream"),
      Equal.hashCombine(Equal.hash(this.stream))
    )
  }
  [Equal.symbolEqual](that: unknown): boolean {
    return isDocStream(that) &&
      that._tag === "PopAnnotationStream" &&
      Equal.equals(this.stream, that.stream)
  }
}

// -----------------------------------------------------------------------------
// Refinements
// -----------------------------------------------------------------------------

/** @internal */
export function isDocStream(u: unknown): u is DocStream<unknown> {
  return typeof u === "object" && u != null && "_id" in u && u["_id"] === DocStreamTypeId
}

/** @internal */
export function isFailedStream<A>(self: DocStream<A>): self is FailedStream<A> {
  return self._tag === "FailedStream"
}

/** @internal */
export function isEmptyStream<A>(self: DocStream<A>): self is EmptyStream<A> {
  return self._tag === "EmptyStream"
}

/** @internal */
export function isCharStream<A>(self: DocStream<A>): self is CharStream<A> {
  return self._tag === "CharStream"
}

/** @internal */
export function isTextStream<A>(self: DocStream<A>): self is TextStream<A> {
  return self._tag === "TextStream"
}

/** @internal */
export function isLineStream<A>(self: DocStream<A>): self is LineStream<A> {
  return self._tag === "LineStream"
}

/** @internal */
export function isPushAnnotationStream<A>(self: DocStream<A>): self is PushAnnotationStream<A> {
  return self._tag === "PushAnnotationStream"
}

/** @internal */
export function isPopAnnotationStream<A>(self: DocStream<A>): self is PopAnnotationStream<A> {
  return self._tag === "PopAnnotationStream"
}

// -----------------------------------------------------------------------------
// Constructors
// -----------------------------------------------------------------------------

/** @internal */
export const failed: DocStream<never> = new FailedStream()

/** @internal */
export const empty: DocStream<never> = new EmptyStream()

/** @internal */
export function char(char: string) {
  return <A>(self: DocStream<A>): DocStream<A> => new CharStream(char, self)
}

/** @internal */
export function text(text: string) {
  return <A>(stream: DocStream<A>): DocStream<A> => new TextStream(text, stream)
}

/** @internal */
export function line(indentation: number) {
  return <A>(stream: DocStream<A>): DocStream<A> => new LineStream(indentation, stream)
}

/** @internal */
export function pushAnnotation<B>(annotation: B) {
  return <A>(stream: DocStream<A>): DocStream<A | B> => new PushAnnotationStream<A | B>(annotation, stream)
}

/** @internal */
export function popAnnotation<A>(stream: DocStream<A>): DocStream<A> {
  return new PopAnnotationStream(stream)
}

// -----------------------------------------------------------------------------
// Annotations
// -----------------------------------------------------------------------------

type AnnotationRemoval = "Remove" | "DontRemove"

const Remove: AnnotationRemoval = "Remove"

const DontRemove: AnnotationRemoval = "DontRemove"

/** @internal */
export function alterAnnotations<A, B>(f: (a: A) => Option.Option<B>) {
  return (self: DocStream<A>): DocStream<B> => SafeEval.execute(alterAnnotationSafe(self, f, []))
}

function alterAnnotationSafe<A, B>(
  self: DocStream<A>,
  f: (a: A) => Option.Option<B>,
  stack: Array<AnnotationRemoval>
): SafeEval.SafeEval<DocStream<B>> {
  switch (self._tag) {
    case "CharStream": {
      return pipe(
        SafeEval.suspend(() => alterAnnotationSafe(self.stream, f, stack)),
        SafeEval.map(char(self.char))
      )
    }
    case "TextStream": {
      return pipe(
        SafeEval.suspend(() => alterAnnotationSafe(self.stream, f, stack)),
        SafeEval.map(text(self.text))
      )
    }
    case "LineStream": {
      return pipe(
        SafeEval.suspend(() => alterAnnotationSafe(self.stream, f, stack)),
        SafeEval.map(line(self.indentation))
      )
    }
    case "PushAnnotationStream": {
      const altered = f(self.annotation)
      if (Option.isSome(altered)) {
        return pipe(
          SafeEval.suspend(() => alterAnnotationSafe(self.stream, f, [DontRemove, ...stack])),
          SafeEval.map(pushAnnotation(altered.value))
        )
      }
      return SafeEval.suspend(() => alterAnnotationSafe(self.stream, f, [Remove, ...stack]))
    }
    case "PopAnnotationStream": {
      if (stack.length === 0) {
        throw new Error("bug, we ended up with an empty stack to pop from!")
      }
      const [head, ...tail] = stack
      if (head === DontRemove) {
        return pipe(
          SafeEval.suspend(() => alterAnnotationSafe(self.stream, f, tail)),
          SafeEval.map(popAnnotation)
        )
      }
      return SafeEval.suspend(() => alterAnnotationSafe(self.stream, f, tail))
    }
    default: {
      return SafeEval.succeed(self as unknown as DocStream<B>)
    }
  }
}

/** @internal */
export function reAnnotate<A, B>(f: (a: A) => B) {
  return (self: DocStream<A>): DocStream<B> => {
    return SafeEval.execute(reAnnotateSafe(self, f))
  }
}

function reAnnotateSafe<A, B>(self: DocStream<A>, f: (a: A) => B): SafeEval.SafeEval<DocStream<B>> {
  switch (self._tag) {
    case "CharStream": {
      return pipe(
        SafeEval.suspend(() => reAnnotateSafe(self.stream, f)),
        SafeEval.map(char(self.char))
      )
    }
    case "TextStream": {
      return pipe(
        SafeEval.suspend(() => reAnnotateSafe(self.stream, f)),
        SafeEval.map(text(self.text))
      )
    }
    case "LineStream": {
      return pipe(
        SafeEval.suspend(() => reAnnotateSafe(self.stream, f)),
        SafeEval.map(line(self.indentation))
      )
    }
    case "PushAnnotationStream": {
      return pipe(
        SafeEval.suspend(() => reAnnotateSafe(self.stream, f)),
        SafeEval.map(pushAnnotation(f(self.annotation)))
      )
    }
    case "PopAnnotationStream": {
      return SafeEval.suspend(() => reAnnotateSafe(self.stream, f))
    }
    default: {
      return SafeEval.succeed(self as unknown as DocStream<B>)
    }
  }
}

/** @internal */
export function unAnnotate<A>(self: DocStream<A>): DocStream<never> {
  return SafeEval.execute(unAnnotateSafe(self))
}

function unAnnotateSafe<A>(self: DocStream<A>): SafeEval.SafeEval<DocStream<never>> {
  switch (self._tag) {
    case "CharStream": {
      return pipe(
        SafeEval.suspend(() => unAnnotateSafe(self.stream)),
        SafeEval.map(char(self.char))
      )
    }
    case "TextStream": {
      return pipe(
        SafeEval.suspend(() => unAnnotateSafe(self.stream)),
        SafeEval.map(text(self.text))
      )
    }
    case "LineStream": {
      return pipe(
        SafeEval.suspend(() => unAnnotateSafe(self.stream)),
        SafeEval.map(line(self.indentation))
      )
    }
    case "PushAnnotationStream":
    case "PopAnnotationStream": {
      return SafeEval.suspend(() => unAnnotateSafe(self.stream))
    }
    default: {
      return SafeEval.succeed(self as unknown as DocStream<never>)
    }
  }
}

// -----------------------------------------------------------------------------
// Folding
// -----------------------------------------------------------------------------

/** @internal */
export function foldMap<A, M>(M: monoid.Monoid<M>, f: (a: A) => M) {
  return (self: DocStream<A>): M => SafeEval.execute(foldMapSafe(self, M, f))
}

function foldMapSafe<A, M>(self: DocStream<A>, M: monoid.Monoid<M>, f: (a: A) => M): SafeEval.SafeEval<M> {
  switch (self._tag) {
    case "CharStream": {
      return SafeEval.suspend(() => foldMapSafe(self.stream, M, f))
    }
    case "TextStream": {
      return SafeEval.suspend(() => foldMapSafe(self.stream, M, f))
    }
    case "LineStream": {
      return SafeEval.suspend(() => foldMapSafe(self.stream, M, f))
    }
    case "PushAnnotationStream": {
      return pipe(
        SafeEval.suspend(() => foldMapSafe(self.stream, M, f)),
        SafeEval.map(M.combine(f(self.annotation)))
      )
    }
    case "PopAnnotationStream": {
      return SafeEval.suspend(() => foldMapSafe(self.stream, M, f))
    }
    default: {
      return SafeEval.succeed(M.empty)
    }
  }
}

/** @internal */
export function match<A, R>(
  patterns: {
    readonly FailedStream: () => R
    readonly EmptyStream: () => R
    readonly CharStream: (char: string, stream: DocStream<A>) => R
    readonly TextStream: (text: string, stream: DocStream<A>) => R
    readonly LineStream: (indentation: number, stream: DocStream<A>) => R
    readonly PushAnnotationStream: (annotation: A, stream: DocStream<A>) => R
    readonly PopAnnotationStream: (stream: DocStream<A>) => R
  }
) {
  return (self: DocStream<A>): R => {
    switch (self._tag) {
      case "FailedStream":
        return patterns.FailedStream()
      case "EmptyStream":
        return patterns.EmptyStream()
      case "CharStream":
        return patterns.CharStream(self.char, self.stream)
      case "TextStream":
        return patterns.TextStream(self.text, self.stream)
      case "LineStream":
        return patterns.LineStream(self.indentation, self.stream)
      case "PushAnnotationStream":
        return patterns.PushAnnotationStream(self.annotation, self.stream)
      case "PopAnnotationStream":
        return patterns.PopAnnotationStream(self.stream)
    }
  }
}

// -----------------------------------------------------------------------------
// Instances
// -----------------------------------------------------------------------------

/** @internal */
export const Functor: functor.Covariant<DocStream.TypeLambda> = functor.make(reAnnotate)
