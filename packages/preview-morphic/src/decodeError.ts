import { FreeAssociative } from "./FreeAssociative"

import { identity } from "@matechs/preview/Function"
import { Show } from "@matechs/preview/_abstract/Show"

export class Message<E> {
  readonly _tag = "Message"

  constructor(readonly value: E) {}
}

export class Constant<E> {
  readonly _tag = "Constant"

  constructor(readonly value: E, readonly actual: unknown) {}
}

export class Key<E> {
  readonly _tag = "Key"

  constructor(readonly key: string, readonly value: FreeAssociative<DecodeError<E>>) {}
}

export type DecodeError<E> = Constant<E> | Key<E> | Message<E>

export function prettyDE<E>(e: DecodeError<E>, S: Show<E>): string {
  switch (e._tag) {
    case "Constant": {
      let current: string
      try {
        current = `(actual: ${JSON.stringify(e.actual)})`
      } catch {
        current = "(unknown)"
      }
      return `${S.show(e.value)} ${current}`
    }
    case "Key": {
      return `${e.key}: ${pretty(e.value, S)}`
    }
    case "Message": {
      return S.show(e.value)
    }
  }
}

export function pretty<E>(
  e: FreeAssociative<DecodeError<E>>,
  S: Show<E>,
  ind = 0
): string {
  switch (e._tag) {
    case "Of": {
      return `${prettyDE(e.value, S)}`
    }
    case "Concat": {
      return `${pretty(e.left, S, ind + 2)}\r\n${pretty(e.right, S, ind + 2)}`
    }
  }
}

export function prettyStr(e: FreeAssociative<DecodeError<string>>): string {
  return pretty(e, { show: identity })
}

export function constant<E>(e: E, actual: unknown): DecodeError<E> {
  return new Constant(e, actual)
}

export function message<E>(e: E): DecodeError<E> {
  return new Message(e)
}

export function key(
  key: string
): <E>(e: FreeAssociative<DecodeError<E>>) => DecodeError<E> {
  return (e) => new Key(key, e)
}
