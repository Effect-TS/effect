import * as covariant from "@effect/typeclass/Covariant"
import type * as invariant from "@effect/typeclass/Invariant"
import type * as monoid from "@effect/typeclass/Monoid"
import type * as semigroup from "@effect/typeclass/Semigroup"
import * as Arr from "effect/Array"
import * as Effect from "effect/Effect"
import * as Equal from "effect/Equal"
import { dual, pipe } from "effect/Function"
import * as Hash from "effect/Hash"
import * as Option from "effect/Option"
import type * as DocStream from "../DocStream.js"
import type * as DocTree from "../DocTree.js"
import * as doc from "./doc.js"
import * as docTreeToken from "./docTreeToken.js"

// -----------------------------------------------------------------------------
// Models
// -----------------------------------------------------------------------------

const DocTreeSymbolKey = "@effect/printer/DocTree"

/** @internal */
export const DocTreeTypeId: DocTree.DocTreeTypeId = Symbol.for(
  DocTreeSymbolKey
) as DocTree.DocTreeTypeId

const protoHash = {
  EmptyTree: (_: DocTree.EmptyTree<any>) =>
    pipe(
      Hash.string("@effect/printer/DocTree/EmptyTree"),
      Hash.combine(Hash.string(DocTreeSymbolKey))
    ),
  CharTree: (self: DocTree.CharTree<any>) =>
    pipe(
      Hash.string("@effect/printer/DocTree/CharTree"),
      Hash.combine(Hash.string(DocTreeSymbolKey)),
      Hash.combine(Hash.string(self.char))
    ),
  TextTree: (self: DocTree.TextTree<any>) =>
    pipe(
      Hash.string("@effect/printer/DocTree/TextTree"),
      Hash.combine(Hash.string(DocTreeSymbolKey)),
      Hash.combine(Hash.string(self.text))
    ),
  LineTree: (self: DocTree.LineTree<any>) =>
    pipe(
      Hash.string("@effect/printer/DocTree/LineTree"),
      Hash.combine(Hash.string(DocTreeSymbolKey)),
      Hash.combine(Hash.number(self.indentation))
    ),
  AnnotationTree: (self: DocTree.AnnotationTree<any>) =>
    pipe(
      Hash.string("@effect/printer/DocTree/AnnotationTree"),
      Hash.combine(Hash.string(DocTreeSymbolKey)),
      Hash.combine(Hash.hash(self.annotation)),
      Hash.combine(Hash.hash(self.tree))
    ),
  ConcatTree: (self: DocTree.ConcatTree<any>) =>
    pipe(
      Hash.string("@effect/printer/DocTree/ConcatTree"),
      Hash.combine(Hash.string(DocTreeSymbolKey)),
      Hash.combine(Hash.hash(self.trees))
    )
}

const protoEqual = {
  EmptyTree: (_: DocTree.EmptyTree<any>, that: unknown) => isDocTree(that) && that._tag === "EmptyTree",
  CharTree: (self: DocTree.CharTree<any>, that: unknown) =>
    isDocTree(that) && that._tag === "CharTree" && self.char === that.char,
  TextTree: (self: DocTree.TextTree<any>, that: unknown) =>
    isDocTree(that) && that._tag === "TextTree" && self.text === that.text,
  LineTree: (self: DocTree.LineTree<any>, that: unknown) =>
    isDocTree(that) && that._tag === "LineTree" && self.indentation === that.indentation,
  AnnotationTree: (self: DocTree.AnnotationTree<any>, that: unknown) =>
    isDocTree(that) &&
    that._tag === "AnnotationTree" &&
    Equal.equals(self.annotation, that.annotation) &&
    Equal.equals(self.tree, that.tree),
  ConcatTree: (self: DocTree.ConcatTree<any>, that: unknown) =>
    isDocTree(that) &&
    that._tag === "ConcatTree" &&
    Equal.equals(self.trees, that.trees)
}

const proto = {
  [DocTreeTypeId]: { _A: (_: never) => _ },
  [Hash.symbol](this: DocTree.DocTree<any>) {
    return Hash.cached(this, protoHash[this._tag](this as any))
  },
  [Equal.symbol](this: DocTree.DocTree<any>, that: unknown) {
    return protoEqual[this._tag](this as any, that)
  }
}

// -----------------------------------------------------------------------------
// Refinements
// -----------------------------------------------------------------------------

/** @internal */
export const isDocTree = (u: unknown): u is DocTree.DocTree<unknown> =>
  typeof u === "object" && u != null && DocTreeTypeId in u

/** @internal */
export const isEmptyTree = <A>(self: DocTree.DocTree<A>): self is DocTree.EmptyTree<A> => self._tag === "EmptyTree"

/** @internal */
export const isCharTree = <A>(self: DocTree.DocTree<A>): self is DocTree.CharTree<A> => self._tag === "CharTree"

/** @internal */
export const isTextTree = <A>(self: DocTree.DocTree<A>): self is DocTree.TextTree<A> => self._tag === "TextTree"

/** @internal */
export const isLineTree = <A>(self: DocTree.DocTree<A>): self is DocTree.LineTree<A> => self._tag === "LineTree"

/** @internal */
export const isAnnotationTree = <A>(self: DocTree.DocTree<A>): self is DocTree.AnnotationTree<A> =>
  self._tag === "AnnotationTree"

/** @internal */
export const isConcatTree = <A>(self: DocTree.DocTree<A>): self is DocTree.ConcatTree<A> => self._tag === "ConcatTree"

// -----------------------------------------------------------------------------
// Constructors
// -----------------------------------------------------------------------------

/** @internal */
export const empty: DocTree.DocTree<never> = (() => {
  const op = Object.create(proto)
  op._tag = "EmptyTree"
  return op
})()

/** @internal */
export const char = <A>(char: string): DocTree.DocTree<A> => {
  const op = Object.create(proto)
  op._tag = "CharTree"
  op.char = char
  return op
}

/** @internal */
export const text = <A>(text: string): DocTree.DocTree<A> => {
  const op = Object.create(proto)
  op._tag = "TextTree"
  op.text = text
  return op
}

/** @internal */
export const line = <A>(indentation: number): DocTree.DocTree<A> => {
  const op = Object.create(proto)
  op._tag = "LineTree"
  op.indentation = indentation
  return op
}

/** @internal */
export const annotation = dual<
  <A>(annotation: A) => <B>(self: DocTree.DocTree<B>) => DocTree.DocTree<A | B>,
  <A, B>(self: DocTree.DocTree<A>, annotation: B) => DocTree.DocTree<A | B>
>(2, (self, annotation) => {
  const op = Object.create(proto)
  op._tag = "AnnotationTree"
  op.annotation = annotation
  op.tree = self
  return op
})

/** @internal */
export const concat = <A>(trees: ReadonlyArray<DocTree.DocTree<A>>): DocTree.DocTree<A> => {
  const op = Object.create(proto)
  op._tag = "ConcatTree"
  op.trees = trees
  return op
}

// -----------------------------------------------------------------------------
// Annotations
// -----------------------------------------------------------------------------

/** @internal */
export const alterAnnotations = dual<
  <A, B>(f: (a: A) => Iterable<B>) => (self: DocTree.DocTree<A>) => DocTree.DocTree<B>,
  <A, B>(self: DocTree.DocTree<A>, f: (a: A) => Iterable<B>) => DocTree.DocTree<B>
>(2, (self, f) => Effect.runSync(alterAnnotationsSafe(self, f)))

const alterAnnotationsSafe = <A, B>(
  self: DocTree.DocTree<A>,
  f: (a: A) => Iterable<B>
): Effect.Effect<DocTree.DocTree<B>> => {
  switch (self._tag) {
    case "EmptyTree": {
      return Effect.succeed(empty)
    }
    case "CharTree": {
      return Effect.succeed(char(self.char))
    }
    case "TextTree": {
      return Effect.succeed(text(self.text))
    }
    case "LineTree": {
      return Effect.succeed(line(self.indentation))
    }
    case "AnnotationTree": {
      return Arr.reduce(
        Arr.fromIterable(f(self.annotation)),
        Effect.suspend(() => alterAnnotationsSafe(self.tree, f)),
        (acc, b) => Effect.map(acc, annotation(b))
      )
    }
    case "ConcatTree": {
      return pipe(
        Effect.forEach(self.trees, (tree) => alterAnnotationsSafe(tree, f)),
        Effect.map(concat)
      )
    }
  }
}

/** @internal */
export const reAnnotate = dual<
  <A, B>(f: (a: A) => B) => (self: DocTree.DocTree<A>) => DocTree.DocTree<B>,
  <A, B>(self: DocTree.DocTree<A>, f: (a: A) => B) => DocTree.DocTree<B>
>(2, (self, f) => alterAnnotations(self, (a) => [f(a)]))

/** @internal */
export const unAnnotate = <A>(self: DocTree.DocTree<A>): DocTree.DocTree<never> => alterAnnotations(self, () => [])

// -----------------------------------------------------------------------------
// Folding
// -----------------------------------------------------------------------------

/** @internal */
export const foldMap = dual<
  <A, M>(M: monoid.Monoid<M>, f: (a: A) => M) => (self: DocTree.DocTree<A>) => M,
  <A, M>(self: DocTree.DocTree<A>, M: monoid.Monoid<M>, f: (a: A) => M) => M
>(3, (self, M, f) => Effect.runSync(foldMapSafe(self, M, f)))

const foldMapSafe = <A, M>(
  self: DocTree.DocTree<A>,
  M: monoid.Monoid<M>,
  f: (a: A) => M
): Effect.Effect<M> => {
  switch (self._tag) {
    case "EmptyTree":
    case "CharTree":
    case "TextTree":
    case "LineTree": {
      return Effect.succeed(M.empty)
    }
    case "AnnotationTree": {
      return Effect.map(
        Effect.suspend(() => foldMapSafe(self.tree, M, f)),
        (that) => M.combine(f(self.annotation), that)
      )
    }
    case "ConcatTree": {
      if (Arr.isEmptyReadonlyArray(self.trees)) {
        return Effect.succeed(M.empty)
      }
      return Effect.map(
        Effect.forEach(self.trees, (tree) => foldMapSafe(tree, M, f)),
        (trees) => {
          const head = trees[0]
          const tail = trees.slice(1)
          return Arr.reduce(tail, head, M.combine)
        }
      )
    }
  }
}

// -----------------------------------------------------------------------------
// Rendering
// -----------------------------------------------------------------------------

/** @internal */
export const renderSimplyDecorated = dual<
  <A, M>(
    M: monoid.Monoid<M>,
    renderText: (text: string) => M,
    renderAnnotation: (annotation: A, out: M) => M
  ) => (self: DocTree.DocTree<A>) => M,
  <A, M>(
    self: DocTree.DocTree<A>,
    M: monoid.Monoid<M>,
    renderText: (text: string) => M,
    renderAnnotation: (annotation: A, out: M) => M
  ) => M
>(
  4,
  (self, M, renderText, renderAnnotation) =>
    Effect.runSync(renderSimplyDecoratedSafe(self, M, renderText, renderAnnotation))
)

const renderSimplyDecoratedSafe = <A, M>(
  self: DocTree.DocTree<A>,
  M: monoid.Monoid<M>,
  renderText: (text: string) => M,
  renderAnnotation: (annotation: A, out: M) => M
): Effect.Effect<M> => {
  switch (self._tag) {
    case "EmptyTree": {
      return Effect.succeed(M.empty)
    }
    case "CharTree": {
      return Effect.succeed(renderText(self.char))
    }
    case "TextTree": {
      return Effect.succeed(renderText(self.text))
    }
    case "LineTree": {
      return Effect.succeed(
        M.combine(renderText("\n"), renderText(doc.textSpaces(self.indentation)))
      )
    }
    case "AnnotationTree": {
      return Effect.map(
        Effect.suspend(() => renderSimplyDecoratedSafe(self.tree, M, renderText, renderAnnotation)),
        (out) => renderAnnotation(self.annotation, out)
      )
    }
    case "ConcatTree": {
      if (Arr.isEmptyReadonlyArray(self.trees)) {
        return Effect.succeed(M.empty)
      }
      const head = self.trees[0]
      const tail = self.trees.slice(1)
      return Arr.reduce(
        tail,
        Effect.suspend(() => renderSimplyDecoratedSafe(head, M, renderText, renderAnnotation)),
        (acc, tree) =>
          Effect.zipWith(
            acc,
            Effect.suspend(() => renderSimplyDecoratedSafe(tree, M, renderText, renderAnnotation)),
            M.combine
          )
      )
    }
  }
}

// -----------------------------------------------------------------------------
// Conversions
// -----------------------------------------------------------------------------

/** @internal */
export const treeForm = <A>(stream: DocStream.DocStream<A>): DocTree.DocTree<A> => {
  const result = parser<A>()(stream)
  switch (result._tag) {
    case "None": {
      throw new Error(
        "BUG: DocTree.treeForm - failed to convert DocStream to DocTree" +
          " - please report an issue at https://github.com/Effect-TS/printer/issues"
      )
    }
    case "Some": {
      const [docTree, remaining] = result.value
      if (remaining._tag !== "EmptyStream") {
        throw new Error(
          "BUG: DocTree.treeForm - DocStream not fully consumed during DocTree parsing" +
            " - please report an issue at https://github.com/Effect-TS/printer/issues"
        )
      }
      return docTree
    }
  }
}

// -----------------------------------------------------------------------------
// Parser
// -----------------------------------------------------------------------------

interface DocTreeParser<S, A> {
  (stream: S): Option.Option<readonly [A, S]>
}

const parserSucceed = <S, A>(value: A): DocTreeParser<S, A> => (stream) => Option.some([value, stream] as const)

const parserMap = <S, A, B>(self: DocTreeParser<S, A>, f: (a: A) => B): DocTreeParser<S, B> => (stream) =>
  Option.map(self(stream), ([a, s]) => [f(a), s] as const)

const parserFlatMap =
  <S, A, B>(self: DocTreeParser<S, A>, f: (a: A) => DocTreeParser<S, B>): DocTreeParser<S, B> => (stream) =>
    Option.flatMap(self(stream), ([a, s1]) => f(a)(s1))

function many<S, A>(parser: DocTreeParser<S, A>): DocTreeParser<S, ReadonlyArray<A>> {
  return (stream) =>
    pipe(
      parser(stream),
      Option.map(([head, next]) => {
        const output: Array<A> = [head]
        let input: S = next
        let result = parser(next)
        while (result._tag === "Some") {
          const [value, nextInput] = result.value
          output.push(value)
          input = nextInput
          result = parser(nextInput)
        }
        return [output, input] as const
      })
    )
}

const nextToken = <A>(): DocTreeParser<DocStream.DocStream<A>, docTreeToken.DocTreeToken<A>> => {
  return (stream) => {
    switch (stream._tag) {
      case "FailedStream": {
        throw new Error(
          "BUG: DocTree.treeForm - found failed doc stream while parsing" +
            " - please report an issue at https://github.com/Effect-TS/printer/issues"
        )
      }
      case "EmptyStream": {
        return Option.none()
      }
      case "CharStream": {
        return Option.some([docTreeToken.char(stream.char), stream.stream] as const)
      }
      case "TextStream": {
        return Option.some([docTreeToken.text(stream.text), stream.stream] as const)
      }
      case "LineStream": {
        return Option.some([docTreeToken.line(stream.indentation), stream.stream] as const)
      }
      case "PushAnnotationStream": {
        return Option.some(
          [
            docTreeToken.pushAnnotation(stream.annotation),
            stream.stream
          ] as const
        )
      }
      case "PopAnnotationStream": {
        return Option.some([docTreeToken.popAnnotation, stream.stream])
      }
    }
  }
}

const mergeTrees = <A>(trees: ReadonlyArray<DocTree.DocTree<A>>): DocTree.DocTree<A> => {
  if (trees.length === 0) {
    return empty
  }
  const head = trees[0]!
  const tail = trees.slice(1)
  return tail.length === 0 ? head : concat(trees)
}

const tree = <A>(
  parser: () => DocTreeParser<DocStream.DocStream<A>, DocTree.DocTree<A>>
): DocTreeParser<DocStream.DocStream<A>, DocTree.DocTree<A>> => {
  return parserFlatMap(nextToken<A>(), (token) => {
    switch (token._tag) {
      case "EmptyToken": {
        return parserSucceed(empty)
      }
      case "CharToken": {
        return parserSucceed(char<A>(token.char))
      }
      case "TextToken": {
        return parserSucceed(text<A>(token.text))
      }
      case "LineToken": {
        return parserSucceed(line<A>(token.indentation))
      }
      case "PushAnnotationToken": {
        return parserFlatMap(parser(), (annotatedContents) =>
          // Make sure to handle the subsequent pop annotation token

          parserMap(
            nextToken<A>(),
            () => annotation(annotatedContents, token.annotation)
          ))
      }
      case "PopAnnotationToken": {
        return () => Option.none()
      }
    }
  })
}

/** @internal */
export const parser = <A>(): DocTreeParser<DocStream.DocStream<A>, DocTree.DocTree<A>> =>
  parserMap(many(tree(() => parser<A>())), mergeTrees)

// -----------------------------------------------------------------------------
// Instances
// -----------------------------------------------------------------------------

export const map: {
  <A, B>(f: (a: A) => B): (self: DocTree.DocTree<A>) => DocTree.DocTree<B>
  <A, B>(self: DocTree.DocTree<A>, f: (a: A) => B): DocTree.DocTree<B>
} = reAnnotate

const imap = covariant.imap<DocTree.DocTree.TypeLambda>(map)

/** @internal */
export const getSemigroup = <A>(_: void): semigroup.Semigroup<DocTree.DocTree<A>> => {
  return {
    combine: (self, that) => concat(Arr.make(self, that)),
    combineMany: (self, trees) => concat(Arr.fromIterable([self, ...trees]))
  }
}

/** @internal */
export const getMonoid = <A>(_: void): monoid.Monoid<DocTree.DocTree<A>> => {
  return {
    empty,
    combine: (self, that) => concat(Arr.make(self, that)),
    combineMany: (self, trees) => concat(Arr.fromIterable([self, ...trees])),
    combineAll: (trees) => concat(Arr.fromIterable(trees))
  }
}

/** @internal */
export const Covariant: covariant.Covariant<DocTree.DocTree.TypeLambda> = {
  map,
  imap
}

export const Invariant: invariant.Invariant<DocTree.DocTree.TypeLambda> = {
  imap
}
