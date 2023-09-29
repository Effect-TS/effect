import { dual } from "../../Function"
import * as core from "../../internal/stm/core"
import * as Entry from "../../internal/stm/stm/entry"
import type * as Journal from "../../internal/stm/stm/journal"
import type * as TxnId from "../../internal/stm/stm/txnId"
import * as Versioned from "../../internal/stm/stm/versioned"
import * as Option from "../../Option"
import type * as STM from "../../STM"
import type * as TRef from "../../TRef"

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
export class TRefImpl<A> implements TRef.TRef<A> {
  readonly [TRefTypeId] = tRefVariance
  /** @internal */
  todos: Map<TxnId.TxnId, Journal.Todo>
  /** @internal */
  versioned: Versioned.Versioned<A>
  constructor(value: A) {
    this.versioned = new Versioned.Versioned(value)
    this.todos = new Map()
  }
  modify<B>(f: (a: A) => readonly [B, A]): STM.STM<never, never, B> {
    return core.effect<never, B>((journal) => {
      const entry = getOrMakeEntry(this, journal)
      const [retValue, newValue] = f(Entry.unsafeGet(entry) as A)
      Entry.unsafeSet(entry, newValue)
      return retValue
    })
  }
}

/** @internal */
export const make = <A>(value: A): STM.STM<never, never, TRef.TRef<A>> =>
  core.effect<never, TRef.TRef<A>>((journal) => {
    const ref = new TRefImpl(value)
    journal.set(ref, Entry.make(ref, true))
    return ref
  })

/** @internal */
export const get = <A>(self: TRef.TRef<A>) => self.modify((a) => [a, a])

/** @internal */
export const set = dual<
  <A>(value: A) => (self: TRef.TRef<A>) => STM.STM<never, never, void>,
  <A>(self: TRef.TRef<A>, value: A) => STM.STM<never, never, void>
>(
  2,
  <A>(self: TRef.TRef<A>, value: A): STM.STM<never, never, void> => self.modify((): [void, A] => [void 0, value])
)

/** @internal */
export const getAndSet = dual<
  <A>(value: A) => (self: TRef.TRef<A>) => STM.STM<never, never, A>,
  <A>(self: TRef.TRef<A>, value: A) => STM.STM<never, never, A>
>(2, (self, value) => self.modify((a) => [a, value]))

/** @internal */
export const getAndUpdate = dual<
  <A>(f: (a: A) => A) => (self: TRef.TRef<A>) => STM.STM<never, never, A>,
  <A>(self: TRef.TRef<A>, f: (a: A) => A) => STM.STM<never, never, A>
>(2, (self, f) => self.modify((a) => [a, f(a)]))

/** @internal */
export const getAndUpdateSome = dual<
  <A>(f: (a: A) => Option.Option<A>) => (self: TRef.TRef<A>) => STM.STM<never, never, A>,
  <A>(self: TRef.TRef<A>, f: (a: A) => Option.Option<A>) => STM.STM<never, never, A>
>(2, (self, f) =>
  self.modify((a) =>
    Option.match(f(a), {
      onNone: () => [a, a],
      onSome: (b) => [a, b]
    })
  ))

/** @internal */
export const setAndGet = dual<
  <A>(value: A) => (self: TRef.TRef<A>) => STM.STM<never, never, A>,
  <A>(self: TRef.TRef<A>, value: A) => STM.STM<never, never, A>
>(2, (self, value) => self.modify(() => [value, value]))

/** @internal */
export const modify = dual<
  <A, B>(f: (a: A) => readonly [B, A]) => (self: TRef.TRef<A>) => STM.STM<never, never, B>,
  <A, B>(self: TRef.TRef<A>, f: (a: A) => readonly [B, A]) => STM.STM<never, never, B>
>(2, (self, f) => self.modify(f))

/** @internal */
export const modifySome = dual<
  <A, B>(fallback: B, f: (a: A) => Option.Option<readonly [B, A]>) => (self: TRef.TRef<A>) => STM.STM<never, never, B>,
  <A, B>(self: TRef.TRef<A>, fallback: B, f: (a: A) => Option.Option<readonly [B, A]>) => STM.STM<never, never, B>
>(3, (self, fallback, f) =>
  self.modify((a) =>
    Option.match(f(a), {
      onNone: () => [fallback, a],
      onSome: (b) => b
    })
  ))

/** @internal */
export const update = dual<
  <A>(f: (a: A) => A) => (self: TRef.TRef<A>) => STM.STM<never, never, void>,
  <A>(self: TRef.TRef<A>, f: (a: A) => A) => STM.STM<never, never, void>
>(2, (self, f) => self.modify((a) => [void 0, f(a)]))

/** @internal */
export const updateAndGet = dual<
  <A>(f: (a: A) => A) => (self: TRef.TRef<A>) => STM.STM<never, never, A>,
  <A>(self: TRef.TRef<A>, f: (a: A) => A) => STM.STM<never, never, A>
>(2, (self, f) =>
  self.modify((a) => {
    const b = f(a)
    return [b, b]
  }))

/** @internal */
export const updateSome = dual<
  <A>(f: (a: A) => Option.Option<A>) => (self: TRef.TRef<A>) => STM.STM<never, never, void>,
  <A>(self: TRef.TRef<A>, f: (a: A) => Option.Option<A>) => STM.STM<never, never, void>
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
  <A>(f: (a: A) => Option.Option<A>) => (self: TRef.TRef<A>) => STM.STM<never, never, A>,
  <A>(self: TRef.TRef<A>, f: (a: A) => Option.Option<A>) => STM.STM<never, never, A>
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
const getOrMakeEntry = <A>(self: TRef.TRef<A>, journal: Journal.Journal): Entry.Entry => {
  if (journal.has(self)) {
    return journal.get(self)!
  }
  const entry = Entry.make(self, false)
  journal.set(self, entry)
  return entry
}

/** @internal */
export const unsafeGet: {
  (journal: Journal.Journal): <A>(self: TRef.TRef<A>) => A
  <A>(self: TRef.TRef<A>, journal: Journal.Journal): A
} = dual<
  (journal: Journal.Journal) => <A>(self: TRef.TRef<A>) => A,
  <A>(self: TRef.TRef<A>, journal: Journal.Journal) => A
>(2, <A>(self: TRef.TRef<A>, journal: Journal.Journal) => Entry.unsafeGet(getOrMakeEntry(self, journal)) as A)

/** @internal */
export const unsafeSet: {
  <A>(value: A, journal: Journal.Journal): (self: TRef.TRef<A>) => void
  <A>(self: TRef.TRef<A>, value: A, journal: Journal.Journal): void
} = dual<
  <A>(value: A, journal: Journal.Journal) => (self: TRef.TRef<A>) => void,
  <A>(self: TRef.TRef<A>, value: A, journal: Journal.Journal) => void
>(3, (self, value, journal) => {
  const entry = getOrMakeEntry(self, journal)
  Entry.unsafeSet(entry, value)
  return undefined
})
