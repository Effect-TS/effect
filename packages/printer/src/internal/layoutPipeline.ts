import type * as Doc from "../Doc.js"

/**
 * Represents a list of nesting level/document pairs that are yet to be laid
 * out.
 *
 * @internal
 */
export type LayoutPipeline<A> = Nil | Cons<A> | UndoAnnotation<A>

/** @internal */
export interface Nil {
  readonly _tag: "Nil"
}

/** @internal */
export interface Cons<A> {
  readonly _tag: "Cons"
  readonly indent: number
  readonly document: Doc.Doc<A>
  readonly pipeline: LayoutPipeline<A>
}

/** @internal */
export interface UndoAnnotation<A> {
  readonly _tag: "UndoAnnotation"
  readonly pipeline: LayoutPipeline<A>
}

/** @internal */
export const nil: LayoutPipeline<never> = {
  _tag: "Nil"
}

/** @internal */
export const cons = <A>(
  indent: number,
  document: Doc.Doc<A>,
  pipeline: LayoutPipeline<A>
): LayoutPipeline<A> => ({
  _tag: "Cons",
  indent,
  document,
  pipeline
})

/** @internal */
export const undoAnnotation = <A>(pipeline: LayoutPipeline<A>): LayoutPipeline<A> => ({
  _tag: "UndoAnnotation",
  pipeline
})
