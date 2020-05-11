import type { NonEmptyArray } from "../NonEmptyArray"
import type { Option } from "../Option/Option"

export type Exit<E, A> = Done<A> | Cause<E>
export type ExitTag = Exit<unknown, unknown>["_tag"]

export interface Done<A> {
  readonly _tag: "Done"
  readonly value: A
}

export type Cause<E> = Raise<E> | Abort | Interrupt

export interface Raise<E> {
  readonly _tag: "Raise"
  readonly error: E
  readonly remaining: Option<NonEmptyArray<Cause<any>>>
}

export interface Abort {
  readonly _tag: "Abort"
  readonly abortedWith: unknown
  readonly remaining: Option<NonEmptyArray<Cause<any>>>
}

export interface Interrupt {
  readonly _tag: "Interrupt"
  readonly errors?: Error[]
  readonly remaining: Option<NonEmptyArray<Cause<any>>>
}
