// ported from https://github.com/gcanti/io-ts/blob/master/src/DecodeError.ts
import * as FS from "./FreeAssociative"

import { Associative } from "@matechs/preview/Associative"

export interface Leaf<E> {
  readonly _tag: "Leaf"
  readonly actual: unknown
  readonly error: E
}

export const required = "required"

export const optional = "optional"

export type Kind = "required" | "optional"

export interface Key<E> {
  readonly _tag: "Key"
  readonly key: string
  readonly kind: Kind
  readonly errors: FS.FreeAssociative<DecodeErrorE<E>>
}

export interface Index<E> {
  readonly _tag: "Index"
  readonly index: number
  readonly kind: Kind
  readonly errors: FS.FreeAssociative<DecodeErrorE<E>>
}

export interface Member<E> {
  readonly _tag: "Member"
  readonly index: number
  readonly errors: FS.FreeAssociative<DecodeErrorE<E>>
}

export interface Lazy<E> {
  readonly _tag: "Lazy"
  readonly id: string
  readonly errors: FS.FreeAssociative<DecodeErrorE<E>>
}

export interface Wrap<E> {
  readonly _tag: "Wrap"
  readonly error: E
  readonly errors: FS.FreeAssociative<DecodeErrorE<E>>
}

export type DecodeErrorE<E> =
  | Leaf<E>
  | Key<E>
  | Index<E>
  | Member<E>
  | Lazy<E>
  | Wrap<E>

export const leaf = <E>(actual: unknown, error: E): DecodeErrorE<E> => ({
  _tag: "Leaf",
  actual,
  error
})

export const key = <E>(
  key: string,
  kind: Kind,
  errors: FS.FreeAssociative<DecodeErrorE<E>>
): DecodeErrorE<E> => ({
  _tag: "Key",
  key,
  kind,
  errors
})

export const index = <E>(
  index: number,
  kind: Kind,
  errors: FS.FreeAssociative<DecodeErrorE<E>>
): DecodeErrorE<E> => ({
  _tag: "Index",
  index,
  kind,
  errors
})

export const member = <E>(
  index: number,
  errors: FS.FreeAssociative<DecodeErrorE<E>>
): DecodeErrorE<E> => ({
  _tag: "Member",
  index,
  errors
})

export const lazy = <E>(
  id: string,
  errors: FS.FreeAssociative<DecodeErrorE<E>>
): DecodeErrorE<E> => ({
  _tag: "Lazy",
  id,
  errors
})

export const wrap = <E>(
  error: E,
  errors: FS.FreeAssociative<DecodeErrorE<E>>
): DecodeErrorE<E> => ({
  _tag: "Wrap",
  error,
  errors
})

export const fold = <E, R>(patterns: {
  Leaf: (input: unknown, error: E) => R
  Key: (key: string, kind: Kind, errors: FS.FreeAssociative<DecodeErrorE<E>>) => R
  Index: (index: number, kind: Kind, errors: FS.FreeAssociative<DecodeErrorE<E>>) => R
  Member: (index: number, errors: FS.FreeAssociative<DecodeErrorE<E>>) => R
  Lazy: (id: string, errors: FS.FreeAssociative<DecodeErrorE<E>>) => R
  Wrap: (error: E, errors: FS.FreeAssociative<DecodeErrorE<E>>) => R
}): ((e: DecodeErrorE<E>) => R) => {
  const f = (e: DecodeErrorE<E>): R => {
    switch (e._tag) {
      case "Leaf":
        return patterns.Leaf(e.actual, e.error)
      case "Key":
        return patterns.Key(e.key, e.kind, e.errors)
      case "Index":
        return patterns.Index(e.index, e.kind, e.errors)
      case "Member":
        return patterns.Member(e.index, e.errors)
      case "Lazy":
        return patterns.Lazy(e.id, e.errors)
      case "Wrap":
        return patterns.Wrap(e.error, e.errors)
    }
  }
  return f
}

export function getAssociative<E = never>(): Associative<
  FS.FreeAssociative<DecodeErrorE<E>>
> {
  return FS.getAssociative()
}
