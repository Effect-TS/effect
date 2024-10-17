import * as HashMap from "effect/HashMap"
import * as HashSet from "effect/HashSet"
import * as Option from "effect/Option"
import * as Schema from "effect/Schema"

/** @internal */
export function NotAMessageWithReplierDefect(message: unknown): unknown {
  return { _tag: "./NotAMessageWithReplierDefect", message }
}

/** @internal */
export function MessageReturnedNotingDefect(message: unknown): unknown {
  return { _tag: "./MessageReturnedNotingDefect", message }
}

/** @internal */
export function minByOption<A>(f: (value: A) => number) {
  return (fa: Iterable<A>) => {
    let current: Option.Option<A> = Option.none()
    for (const item of fa) {
      if (Option.isNone(current)) {
        current = Option.some(item)
      } else {
        if (f(item) < f(current.value)) {
          current = Option.some(item)
        }
      }
    }
    return current
  }
}

/** @internal */
export function groupBy<A, K>(f: (value: A) => K) {
  return (fa: Iterable<A>) => {
    let current = HashMap.empty<K, HashSet.HashSet<A>>()
    for (const item of fa) {
      const k = f(item)
      if (HashMap.has(current, k)) {
        current = HashMap.modify(current, k, HashSet.add(item))
      } else {
        current = HashMap.set(current, k, HashSet.fromIterable([item]))
      }
    }
    return current
  }
}

/** @internal */
export const TypeIdSchema = <Key extends string, Symbol extends symbol>(key: Key, symbol: Symbol) =>
  Schema.Literal(key).pipe(
    Schema.compose(Schema.Symbol, { strict: false }),
    Schema.compose(Schema.UniqueSymbolFromSelf(symbol), { strict: false })
  )
