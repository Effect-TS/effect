const DocTreeTokenTypeId = Symbol.for("@effect/printer/DocTree/DocTreeToken")

type DocTreeTokenTypeId = typeof DocTreeTokenTypeId

/** @internal */
export type DocTreeToken<A> =
  | EmptyToken<A>
  | CharToken<A>
  | TextToken<A>
  | LineToken<A>
  | PushAnnotationToken<A>
  | PopAnnotationToken<A>

/** @internal */
export declare namespace DocTreeToken {
  export interface Variance<A> {
    readonly [DocTreeTokenTypeId]: {
      readonly _A: (_: never) => A
    }
  }
}

interface EmptyToken<A> extends DocTreeToken.Variance<A> {
  readonly _tag: "EmptyToken"
}

interface CharToken<A> extends DocTreeToken.Variance<A> {
  readonly _tag: "CharToken"
  readonly char: string
}

interface TextToken<A> extends DocTreeToken.Variance<A> {
  readonly _tag: "TextToken"
  readonly text: string
}

interface LineToken<A> extends DocTreeToken.Variance<A> {
  readonly _tag: "LineToken"
  readonly indentation: number
}

interface PushAnnotationToken<A> extends DocTreeToken.Variance<A> {
  readonly _tag: "PushAnnotationToken"
  readonly annotation: A
}

interface PopAnnotationToken<A> extends DocTreeToken.Variance<A> {
  readonly _tag: "PopAnnotationToken"
}

const proto = {
  [DocTreeTokenTypeId]: {
    _A: (_: never) => _
  }
}

/** @internal */
export const empty: DocTreeToken<never> = (() => {
  const op = Object.create(proto)
  op._tag = "EmptyToken"
  return op
})()

/** @internal */
export const char = <A>(char: string): DocTreeToken<A> => {
  const op = Object.create(proto)
  op._tag = "CharToken"
  op.char = char
  return op
}

/** @internal */
export const text = <A>(text: string): DocTreeToken<A> => {
  const op = Object.create(proto)
  op._tag = "TextToken"
  op.text = text
  return op
}

/** @internal */
export const line = <A>(indentation: number): DocTreeToken<A> => {
  const op = Object.create(proto)
  op._tag = "LineToken"
  op.indentation = indentation
  return op
}

/** @internal */
export const pushAnnotation = <A>(annotation: A): DocTreeToken<A> => {
  const op = Object.create(proto)
  op._tag = "PushAnnotationToken"
  op.annotation = annotation
  return op
}

/** @internal */
export const popAnnotation: DocTreeToken<never> = (() => {
  const op = Object.create(proto)
  op._tag = "PopAnnotationToken"
  return op
})()
