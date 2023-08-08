/**
 * @since 1.0.0
 */
import { dual } from "@effect/data/Function"
import * as HashMap from "@effect/data/HashMap"

/**
 * @since 1.0.0
 * @category models
 */
export interface Headers extends HashMap.HashMap<string, string> {}

/**
 * @since 1.0.0
 * @category models
 */
export type Input = Headers | Readonly<Record<string, string>> | Iterable<readonly [string, string]>

/**
 * @since 1.0.0
 * @category constructors
 */
export const empty: Headers = HashMap.empty()

/**
 * @since 1.0.0
 * @category constructors
 */
export const fromInput: (input?: Input) => Headers = (input) => {
  if (input === undefined) {
    return empty
  } else if (HashMap.isHashMap(input)) {
    return input
  } else if (Symbol.iterator in input) {
    return HashMap.fromIterable([...input].map(([k, v]) => [k.toLowerCase(), v])) as Headers
  }
  return HashMap.fromIterable(Object.entries(input).map(([k, v]) => [k.toLowerCase(), v]))
}

/**
 * @since 1.0.0
 * @category combinators
 */
export const set = dual<
  (key: string, value: string) => (self: Headers) => Headers,
  (self: Headers, key: string, value: string) => Headers
>(3, (self, key, value) => HashMap.set(self, key.toLowerCase(), value))

/**
 * @since 1.0.0
 * @category combinators
 */
export const setAll = dual<
  (headers: Input) => (self: Headers) => Headers,
  (self: Headers, headers: Input) => Headers
>(2, (self, headers) =>
  HashMap.union(
    self,
    fromInput(headers)
  ))

/**
 * @since 1.0.0
 * @category combinators
 */
export const remove = dual<
  (key: string) => (self: Headers) => Headers,
  (self: Headers, key: string) => Headers
>(2, (self, key) => HashMap.remove(self, key.toLowerCase()))
