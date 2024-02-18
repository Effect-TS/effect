import * as covariant from "@effect/typeclass/Covariant"
import type * as invariant from "@effect/typeclass/Invariant"
import type * as monoid from "@effect/typeclass/Monoid"
import * as Effect from "effect/Effect"
import * as Equal from "effect/Equal"
import { dual, pipe } from "effect/Function"
import * as Hash from "effect/Hash"
import * as List from "effect/List"
import * as Option from "effect/Option"
import type * as DocStream from "../DocStream.js"

// -----------------------------------------------------------------------------
// Models
// -----------------------------------------------------------------------------

const DocStreamSymbolKey = "@effect/printer/DocStream"

/** @internal */
export const DocStreamTypeId: DocStream.DocStreamTypeId = Symbol.for(
  DocStreamSymbolKey
) as DocStream.DocStreamTypeId

const protoHash = {
  FailedStream: (_: DocStream.FailedStream<any>) =>
    pipe(
      Hash.string("@effect/printer/DocStream/FailedStream"),
      Hash.combine(Hash.string(DocStreamSymbolKey))
    ),
  EmptyStream: (_: DocStream.EmptyStream<any>) =>
    pipe(
      Hash.string("@effect/printer/DocStream/EmptyStream"),
      Hash.combine(Hash.string(DocStreamSymbolKey))
    ),
  CharStream: (self: DocStream.CharStream<any>) =>
    pipe(
      Hash.hash("@effect/printer/DocStream/CharStream"),
      Hash.combine(Hash.string(DocStreamSymbolKey)),
      Hash.combine(Hash.string(self.char)),
      Hash.combine(Hash.hash(self.stream))
    ),
  TextStream: (self: DocStream.TextStream<any>) =>
    pipe(
      Hash.string("@effect/printer/DocStream/TextStream"),
      Hash.combine(Hash.string(DocStreamSymbolKey)),
      Hash.combine(Hash.string(self.text)),
      Hash.combine(Hash.hash(self.stream))
    ),
  LineStream: (self: DocStream.LineStream<any>) =>
    pipe(
      Hash.string("@effect/printer/DocStream/LineStream"),
      Hash.combine(Hash.string(DocStreamSymbolKey)),
      Hash.combine(Hash.hash(self.stream))
    ),
  PushAnnotationStream: (self: DocStream.PushAnnotationStream<any>) =>
    pipe(
      Hash.string("@effect/printer/DocStream/PopAnnotationStream"),
      Hash.combine(Hash.string(DocStreamSymbolKey)),
      Hash.combine(Hash.hash(self.annotation)),
      Hash.combine(Hash.hash(self.stream))
    ),
  PopAnnotationStream: (self: DocStream.PopAnnotationStream<any>) =>
    pipe(
      Hash.string("@effect/printer/DocStream/PopAnnotationStream"),
      Hash.combine(Hash.string(DocStreamSymbolKey)),
      Hash.combine(Hash.hash(self.stream))
    )
}

const protoEqual = {
  FailedStream: (self: DocStream.FailedStream<any>, that: unknown) => isDocStream(that) && that._tag === "FailedStream",
  EmptyStream: (self: DocStream.EmptyStream<any>, that: unknown) => isDocStream(that) && that._tag === "EmptyStream",
  CharStream: (self: DocStream.CharStream<any>, that: unknown) =>
    isDocStream(that) &&
    that._tag === "CharStream" &&
    self.char === that.char &&
    Equal.equals(self.stream, that.stream),
  TextStream: (self: DocStream.TextStream<any>, that: unknown) =>
    isDocStream(that) &&
    that._tag === "TextStream" &&
    self.text === that.text &&
    Equal.equals(self.stream, that.stream),
  LineStream: (self: DocStream.LineStream<any>, that: unknown) =>
    isDocStream(that) &&
    that._tag === "LineStream" &&
    Equal.equals(self.stream, that.stream),
  PushAnnotationStream: (self: DocStream.PushAnnotationStream<any>, that: unknown) =>
    isDocStream(that) &&
    that._tag === "PushAnnotationStream" &&
    Equal.equals(self.annotation, that.annotation) &&
    Equal.equals(self.stream, that.stream),
  PopAnnotationStream: (self: DocStream.PopAnnotationStream<any>, that: unknown) =>
    isDocStream(that) &&
    that._tag === "PopAnnotationStream" &&
    Equal.equals(self.stream, that.stream)
}

const proto = {
  [DocStreamTypeId]: { _A: (_: never) => _ },
  [Hash.symbol](this: DocStream.DocStream<any>): number {
    return Hash.cached(this, protoHash[this._tag](this as any))
  },
  [Equal.symbol](this: DocStream.DocStream<any>, that: unknown): boolean {
    return protoEqual[this._tag](this as any, that)
  }
}

// -----------------------------------------------------------------------------
// Refinements
// -----------------------------------------------------------------------------

/** @internal */
export const isDocStream = (u: unknown): u is DocStream.DocStream<unknown> =>
  typeof u === "object" && u != null && DocStreamTypeId in u

/** @internal */
export const isFailedStream = <A>(
  self: DocStream.DocStream<A>
): self is DocStream.FailedStream<A> => self._tag === "FailedStream"

/** @internal */
export const isEmptyStream = <A>(self: DocStream.DocStream<A>): self is DocStream.EmptyStream<A> =>
  self._tag === "EmptyStream"

/** @internal */
export const isCharStream = <A>(self: DocStream.DocStream<A>): self is DocStream.CharStream<A> =>
  self._tag === "CharStream"

/** @internal */
export const isTextStream = <A>(self: DocStream.DocStream<A>): self is DocStream.TextStream<A> =>
  self._tag === "TextStream"

/** @internal */
export const isLineStream = <A>(self: DocStream.DocStream<A>): self is DocStream.LineStream<A> =>
  self._tag === "LineStream"

/** @internal */
export const isPushAnnotationStream = <A>(
  self: DocStream.DocStream<A>
): self is DocStream.PushAnnotationStream<A> => self._tag === "PushAnnotationStream"

/** @internal */
export const isPopAnnotationStream = <A>(
  self: DocStream.DocStream<A>
): self is DocStream.PopAnnotationStream<A> => self._tag === "PopAnnotationStream"

// -----------------------------------------------------------------------------
// Constructors
// -----------------------------------------------------------------------------

/** @internal */
export const failed: DocStream.DocStream<never> = (() => {
  const op = Object.create(proto)
  op._tag = "FailedStream"
  return op
})()

/** @internal */
export const empty: DocStream.DocStream<never> = (() => {
  const op = Object.create(proto)
  op._tag = "EmptyStream"
  return op
})()

/** @internal */
export const char = dual<
  (char: string) => <A>(self: DocStream.DocStream<A>) => DocStream.DocStream<A>,
  <A>(self: DocStream.DocStream<A>, char: string) => DocStream.DocStream<A>
>(2, (self, char) => {
  const op = Object.create(proto)
  op._tag = "CharStream"
  op.char = char
  op.stream = self
  return op
})

/** @internal */
export const text = dual<
  (text: string) => <A>(self: DocStream.DocStream<A>) => DocStream.DocStream<A>,
  <A>(self: DocStream.DocStream<A>, text: string) => DocStream.DocStream<A>
>(2, (self, text) => {
  const op = Object.create(proto)
  op._tag = "TextStream"
  op.text = text
  op.stream = self
  return op
})

/** @internal */
export const line = dual<
  (indentation: number) => <A>(self: DocStream.DocStream<A>) => DocStream.DocStream<A>,
  <A>(self: DocStream.DocStream<A>, indentation: number) => DocStream.DocStream<A>
>(2, (self, indentation) => {
  const op = Object.create(proto)
  op._tag = "LineStream"
  op.indentation = indentation
  op.stream = self
  return op
})

/** @internal */
export const pushAnnotation = dual<
  <B>(annotation: B) => <A>(self: DocStream.DocStream<A>) => DocStream.DocStream<A | B>,
  <A, B>(self: DocStream.DocStream<A>, annotation: B) => DocStream.DocStream<A | B>
>(2, (self, annotation) => {
  const op = Object.create(proto)
  op._tag = "PushAnnotationStream"
  op.annotation = annotation
  op.stream = self
  return op
})

/** @internal */
export const popAnnotation = <A>(stream: DocStream.DocStream<A>): DocStream.DocStream<A> => {
  const op = Object.create(proto)
  op._tag = "PopAnnotationStream"
  op.stream = stream
  return op
}

// -----------------------------------------------------------------------------
// Annotations
// -----------------------------------------------------------------------------

type AnnotationRemoval = "Remove" | "DontRemove"

const Remove: AnnotationRemoval = "Remove"

const DontRemove: AnnotationRemoval = "DontRemove"

/** @internal */
export const alterAnnotations = dual<
  <A, B>(f: (a: A) => Option.Option<B>) => (self: DocStream.DocStream<A>) => DocStream.DocStream<B>,
  <A, B>(self: DocStream.DocStream<A>, f: (a: A) => Option.Option<B>) => DocStream.DocStream<B>
>(2, (self, f) => Effect.runSync(alterAnnotationSafe(self, f, List.nil())))

const alterAnnotationSafe = <A, B>(
  self: DocStream.DocStream<A>,
  f: (a: A) => Option.Option<B>,
  stack: List.List<AnnotationRemoval>
): Effect.Effect<DocStream.DocStream<B>> => {
  switch (self._tag) {
    case "CharStream": {
      return Effect.map(
        Effect.suspend(() => alterAnnotationSafe(self.stream, f, stack)),
        char(self.char)
      )
    }
    case "TextStream": {
      return Effect.map(
        Effect.suspend(() => alterAnnotationSafe(self.stream, f, stack)),
        text(self.text)
      )
    }
    case "LineStream": {
      return Effect.map(
        Effect.suspend(() => alterAnnotationSafe(self.stream, f, stack)),
        line(self.indentation)
      )
    }
    case "PushAnnotationStream": {
      const altered = f(self.annotation)
      if (Option.isSome(altered)) {
        return Effect.map(
          Effect.suspend(() => alterAnnotationSafe(self.stream, f, List.prepend(stack, DontRemove))),
          pushAnnotation(altered.value)
        )
      }
      return Effect.suspend(() => alterAnnotationSafe(self.stream, f, List.prepend(stack, Remove)))
    }
    case "PopAnnotationStream": {
      if (List.isNil(stack)) {
        return Effect.dieMessage(
          "BUG: DocStream.alterAnnotations - received empty stack to pop from" +
            " - please report an issue at https://github.com/Effect-TS/printer/issues"
        )
      }
      if (stack.head === DontRemove) {
        return Effect.map(
          Effect.suspend(() => alterAnnotationSafe(self.stream, f, stack.tail)),
          popAnnotation
        )
      }
      return Effect.suspend(() => alterAnnotationSafe(self.stream, f, stack.tail))
    }
    default: {
      return Effect.succeed(self as unknown as DocStream.DocStream<B>)
    }
  }
}

/** @internal */
export const reAnnotate = dual<
  <A, B>(f: (a: A) => B) => (self: DocStream.DocStream<A>) => DocStream.DocStream<B>,
  <A, B>(self: DocStream.DocStream<A>, f: (a: A) => B) => DocStream.DocStream<B>
>(2, (self, f) => Effect.runSync(reAnnotateSafe(self, f)))

const reAnnotateSafe = <A, B>(
  self: DocStream.DocStream<A>,
  f: (a: A) => B
): Effect.Effect<DocStream.DocStream<B>> => {
  switch (self._tag) {
    case "CharStream": {
      return Effect.map(
        Effect.suspend(() => reAnnotateSafe(self.stream, f)),
        char(self.char)
      )
    }
    case "TextStream": {
      return Effect.map(
        Effect.suspend(() => reAnnotateSafe(self.stream, f)),
        text(self.text)
      )
    }
    case "LineStream": {
      return Effect.map(
        Effect.suspend(() => reAnnotateSafe(self.stream, f)),
        line(self.indentation)
      )
    }
    case "PushAnnotationStream": {
      return Effect.map(
        Effect.suspend(() => reAnnotateSafe(self.stream, f)),
        pushAnnotation(f(self.annotation))
      )
    }
    case "PopAnnotationStream": {
      return Effect.suspend(() => reAnnotateSafe(self.stream, f))
    }
    default: {
      return Effect.succeed(self as unknown as DocStream.DocStream<B>)
    }
  }
}

/** @internal */
export const unAnnotate = <A>(self: DocStream.DocStream<A>): DocStream.DocStream<never> =>
  Effect.runSync(unAnnotateSafe(self))

const unAnnotateSafe = <A>(
  self: DocStream.DocStream<A>
): Effect.Effect<DocStream.DocStream<never>> => {
  switch (self._tag) {
    case "CharStream": {
      return Effect.map(
        Effect.suspend(() => unAnnotateSafe(self.stream)),
        char(self.char)
      )
    }
    case "TextStream": {
      return Effect.map(
        Effect.suspend(() => unAnnotateSafe(self.stream)),
        text(self.text)
      )
    }
    case "LineStream": {
      return Effect.map(
        Effect.suspend(() => unAnnotateSafe(self.stream)),
        line(self.indentation)
      )
    }
    case "PushAnnotationStream":
    case "PopAnnotationStream": {
      return Effect.suspend(() => unAnnotateSafe(self.stream))
    }
    default: {
      return Effect.succeed(self as unknown as DocStream.DocStream<never>)
    }
  }
}

// -----------------------------------------------------------------------------
// Folding
// -----------------------------------------------------------------------------

/** @internal */
export const foldMap = dual<
  <A, M>(M: monoid.Monoid<M>, f: (a: A) => M) => (self: DocStream.DocStream<A>) => M,
  <A, M>(self: DocStream.DocStream<A>, M: monoid.Monoid<M>, f: (a: A) => M) => M
>(3, (self, M, f) => Effect.runSync(foldMapSafe(self, M, f)))

const foldMapSafe = <A, M>(
  self: DocStream.DocStream<A>,
  M: monoid.Monoid<M>,
  f: (a: A) => M
): Effect.Effect<M> => {
  switch (self._tag) {
    case "CharStream": {
      return Effect.suspend(() => foldMapSafe(self.stream, M, f))
    }
    case "TextStream": {
      return Effect.suspend(() => foldMapSafe(self.stream, M, f))
    }
    case "LineStream": {
      return Effect.suspend(() => foldMapSafe(self.stream, M, f))
    }
    case "PushAnnotationStream": {
      return Effect.map(
        Effect.suspend(() => foldMapSafe(self.stream, M, f)),
        (that) => M.combine(f(self.annotation), that)
      )
    }
    case "PopAnnotationStream": {
      return Effect.suspend(() => foldMapSafe(self.stream, M, f))
    }
    default: {
      return Effect.succeed(M.empty)
    }
  }
}

/** @internal */
export const match = dual<
  <A, R>(
    patterns: {
      readonly FailedStream: () => R
      readonly EmptyStream: () => R
      readonly CharStream: (char: string, stream: DocStream.DocStream<A>) => R
      readonly TextStream: (text: string, stream: DocStream.DocStream<A>) => R
      readonly LineStream: (indentation: number, stream: DocStream.DocStream<A>) => R
      readonly PushAnnotationStream: (annotation: A, stream: DocStream.DocStream<A>) => R
      readonly PopAnnotationStream: (stream: DocStream.DocStream<A>) => R
    }
  ) => (self: DocStream.DocStream<A>) => R,
  <A, R>(
    self: DocStream.DocStream<A>,
    patterns: {
      readonly FailedStream: () => R
      readonly EmptyStream: () => R

      readonly CharStream: (char: string, stream: DocStream.DocStream<A>) => R
      readonly TextStream: (text: string, stream: DocStream.DocStream<A>) => R
      readonly LineStream: (indentation: number, stream: DocStream.DocStream<A>) => R
      readonly PushAnnotationStream: (annotation: A, stream: DocStream.DocStream<A>) => R
      readonly PopAnnotationStream: (stream: DocStream.DocStream<A>) => R
    }
  ) => R
>(2, (self, patterns) => {
  switch (self._tag) {
    case "FailedStream": {
      return patterns.FailedStream()
    }
    case "EmptyStream": {
      return patterns.EmptyStream()
    }
    case "CharStream": {
      return patterns.CharStream(self.char, self.stream)
    }
    case "TextStream": {
      return patterns.TextStream(self.text, self.stream)
    }
    case "LineStream": {
      return patterns.LineStream(self.indentation, self.stream)
    }
    case "PushAnnotationStream": {
      return patterns.PushAnnotationStream(self.annotation, self.stream)
    }
    case "PopAnnotationStream": {
      return patterns.PopAnnotationStream(self.stream)
    }
  }
})

// -----------------------------------------------------------------------------
// Instances
// -----------------------------------------------------------------------------

/** @internal */
export const map: {
  <A, B>(f: (a: A) => B): (self: DocStream.DocStream<A>) => DocStream.DocStream<B>
  <A, B>(self: DocStream.DocStream<A>, f: (a: A) => B): DocStream.DocStream<B>
} = reAnnotate

/** @internal */
export const imap = covariant.imap<DocStream.DocStream.TypeLambda>(map)

/** @internal */
export const Covariant: covariant.Covariant<DocStream.DocStream.TypeLambda> = {
  map,
  imap
}

/** @internal */
export const Invariant: invariant.Invariant<DocStream.DocStream.TypeLambda> = {
  imap
}
