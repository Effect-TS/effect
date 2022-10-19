const TypeId = Symbol.for("@effect/printer/DocTree/DocTreeToken")

type TypeId = typeof TypeId

/** @internal */
export type DocTreeToken<A> =
  | EmptyToken<A>
  | CharToken<A>
  | TextToken<A>
  | LineToken<A>
  | PushAnnotationToken<A>
  | PopAnnotationToken<A>

function variance<A, B>(_: A): B {
  return _ as unknown as B
}

class EmptyToken<A> {
  readonly _tag = "EmptyToken"
  readonly _id: TypeId = TypeId
  readonly _A: (_: never) => A = variance
}

class CharToken<A> {
  readonly _tag = "CharToken"
  readonly _id: TypeId = TypeId
  readonly _A: (_: never) => A = variance
  constructor(readonly char: string) {}
}

class TextToken<A> {
  readonly _tag = "TextToken"
  readonly _id: TypeId = TypeId
  readonly _A: (_: never) => A = variance
  constructor(readonly text: string) {}
}

class LineToken<A> {
  readonly _tag = "LineToken"
  readonly _id: TypeId = TypeId
  readonly _A: (_: never) => A = variance
  constructor(readonly indentation: number) {}
}

class PushAnnotationToken<A> {
  readonly _tag = "PushAnnotationToken"
  readonly _id: TypeId = TypeId
  readonly _A: (_: never) => A = variance
  constructor(readonly annotation: A) {}
}

class PopAnnotationToken<A> {
  readonly _tag = "PopAnnotationToken"
  readonly _id: TypeId = TypeId
  readonly _A: (_: never) => A = variance
}

/** @internal */
export const empty: DocTreeToken<never> = new EmptyToken()

/** @internal */
export function char<A>(char: string): DocTreeToken<A> {
  return new CharToken(char)
}

/** @internal */
export function text<A>(text: string): DocTreeToken<A> {
  return new TextToken(text)
}

/** @internal */
export function line<A>(indentation: number): DocTreeToken<A> {
  return new LineToken(indentation)
}

/** @internal */
export function pushAnnotation<A>(annotation: A): DocTreeToken<A> {
  return new PushAnnotationToken(annotation)
}

/** @internal */
export const popAnnotation: DocTreeToken<never> = new PopAnnotationToken()
