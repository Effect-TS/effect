// ets_tracing: off

import * as Associative from "@effect-ts/core/Associative"
import type { Array } from "@effect-ts/core/Collections/Immutable/Array"
import * as A from "@effect-ts/core/Collections/Immutable/Array"
import * as Tuple from "@effect-ts/core/Collections/Immutable/Tuple"
import * as E from "@effect-ts/core/Either"
import * as Identity from "@effect-ts/core/Identity"
import * as IO from "@effect-ts/core/IO"
import * as O from "@effect-ts/core/Option"
import type { URI } from "@effect-ts/core/Prelude"
import * as P from "@effect-ts/core/Prelude"
import * as DSL from "@effect-ts/core/Prelude/DSL"
import { constant, identity, pipe } from "@effect-ts/system/Function"

import type { DocStream } from "../../DocStream/index.js"
import * as DocToken from "../Internal/DocToken/index.js"
import * as Parser from "../Internal/Parser/index.js"

// -----------------------------------------------------------------------------
// definition
// -----------------------------------------------------------------------------

/**
 * Represents a document that has been laid out into a tree-like structure.
 *
 * A `DocStream` is a linked list of different annotated cons cells (i.e.
 * `TextStream` and then some further `DocStream`, `LineStream` and then some
 * further `DocStream`, etc.). The `DocStream` format is quite suitable as a
 * target for a layout engine, but is not suitable for rendering to a more
 * structured format, such as HTML, where we do not want to perform a lookahead
 * until the end of some pre-defined markup. These formats would benefit more
 * from a tree-like structure that explicitly marks its contents as annotated.
 * A `DocTree` is therefore much more suitable for this use case.
 */
export type DocTree<A> =
  | EmptyTree<A>
  | CharTree<A>
  | TextTree<A>
  | LineTree<A>
  | AnnotationTree<A>
  | ConcatTree<A>

export class EmptyTree<A> {
  readonly _tag = "EmptyTree"
  readonly _A!: () => A
  constructor(readonly id: (_: never) => A) {}
}

export class CharTree<A> {
  readonly _tag = "CharTree"
  readonly _A!: () => A
  constructor(readonly char: string, readonly id: (_: never) => A) {}
}

export class TextTree<A> {
  readonly _tag = "TextTree"
  readonly _A!: () => A
  constructor(readonly text: string, readonly id: (_: never) => A) {}
}

export class LineTree<A> {
  readonly _tag = "LineTree"
  readonly _A!: () => A
  constructor(readonly indentation: number, readonly id: (_: never) => A) {}
}

export class AnnotationTree<A> {
  readonly _tag = "AnnotationTree"
  readonly _A!: () => A
  constructor(readonly annotation: A, readonly tree: DocTree<A>) {}
}

export class ConcatTree<A> {
  readonly _tag = "ConcatTree"
  readonly _A!: () => A
  constructor(readonly trees: Array<DocTree<A>>) {}
}

// -----------------------------------------------------------------------------
// constructors
// -----------------------------------------------------------------------------

export const empty: DocTree<never> = new EmptyTree(identity)

export function char<A>(char: string): DocTree<A> {
  return new CharTree(char, identity)
}

export function text<A>(text: string): DocTree<A> {
  return new TextTree(text, identity)
}

export function line<A>(indentation: number): DocTree<A> {
  return new LineTree(indentation, identity)
}

/**
 * Annotate the specified `DocTree` with an annotation of type `A`.
 */
export function annotation_<A>(tree: DocTree<A>, annotation: A): DocTree<A> {
  return new AnnotationTree(annotation, tree)
}

/**
 * Annotate the specified `DocTree` with an annotation of type `A`.
 *
 * @dataFirst annotation_
 */
export function annotation<A>(annotation: A) {
  return (tree: DocTree<A>): DocTree<A> => annotation_(tree, annotation)
}

/**
 * Horizontally concatenates multiple `DocTree`s.
 */
export function concat<A>(trees: Array<DocTree<A>>): DocTree<A> {
  return new ConcatTree(trees)
}

// -----------------------------------------------------------------------------
// renderers
// -----------------------------------------------------------------------------

function renderSimplyDecoratedRec<A, O>(
  I: Identity.Identity<O>,
  renderText: (text: string) => O,
  renderAnnotation: (annotation: A, out: O) => O
): (tree: DocTree<A>) => IO.IO<O> {
  function go(tree: DocTree<A>): IO.IO<O> {
    return IO.gen(function* (_) {
      switch (tree._tag) {
        case "EmptyTree":
          return I.identity
        case "CharTree":
          return renderText(tree.char)
        case "TextTree":
          return renderText(tree.text)
        case "LineTree":
          return I.combine(renderText("\n"), renderText(textSpaces(tree.indentation)))
        case "AnnotationTree": {
          const subTree = yield* _(go(tree.tree))
          return renderAnnotation(tree.annotation, subTree)
        }
        case "ConcatTree":
          return A.foldMap_(I)(tree.trees, (t) => IO.run(go(t)))
      }
    })
  }
  return go
}

/**
 * The simplest possible tree-based renderer.
 *
 * For example, here is a document annotated with `void` and thee behavior is
 * to surround annotated regions with »>>>« and »<<<«.
 *
 * ```typescript
 * import { identity } from "@effect-ts/core/Function"
 * import * as Identity from "@effect-ts/core/Identity"
 *
 * import * as Doc from "../src/Core/Doc"
 * import * as DocTree from "../src/Core/DocTree"
 * import * as Layout from "../src/Core/Layout"
 *
 * const doc: Doc.Doc<void> = Doc.hsep([
 *   Doc.text("hello"),
 *   Doc.cat_(Doc.annotate_(Doc.text("world"), undefined), Doc.char("!"))
 * ])
 *
 * const tree = DocTree.treeForm(Layout.pretty_(Layout.defaultLayoutOptions, doc))
 *
 * const rendered = DocTree.renderSimplyDecorated_(Identity.string)(
 *   tree,
 *   identity,
 *   (_, x) => `>>>${x}<<<`
 * )
 *
 * console.log(rendered)
 * // => hello >>>world<<<!
 * ```
 *
 * @param I The `Identity` for the out type `O`.
 */
export function renderSimplyDecorated_<O>(I: Identity.Identity<O>) {
  /**
   * @param tree The tree to render
   * @param renderText How to render plain text content.
   * @param renderAnnotation How to modify an element with an annotation.
   */
  return <A>(
    tree: DocTree<A>,
    renderText: (text: string) => O,
    renderAnnotation: (annotation: A, out: O) => O
  ): O => IO.run(renderSimplyDecoratedRec(I, renderText, renderAnnotation)(tree))
}

/**
 * The simplest possible tree-based renderer.
 *
 * For example, here is a document annotated with `void` and thee behavior is
 * to surround annotated regions with »>>>« and »<<<«.
 *
 * ```typescript
 * import { identity } from "@effect-ts/core/Function"
 * import * as Identity from "@effect-ts/core/Identity"
 *
 * import * as Doc from "../src/Core/Doc"
 * import * as DocTree from "../src/Core/DocTree"
 * import * as Layout from "../src/Core/Layout"
 *
 * const doc: Doc.Doc<void> = Doc.hsep([
 *   Doc.text("hello"),
 *   Doc.cat_(Doc.annotate_(Doc.text("world"), undefined), Doc.char("!"))
 * ])
 *
 * const tree = DocTree.treeForm(Layout.pretty_(Layout.defaultLayoutOptions, doc))
 *
 * const rendered = DocTree.renderSimplyDecorated_(Identity.string)(
 *   tree,
 *   identity,
 *   (_, x) => `>>>${x}<<<`
 * )
 *
 * console.log(rendered)
 * // => hello >>>world<<<!
 * ```
 *
 * @param I The `Identity` for the out type `O`.
 */
export function renderSimplyDecorated<O>(I: Identity.Identity<O>) {
  /**
   * @param renderText How to render plain text content.
   * @param renderAnnotation How to modify an element with an annotation.
   */
  return <A>(
      renderText: (text: string) => O,
      renderAnnotation: (annotation: A, out: O) => O
    ) =>
    (tree: DocTree<A>): O =>
      renderSimplyDecorated_(I)(tree, renderText, renderAnnotation)
}

// -----------------------------------------------------------------------------
// operations
// -----------------------------------------------------------------------------

function foldMapRec_<A, I>(
  I: Identity.Identity<I>,
  f: (a: A) => I,
  tree: DocTree<A>
): IO.IO<I> {
  function go(tree: DocTree<A>): IO.IO<I> {
    return IO.gen(function* (_) {
      switch (tree._tag) {
        case "EmptyTree":
          return I.identity
        case "CharTree":
          return I.identity
        case "TextTree":
          return I.identity
        case "LineTree":
          return I.identity
        case "AnnotationTree":
          return I.combine(f(tree.annotation), yield* _(go(tree.tree)))
        case "ConcatTree":
          return Identity.fold(I)(A.map_(tree.trees, (t) => IO.run(go(t))))
      }
    })
  }
  return go(tree)
}

export function foldMap_<I>(I: Identity.Identity<I>) {
  return <A>(tree: DocTree<A>, f: (a: A) => I): I => {
    return IO.run(foldMapRec_(I, f, tree))
  }
}

export function foldMap<I>(I: Identity.Identity<I>) {
  return <A>(f: (a: A) => I) =>
    (fa: DocTree<A>): I =>
      foldMap_(I)(fa, f)
}

export function alterAnnotationsRec_<A, B>(
  tree: DocTree<A>,
  f: (a: A) => Array<B>
): IO.IO<DocTree<B>> {
  function go(tree: DocTree<A>): IO.IO<DocTree<B>> {
    return IO.gen(function* (_) {
      switch (tree._tag) {
        case "EmptyTree":
          return empty
        case "CharTree":
          return char(tree.char)
        case "TextTree":
          return text(tree.text)
        case "LineTree":
          return line(tree.indentation)
        case "AnnotationTree":
          return A.reduceRight_(f(tree.annotation), yield* _(go(tree.tree)), (b, t) =>
            annotation_(t, b)
          )
        case "ConcatTree":
          return concat(A.map_(tree.trees, (t) => IO.run(go(t))))
      }
    })
  }
  return go(tree)
}

/**
 * Change the annotation of a document to a different annotation, or none at
 * all.
 */
export function alterAnnotations_<A, B>(
  tree: DocTree<A>,
  f: (a: A) => Array<B>
): DocTree<B> {
  return IO.run(alterAnnotationsRec_(tree, f))
}

/**
 * Change the annotation of a document to a different annotation, or none at
 * all.
 *
 * @dataFirst alterAnnotations_
 */
export function alterAnnotations<A, B>(f: (a: A) => Array<B>) {
  return (tree: DocTree<A>): DocTree<B> => alterAnnotations_(tree, f)
}

/**
 * Change the annotation of a `DocTree`.
 */
export function reAnnotate_<A, B>(tree: DocTree<A>, f: (a: A) => B): DocTree<B> {
  return alterAnnotations_(tree, (a) => A.single(f(a)))
}

/**
 * Change the annotation of a `DocTree`.
 *
 * @dataFirst reAnnotate_
 */
export function reAnnotate<A, B>(f: (a: A) => B) {
  return (tree: DocTree<A>): DocTree<B> => reAnnotate_(tree, f)
}

/**
 * Remove all annotations from a `DocTree`.
 */
export function unAnnotate<A>(tree: DocTree<A>): DocTree<never> {
  return alterAnnotations_(tree, constant(A.empty()))
}

export const map_: <A, B>(tree: DocTree<A>, f: (a: A) => B) => DocTree<B> = reAnnotate_

/**
 * @dataFirst map_
 */
export const map: <A, B>(f: (a: A) => B) => (tree: DocTree<A>) => DocTree<B> =
  reAnnotate

// -----------------------------------------------------------------------------
// parsing
// -----------------------------------------------------------------------------

function nextToken<A>(): Parser.Parser<DocStream<A>, DocToken.DocToken<A>> {
  return (stream) => {
    switch (stream._tag) {
      case "FailedStream":
        throw new Error("bug, found a failed stream while parsing!")
      case "EmptyStream":
        return O.emptyOf<Tuple.Tuple<[DocToken.DocToken<A>, DocStream<A>]>>()
      case "CharStream":
        return O.some(Tuple.tuple(DocToken.char(stream.char), stream.stream))
      case "TextStream":
        return O.some(Tuple.tuple(DocToken.text(stream.text), stream.stream))
      case "LineStream":
        return O.some(Tuple.tuple(DocToken.line(stream.indentation), stream.stream))
      case "PushAnnotationStream":
        return O.some(
          Tuple.tuple(DocToken.pushAnnotation(stream.annotation), stream.stream)
        )
      case "PopAnnotationStream":
        return O.some(Tuple.tuple(DocToken.popAnnotation, stream.stream))
    }
  }
}

function getParser<A>() {
  const M = Parser.getMonad<DocStream<A>>()
  const AE = Parser.getAssociativeEither<DocStream<A>>()
  const CRec = Parser.getChainRec<DocStream<A>>()

  const gen = DSL.genF(M)
  const succeed = DSL.succeedF(M)
  const orElse = DSL.orElseF({ ...M, ...AE })

  function many(
    parser: Parser.Parser<DocStream<A>, DocTree<A>>
  ): Parser.Parser<DocStream<A>, Array<DocTree<A>>> {
    return gen(function* (_) {
      const head = yield* _(parser)

      return yield* _(
        orElse(() => succeed(A.empty<DocTree<A>>()))(
          CRec.chainRec((acc: Array<DocTree<A>>) =>
            pipe(
              parser,
              M.map((a) => E.left(A.append_(acc, a))),
              orElse(() => succeed(E.right(acc)))
            )
          )(A.single(head))
        )
      )
    })
  }

  function mergeTrees(trees: Array<DocTree<A>>): DocTree<A> {
    return A.foldLeft_(
      trees,
      () => empty,
      (head, tail) => (tail.length === 0 ? head : concat([head, ...tail]))
    )
  }

  const tree: Parser.Parser<DocStream<A>, DocTree<A>> = gen(function* (_) {
    const token = yield* _(nextToken<A>())

    switch (token._tag) {
      case "EmptyToken":
        return empty
      case "CharToken":
        return char<A>(token.char)
      case "TextToken":
        return text<A>(token.text)
      case "LineToken":
        return line<A>(token.indentation)
      case "PushAnnotationToken": {
        const annotatedContents = yield* _(parser)
        // Make sure to handle the subsequent pop annotation token
        yield* _(nextToken())
        return annotation_(annotatedContents, token.annotation)
      }
      case "PopAnnotationToken":
        return yield* _(() => O.emptyOf<Tuple.Tuple<[DocTree<A>, DocStream<A>]>>())
    }
  })

  const parser: Parser.Parser<DocStream<A>, DocTree<A>> = gen(function* (_) {
    const trees = yield* _(many(tree))
    return mergeTrees(trees)
  })

  return parser
}

export function treeForm<A>(stream: DocStream<A>): DocTree<A> {
  return O.fold_(
    getParser<A>()(stream),
    () => {
      throw new Error("bug, failed to convert DocStream to DocTree!")
    },
    (result) => {
      const docTree = Tuple.get_(result, 0)
      const remaining = Tuple.get_(result, 1)

      if (remaining._tag !== "EmptyStream") {
        throw new Error("bug, DocStream not fully consumed during DocTree parsing!")
      }

      return docTree
    }
  )
}

// -----------------------------------------------------------------------------
// instances
// -----------------------------------------------------------------------------

export const DocTreeURI = "@effect-ts/printer/DocTreeURI"

export type DocTreeURI = typeof DocTreeURI

declare module "@effect-ts/core/Prelude/HKT" {
  export interface URItoKind<FC, TC, K, Q, W, X, I, S, R, E, A> {
    readonly [DocTreeURI]: DocTree<A>
  }
}

export function getAssociative<A>(): Associative.Associative<DocTree<A>> {
  return Associative.makeAssociative((x, y) => concat([x, y]))
}

export function getIdentity<A>(): Identity.Identity<DocTree<A>> {
  return Identity.makeIdentity<DocTree<A>>(empty, (x, y) => concat([x, y]))
}

export const Covariant = P.instance<P.Covariant<[URI<DocTreeURI>]>>({
  map
})

// -----------------------------------------------------------------------------
// utils
// -----------------------------------------------------------------------------

/**
 * Constructs a string containing `n` space characters.
 */
export function textSpaces(n: number) {
  let s = ""
  for (let i = 0; i < n; i++) {
    s = s += " "
  }
  return s
}
