import type { Either } from "../Either/either"

export const left = <E>(_: E): Either<E, never> => ({
  _tag: "Left",
  left: _
})

export const right = <A>(_: A): Either<never, A> => ({
  _tag: "Right",
  right: _
})
