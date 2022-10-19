import type * as DT from "@effect/printer/DocTree"
import type { DocTreeToken } from "@effect/printer/internal/DocTree/token"
import * as DTT from "@effect/printer/internal/DocTree/token"
import type * as functor from "@fp-ts/core/Functor"
import type * as monoid from "@fp-ts/core/Monoid"
import type * as semigroup from "@fp-ts/core/Semigroup"
import * as Chunk from "@fp-ts/data/Chunk"
import * as Equal from "@fp-ts/data/Equal"
import { pipe } from "@fp-ts/data/Function"
import * as Option from "@fp-ts/data/Option"
import * as SafeEval from "@fp-ts/data/SafeEval"

// -----------------------------------------------------------------------------
// Models
// -----------------------------------------------------------------------------

const DocTreeSymbolKey = "@effect/printer/DocTree"
/** @internal */
export const DocTreeTypeId: DT.TypeId = Symbol.for(DocTreeSymbolKey) as DT.TypeId

function variance<A, B>(_: A): B {
  return _ as unknown as B
}

class EmptyTree<A> implements DT.EmptyTree<A>, Equal.Equal {
  readonly _tag = "EmptyTree"
  readonly _id: DT.TypeId = DocTreeTypeId
  readonly _A: (_: never) => A = variance;
  [Equal.symbolHash](): number {
    return pipe(
      Equal.hash("@effect/printer/DocTree/EmptyTree"),
      Equal.hashCombine(Equal.hash(DocTreeSymbolKey))
    )
  }
  [Equal.symbolEqual](that: unknown): boolean {
    return isDocTree(that) && that._tag === "EmptyTree"
  }
}

class CharTree<A> implements DT.CharTree<A>, Equal.Equal {
  readonly _tag = "CharTree"
  readonly _id: DT.TypeId = DocTreeTypeId
  readonly _A: (_: never) => A = variance
  constructor(readonly char: string) {}
  [Equal.symbolHash](): number {
    return pipe(
      Equal.hash("@effect/printer/DocTree/CharTree"),
      Equal.hashCombine(Equal.hash(this.char)),
      Equal.hashCombine(Equal.hash(DocTreeSymbolKey))
    )
  }
  [Equal.symbolEqual](that: unknown): boolean {
    return isDocTree(that) &&
      that._tag === "CharTree" &&
      this.char === that.char
  }
}

/**
 * @tsplus type effect/printer/DocTree/Text
 */
export class TextTree<A> implements DT.TextTree<A>, Equal.Equal {
  readonly _tag = "TextTree"
  readonly _id: DT.TypeId = DocTreeTypeId
  readonly _A: (_: never) => A = variance
  constructor(readonly text: string) {}
  [Equal.symbolHash](): number {
    return pipe(
      Equal.hash("@effect/printer/DocTree/TextTree"),
      Equal.hashCombine(Equal.hash(this.text)),
      Equal.hashCombine(Equal.hash(DocTreeSymbolKey))
    )
  }
  [Equal.symbolEqual](that: unknown): boolean {
    return isDocTree(that) &&
      that._tag === "TextTree" &&
      this.text === that.text
  }
}

/**
 * @tsplus type effect/printer/DocTree/Line
 */
export class LineTree<A> implements DT.LineTree<A>, Equal.Equal {
  readonly _tag = "LineTree"
  readonly _id: DT.TypeId = DocTreeTypeId
  readonly _A: (_: never) => A = variance
  constructor(readonly indentation: number) {}
  [Equal.symbolHash](): number {
    return pipe(
      Equal.hash("@effect/printer/DocTree/LineTree"),
      Equal.hashCombine(Equal.hash(this.indentation)),
      Equal.hashCombine(Equal.hash(DocTreeSymbolKey))
    )
  }
  [Equal.symbolEqual](that: unknown): boolean {
    return isDocTree(that) &&
      that._tag === "LineTree" &&
      this.indentation === that.indentation
  }
}

/**
 * @tsplus type effect/printer/DocTree/Annotation
 */
export class AnnotationTree<A> implements DT.AnnotationTree<A>, Equal.Equal {
  readonly _tag = "AnnotationTree"
  readonly _id: DT.TypeId = DocTreeTypeId
  readonly _A: (_: never) => A = variance
  constructor(readonly annotation: A, readonly tree: DocTree<A>) {}
  [Equal.symbolHash](): number {
    return pipe(
      Equal.hash("@effect/printer/DocTree/AnnotationTree"),
      Equal.hashCombine(Equal.hash(this.annotation)),
      Equal.hashCombine(Equal.hash(this.tree))
    )
  }
  [Equal.symbolEqual](that: unknown): boolean {
    return isDocTree(that) &&
      that._tag === "AnnotationTree" &&
      Equal.equals(this.annotation, that.annotation) &&
      Equal.equals(this.tree, that.tree)
  }
}

/**
 * @tsplus type effect/printer/DocTree/Concat
 */
export class ConcatTree<A> implements DT.ConcatTree<A>, Equal.Equal {
  readonly _tag = "ConcatTree"
  readonly _id: DT.TypeId = DocTreeTypeId
  readonly _A: (_: never) => A = variance
  constructor(readonly trees: Chunk.Chunk<DocTree<A>>) {}
  [Equal.symbolHash](): number {
    return pipe(
      Equal.hash("@effect/printer/DocTree/ConcatTree"),
      Equal.hashCombine(Equal.hash(this.trees))
    )
  }
  [Equal.symbolEqual](that: unknown): boolean {
    return isDocTree(that) &&
      that._tag === "ConcatTree" &&
      Equal.equals(this.trees, that.trees)
  }
}

// -----------------------------------------------------------------------------
// Refinements
// -----------------------------------------------------------------------------

/** @internal */
export function isDocTree(u: unknown): u is DocTree<unknown> {
  return typeof u === "object" && u != null && "_id" in u && u["_id"] === DocTreeTypeId
}

/** @internal */
export function isEmptyTree<A>(self: DocTree<A>): self is EmptyTree<A> {
  return self._tag === "EmptyTree"
}

/** @internal */
export function isCharTree<A>(self: DocTree<A>): self is CharTree<A> {
  return self._tag === "CharTree"
}

/** @internal */
export function isTextTree<A>(self: DocTree<A>): self is TextTree<A> {
  return self._tag === "TextTree"
}

/** @internal */
export function isLineTree<A>(self: DocTree<A>): self is LineTree<A> {
  return self._tag === "LineTree"
}

/** @internal */
export function isAnnotationTree<A>(self: DocTree<A>): self is AnnotationTree<A> {
  return self._tag === "AnnotationTree"
}

/** @internal */
export function isConcatTree<A>(self: DocTree<A>): self is ConcatTree<A> {
  return self._tag === "ConcatTree"
}

// -----------------------------------------------------------------------------
// Constructors
// -----------------------------------------------------------------------------

/** @internal */
export const empty: DocTree<never> = new EmptyTree()

/** @internal */
export function char<A>(char: string): DocTree<A> {
  return new CharTree(char)
}

/** @internal */
export function text<A>(text: string): DocTree<A> {
  return new TextTree(text)
}

/** @internal */
export function line<A>(indentation: number): DocTree<A> {
  return new LineTree(indentation)
}

/** @internal */
export function annotation<A>(annotation: A) {
  return (self: DocTree<A>): DocTree<A> => new AnnotationTree(annotation, self)
}

/** @internal */
export function concat<A>(trees: Chunk.Chunk<DocTree<A>>): DocTree<A> {
  return new ConcatTree(trees)
}

// -----------------------------------------------------------------------------
// Annotations
// -----------------------------------------------------------------------------

/** @internal */
export function alterAnnotations<A, B>(f: (a: A) => Iterable<B>) {
  return (self: DocTree<A>): DocTree<B> => SafeEval.execute(alterAnnotationsSafe(self, f))
}

function alterAnnotationsSafe<A, B>(
  self: DocTree<A>,
  f: (a: A) => Iterable<B>
): SafeEval.SafeEval<DocTree<B>> {
  switch (self._tag) {
    case "EmptyTree": {
      return SafeEval.succeed(empty)
    }
    case "CharTree": {
      return SafeEval.succeed(char(self.char))
    }
    case "TextTree": {
      return SafeEval.succeed(text(self.text))
    }
    case "LineTree": {
      return SafeEval.succeed(line(self.indentation))
    }
    case "AnnotationTree": {
      return pipe(
        Chunk.fromIterable(f(self.annotation)),
        Chunk.reduceRight(
          SafeEval.suspend(() => alterAnnotationsSafe(self.tree, f)),
          (b, acc) => pipe(acc, SafeEval.map(annotation(b)))
        )
      )
    }
    case "ConcatTree": {
      const trees = pipe(
        self.trees,
        Chunk.map((tree) => SafeEval.execute(SafeEval.suspend(() => alterAnnotationsSafe(tree, f))))
      )
      return SafeEval.succeed(concat(trees))
    }
  }
}

/** @internal */
export function reAnnotate<A, B>(f: (a: A) => B) {
  return (self: DocTree<A>): DocTree<B> => alterAnnotations<A, B>((a) => [f(a)])(self)
}

/** @internal */
export function unAnnotate<A>(self: DocTree<A>): DocTree<never> {
  return alterAnnotations(() => [])(self)
}

// -----------------------------------------------------------------------------
// Folding
// -----------------------------------------------------------------------------

/** @internal */
export function foldMap<A, M>(I: monoid.Monoid<M>, f: (a: A) => M) {
  return (self: DocTree<A>): M => SafeEval.execute(foldMapSafe(self, I, f))
}

function foldMapSafe<A, M>(self: DocTree<A>, M: monoid.Monoid<M>, f: (a: A) => M): SafeEval.SafeEval<M> {
  switch (self._tag) {
    case "EmptyTree":
    case "CharTree":
    case "TextTree":
    case "LineTree": {
      return SafeEval.succeed(M.empty)
    }
    case "AnnotationTree": {
      return pipe(
        SafeEval.suspend(() => foldMapSafe(self.tree, M, f)),
        SafeEval.map((i) => M.combine(i)(f(self.annotation)))
      )
    }
    case "ConcatTree": {
      if (Chunk.isEmpty(self.trees)) {
        return SafeEval.succeed(M.empty)
      }
      const trees = pipe(
        self.trees,
        Chunk.map((tree) => SafeEval.suspend(() => foldMapSafe(tree, M, f)))
      )
      const head = Chunk.unsafeHead(trees)
      return pipe(
        trees,
        Chunk.drop(1),
        Chunk.reduce(head, (acc, a) => pipe(acc, SafeEval.zipWith(a, (a, b) => M.combine(b)(a))))
      )
    }
  }
}

// -----------------------------------------------------------------------------
// Rendering
// -----------------------------------------------------------------------------

/** @internal */
export function renderSimplyDecorated<A, M>(
  M: monoid.Monoid<M>,
  renderText: (text: string) => M,
  renderAnnotation: (annotation: A, out: M) => M
) {
  return (self: DocTree<A>): M => {
    return SafeEval.execute(renderSimplyDecoratedSafe(self, M, renderText, renderAnnotation))
  }
}

function renderSimplyDecoratedSafe<A, M>(
  self: DocTree<A>,
  M: monoid.Monoid<M>,
  renderText: (text: string) => M,
  renderAnnotation: (annotation: A, out: M) => M
): SafeEval.SafeEval<M> {
  switch (self._tag) {
    case "EmptyTree": {
      return SafeEval.succeed(M.empty)
    }
    case "CharTree": {
      return SafeEval.succeed(renderText(self.char))
    }
    case "TextTree": {
      return SafeEval.succeed(renderText(self.text))
    }
    case "LineTree": {
      return SafeEval.succeed(M.combine(renderText(Doc.textSpaces(self.indentation)))(renderText("\n")))
    }
    case "AnnotationTree": {
      return pipe(
        SafeEval.suspend(() => renderSimplyDecoratedSafe(self.tree, M, renderText, renderAnnotation)),
        SafeEval.map((out) => renderAnnotation(self.annotation, out))
      )
    }
    case "ConcatTree": {
      if (Chunk.isEmpty(self.trees)) {
        return SafeEval.succeed(M.empty)
      }
      const head = Chunk.unsafeHead(self.trees)
      return pipe(
        self.trees,
        Chunk.drop(1),
        Chunk.reduce(
          SafeEval.suspend(() => renderSimplyDecoratedSafe(head, M, renderText, renderAnnotation)),
          (acc, tree) =>
            pipe(
              acc,
              SafeEval.zipWith(
                SafeEval.suspend(() => renderSimplyDecoratedSafe(tree, M, renderText, renderAnnotation)),
                (a, b) => M.combine(b)(a)
              )
            )
        )
      )
    }
  }
}

// -----------------------------------------------------------------------------
// Conversions
// -----------------------------------------------------------------------------

/** @internal */
export function treeForm<A>(stream: DocStream<A>): DocTree<A> {
  const result = parser<A>()(stream)
  switch (result._tag) {
    case "None": {
      throw new Error("bug, failed to convert DocStream to DocTree!")
    }
    case "Some": {
      const [docTree, remaining] = result.value
      if (remaining._tag !== "EmptyStream") {
        throw new Error("bug, DocStream not fully consumed during DocTree parsing!")
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

function succeed<S, A>(value: A): DocTreeParser<S, A> {
  return (stream) => Option.some([value, stream] as const)
}

function map<A, B>(f: (a: A) => B) {
  return <S>(self: DocTreeParser<S, A>): DocTreeParser<S, B> => {
    return (stream) => pipe(self(stream), Option.map(([a, s]) => [f(a), s]))
  }
}

function flatMap<A, S, B>(f: (a: A) => DocTreeParser<S, B>) {
  return (self: DocTreeParser<S, A>): DocTreeParser<S, B> => {
    return (stream) => pipe(self(stream), Option.flatMap(([a, s1]) => f(a)(s1)))
  }
}

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

function nextToken<A>(): DocTreeParser<DocStream<A>, DocTreeToken<A>> {
  return (stream) => {
    switch (stream._tag) {
      case "FailedStream": {
        throw new Error("bug, found a failed stream while parsing!")
      }
      case "EmptyStream": {
        return Option.none
      }
      case "CharStream": {
        return Option.some([DTT.char(stream.char), stream.stream] as const)
      }
      case "TextStream": {
        return Option.some([DTT.text(stream.text), stream.stream] as const)
      }
      case "LineStream": {
        return Option.some([DTT.line(stream.indentation), stream.stream] as const)
      }
      case "PushAnnotationStream": {
        return Option.some(
          [DTT.pushAnnotation(stream.annotation), stream.stream] as const
        )
      }
      case "PopAnnotationStream": {
        return Option.some([DTT.popAnnotation, stream.stream])
      }
    }
  }
}

function mergeTrees<A>(trees: ReadonlyArray<DocTree<A>>): DocTree<A> {
  if (trees.length === 0) {
    return empty
  }
  const head = trees[0]!
  const tail = trees.slice(1)
  return tail.length === 0 ? head : concat(Chunk.fromIterable(trees))
}

function tree<A>(parser: () => DocTreeParser<DocStream<A>, DocTree<A>>): DocTreeParser<DocStream<A>, DocTree<A>> {
  return pipe(
    nextToken<A>(),
    flatMap((token) => {
      switch (token._tag) {
        case "EmptyToken": {
          return succeed(empty)
        }
        case "CharToken": {
          return succeed(char<A>(token.char))
        }
        case "TextToken": {
          return succeed(text<A>(token.text))
        }
        case "LineToken": {
          return succeed(line<A>(token.indentation))
        }
        case "PushAnnotationToken": {
          return pipe(
            parser(),
            flatMap((annotatedContents) =>
              pipe(
                // Make sure to handle the subsequent pop annotation token
                nextToken<A>(),
                map(() => annotation(token.annotation)(annotatedContents))
              )
            )
          )
        }
        case "PopAnnotationToken": {
          return () => Option.none
        }
      }
    })
  )
}

/** @internal */
export function parser<A>(): DocTreeParser<DocStream<A>, DocTree<A>> {
  return pipe(
    many(tree<A>(parser)),
    map(mergeTrees)
  )
}

// -----------------------------------------------------------------------------
// Instances
// -----------------------------------------------------------------------------

/** @internal */
export function getSemigroup<A>(): semigroup.Semigroup<DocTree<A>> {
  return {
    combine: (that) => (self) => concat(Chunk.make(self, that)),
    combineMany: (trees) => (self) => concat(Chunk.fromIterable([self, ...trees]))
  }
}

/** @internal */
export function getMonoid<A>(): monoid.Monoid<DocTree<A>> {
  return {
    empty,
    combine: (that) => (self) => concat(Chunk.make(self, that)),
    combineMany: (trees) => (self) => concat(Chunk.fromIterable([self, ...trees])),
    combineAll: (trees) => concat(Chunk.fromIterable(trees))
  }
}

/** @internal */
export const Functor: functor.Functor<DocTree.TypeLambda> = {
  map: reAnnotate
}
