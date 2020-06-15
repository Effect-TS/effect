import { FiberID } from "../Fiber/id"

export type Cause<E> = Empty | Fail<E> | Die | Interrupt | Then<E> | Both<E>

export interface Empty {
  readonly _tag: "Empty"
}

export interface Fail<E> {
  readonly _tag: "Fail"
  readonly value: E
}

export interface Die {
  readonly _tag: "Die"
  readonly value: unknown
}

export interface Interrupt {
  readonly _tag: "Interrupt"
  readonly fiberId: FiberID
}

export interface Then<E> {
  readonly _tag: "Then"
  readonly left: Cause<E>
  readonly right: Cause<E>
}

export interface Both<E> {
  readonly _tag: "Both"
  readonly left: Cause<E>
  readonly right: Cause<E>
}

export const Empty: Cause<never> = {
  _tag: "Empty"
}

export const Fail = <E>(value: E): Cause<E> => ({
  _tag: "Fail",
  value
})

export const Die = (value: unknown): Cause<never> => ({
  _tag: "Die",
  value
})

export const Interrupt = (fiberId: FiberID): Cause<never> => ({
  _tag: "Interrupt",
  fiberId
})

export const Then = <E1, E2>(left: Cause<E1>, right: Cause<E2>): Cause<E1 | E2> =>
  left === Empty
    ? right
    : right === Empty
    ? left
    : {
        _tag: "Then",
        left,
        right
      }

export const Both = <E1, E2>(left: Cause<E1>, right: Cause<E2>): Cause<E1 | E2> =>
  left === Empty
    ? right
    : right === Empty
    ? left
    : {
        _tag: "Both",
        left,
        right
      }
