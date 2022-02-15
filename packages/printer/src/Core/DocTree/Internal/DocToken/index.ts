// ets_tracing: off

import { identity } from "@effect-ts/core/Function"

// -----------------------------------------------------------------------------
// model
// -----------------------------------------------------------------------------

export type DocToken<A> =
  | EmptyToken<A>
  | CharToken<A>
  | TextToken<A>
  | LineToken<A>
  | PushAnnotationToken<A>
  | PopAnnotationToken<A>

export class EmptyToken<A> {
  readonly _tag = "EmptyToken"
  readonly _A!: () => A
  constructor(readonly id: (_: never) => A) {}
}

export class CharToken<A> {
  readonly _tag = "CharToken"
  readonly _A!: () => A
  constructor(readonly char: string, readonly id: (_: never) => A) {}
}

export class TextToken<A> {
  readonly _tag = "TextToken"
  readonly _A!: () => A
  constructor(readonly text: string, readonly id: (_: never) => A) {}
}

export class LineToken<A> {
  readonly _tag = "LineToken"
  readonly _A!: () => A
  constructor(readonly indentation: number, readonly id: (_: never) => A) {}
}

export class PushAnnotationToken<A> {
  readonly _tag = "PushAnnotationToken"
  readonly _A!: () => A
  constructor(readonly annotation: A) {}
}

export class PopAnnotationToken<A> {
  readonly _tag = "PopAnnotationToken"
  readonly _A!: () => A
  constructor(readonly id: (_: never) => A) {}
}

// -----------------------------------------------------------------------------
// constructors
// -----------------------------------------------------------------------------

export const empty: DocToken<never> = new EmptyToken(identity)

export function char<A>(char: string): DocToken<A> {
  return new CharToken(char, identity)
}

export function text<A>(text: string): DocToken<A> {
  return new TextToken(text, identity)
}

export function line<A>(indentation: number): DocToken<A> {
  return new LineToken(indentation, identity)
}

export function pushAnnotation<A>(annotation: A): DocToken<A> {
  return new PushAnnotationToken(annotation)
}

export const popAnnotation: DocToken<never> = new PopAnnotationToken(identity)
