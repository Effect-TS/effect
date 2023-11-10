import { dual } from "../../Function.js"
import { Option } from "../../Option.js"
import type { STM } from "../../STM.js"
import type { TRef } from "../../TRef.js"
import * as core from "./core.js"
import * as Entry from "./stm/entry.js"
import type * as Journal from "./stm/journal.js"
import type { TxnId } from "./stm/txnId.js"
import { Versioned } from "./stm/versioned.js"

/** @internal */
const TRefSymbolKey = "effect/TRef"

/** @internal */
export const TRefTypeId: TRef.TRefTypeId = Symbol.for(
  TRefSymbolKey
) as TRef.TRefTypeId

/** @internal */
const tRefVariance = {
  _A: (_: never) => _
}

/** @internal */
export class TRefImpl<A> implements TRef<A> {
  readonly [TRefTypeId] = tRefVariance
  /** @internal */
  todos: Map<TxnId, Journal.Todo>
  /** @internal */
  versioned: Versioned<A>
  constructor(value: A) {
    this.versioned = new Versioned(value)
    this.todos = new Map()
  }
  modify<B>(f: (a: A) => readonly [B, A]): STM<never, never, B> {
    return core.effect<never, B>((journal) => {
      const entry = getOrMakeEntry(this, journal)
      const [retValue, newValue] = f(Entry.unsafeGet(entry) as A)
      Entry.unsafeSet(entry, newValue)
      return retValue
    })
  }
}

/** @internal */
export const make = <A>(value: A): STM<never, never, TRef<A>> =>
  core.effect<never, TRef<A>>((journal) => {
    const ref = new TRefImpl(value)
    journal.set(ref, Entry.make(ref, true))
    return ref
  })

/** @internal */
export const get = <A>(self: TRef<A>) => self.modify((a) => [a, a])

/** @internal */
export const set = dual<
  <A>(value: A) => (self: TRef<A>) => STM<never, never, void>,
  <A>(self: TRef<A>, value: A) => STM<never, never, void>
>(
  2,
  <A>(self: TRef<A>, value: A): STM<never, never, void> => self.modify((): [void, A] => [void 0, value])
)

/** @internal */
export const getAndSet = dual<
  <A>(value: A) => (self: TRef<A>) => STM<never, never, A>,
  <A>(self: TRef<A>, value: A) => STM<never, never, A>
>(2, (self, value) => self.modify((a) => [a, value]))

/** @internal */
export const getAndUpdate = dual<
  <A>(f: (a: A) => A) => (self: TRef<A>) => STM<never, never, A>,
  <A>(self: TRef<A>, f: (a: A) => A) => STM<never, never, A>
>(2, (self, f) => self.modify((a) => [a, f(a)]))

/** @internal */
export const getAndUpdateSome = dual<
  <A>(f: (a: A) => Option<A>) => (self: TRef<A>) => STM<never, never, A>,
  <A>(self: TRef<A>, f: (a: A) => Option<A>) => STM<never, never, A>
>(2, (self, f) =>
  self.modify((a) =>
    Option.match(f(a), {
      onNone: () => [a, a],
      onSome: (b) => [a, b]
    })
  ))

/** @internal */
export const setAndGet = dual<
  <A>(value: A) => (self: TRef<A>) => STM<never, never, A>,
  <A>(self: TRef<A>, value: A) => STM<never, never, A>
>(2, (self, value) => self.modify(() => [value, value]))

/** @internal */
export const modify = dual<
  <A, B>(f: (a: A) => readonly [B, A]) => (self: TRef<A>) => STM<never, never, B>,
  <A, B>(self: TRef<A>, f: (a: A) => readonly [B, A]) => STM<never, never, B>
>(2, (self, f) => self.modify(f))

/** @internal */
export const modifySome = dual<
  <A, B>(fallback: B, f: (a: A) => Option<readonly [B, A]>) => (self: TRef<A>) => STM<never, never, B>,
  <A, B>(self: TRef<A>, fallback: B, f: (a: A) => Option<readonly [B, A]>) => STM<never, never, B>
>(3, (self, fallback, f) =>
  self.modify((a) =>
    Option.match(f(a), {
      onNone: () => [fallback, a],
      onSome: (b) => b
    })
  ))

/** @internal */
export const update = dual<
  <A>(f: (a: A) => A) => (self: TRef<A>) => STM<never, never, void>,
  <A>(self: TRef<A>, f: (a: A) => A) => STM<never, never, void>
>(2, (self, f) => self.modify((a) => [void 0, f(a)]))

/** @internal */
export const updateAndGet = dual<
  <A>(f: (a: A) => A) => (self: TRef<A>) => STM<never, never, A>,
  <A>(self: TRef<A>, f: (a: A) => A) => STM<never, never, A>
>(2, (self, f) =>
  self.modify((a) => {
    const b = f(a)
    return [b, b]
  }))

/** @internal */
export const updateSome = dual<
  <A>(f: (a: A) => Option<A>) => (self: TRef<A>) => STM<never, never, void>,
  <A>(self: TRef<A>, f: (a: A) => Option<A>) => STM<never, never, void>
>(
  2,
  (self, f) =>
    self.modify((a) => [
      void 0,
      Option.match(f(a), {
        onNone: () => a,
        onSome: (b) => b
      })
    ])
)

/** @internal */
export const updateSomeAndGet = dual<
  <A>(f: (a: A) => Option<A>) => (self: TRef<A>) => STM<never, never, A>,
  <A>(self: TRef<A>, f: (a: A) => Option<A>) => STM<never, never, A>
>(
  2,
  (self, f) =>
    self.modify((a) =>
      Option.match(f(a), {
        onNone: () => [a, a],
        onSome: (b) => [b, b]
      })
    )
)

/** @internal */
const getOrMakeEntry = <A>(self: TRef<A>, journal: Journal.Journal): Entry.Entry => {
  if (journal.has(self)) {
    return journal.get(self)!
  }
  const entry = Entry.make(self, false)
  journal.set(self, entry)
  return entry
}

/** @internal */
export const unsafeGet: {
  (journal: Journal.Journal): <A>(self: TRef<A>) => A
  <A>(self: TRef<A>, journal: Journal.Journal): A
} = dual<
  (journal: Journal.Journal) => <A>(self: TRef<A>) => A,
  <A>(self: TRef<A>, journal: Journal.Journal) => A
>(2, <A>(self: TRef<A>, journal: Journal.Journal) => Entry.unsafeGet(getOrMakeEntry(self, journal)) as A)

/** @internal */
export const unsafeSet: {
  <A>(value: A, journal: Journal.Journal): (self: TRef<A>) => void
  <A>(self: TRef<A>, value: A, journal: Journal.Journal): void
} = dual<
  <A>(value: A, journal: Journal.Journal) => (self: TRef<A>) => void,
  <A>(self: TRef<A>, value: A, journal: Journal.Journal) => void
>(3, (self, value, journal) => {
  const entry = getOrMakeEntry(self, journal)
  Entry.unsafeSet(entry, value)
  return undefined
})
