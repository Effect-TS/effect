/**
 * tracing: off
 */
import * as A from "../Array"
import type { Predicate, Refinement } from "../Function"
import * as O from "../Option"

export interface Chunk<A> extends Readonly<ArrayLike<A>>, Iterable<A> {}

export interface NonEmptyChunk<A> extends Readonly<ArrayLike<A>>, Iterable<A> {
  readonly 0: A
}

/**
 * @optimize identity
 */
export function buffer<A>(
  id:
    | Uint8Array
    | Uint16Array
    | Uint32Array
    | Uint8ClampedArray
    | Int8Array
    | Int16Array
    | Int32Array
): Chunk<A> {
  return id as any
}

export function isTyped(
  self: Chunk<unknown>
): self is
  | Buffer
  | Uint8Array
  | Uint16Array
  | Uint32Array
  | Uint8ClampedArray
  | Int8Array
  | Int16Array
  | Int32Array {
  return "subarray" in self
}

export function dropLeft_<A>(self: Chunk<A>, n: number): Chunk<A> {
  if (isTyped(self)) {
    return buffer(self.subarray(n, self.length))
  }
  if (Array.isArray(self)) {
    return A.dropLeft_(self, n)
  }
  return A.dropLeft_(Array.from(self), n)
}

export const empty: Chunk<never> = A.empty

export function isEmpty<A>(self: Chunk<A>): boolean {
  return self.length === 0
}

export function isNonEmpty<A>(self: Chunk<A>): self is NonEmptyChunk<A> {
  return self.length > 0
}

export function map_<A, B>(self: Chunk<A>, f: (a: A) => B): Chunk<B> {
  if (Array.isArray(self)) {
    return self.map(f)
  }
  return Array.from(self).map(f)
}

/**
 * @dataFirst map_
 */
export function map<A, B>(f: (a: A) => B) {
  return (self: Chunk<A>) => map_(self, f)
}

export function reduce_<A, B>(fa: Chunk<A>, b: B, f: (b: B, a: A) => B): B {
  let x = b
  for (const y of fa) {
    x = f(x, y)
  }
  return x
}

export function reduceRight_<A, B>(fa: Chunk<A>, b: B, f: (a: A, b: B) => B): B {
  if (isEmpty(fa)) {
    return b
  }
  let x = b
  for (let i = fa.length; i > 0; i--) {
    x = f(fa[i], x)
  }
  return x
}

export function head<A>(as: Chunk<A>): O.Option<A> {
  return as.length > 0 ? O.some(as[0]) : O.none
}

export function last<A>(as: Chunk<A>): O.Option<A> {
  return as.length > 0 ? O.some(as[as.length - 1]) : O.none
}

export function splitAt_<A>(as: Chunk<A>, n: number): readonly [Chunk<A>, Chunk<A>] {
  if (isTyped(as)) {
    return [buffer(as.subarray(0, n)), buffer(as.subarray(n))]
  }
  if (Array.isArray(as)) {
    return [as.slice(0, n), as.slice(n)]
  }
  const as_ = Array.from(as)
  return [as_.slice(0, n), as_.slice(n)]
}

export function single<A>(a: A): Chunk<A> {
  return [a]
}

export function concat_<A>(x: Chunk<A>, y: Chunk<A>): Chunk<A> {
  if (Buffer && Buffer.isBuffer(x) && Buffer.isBuffer(y)) {
    return buffer(Buffer.concat([x, y]))
  }
  const lenx = x.length
  if (lenx === 0) {
    return y
  }
  const leny = y.length
  if (leny === 0) {
    return x
  }
  const r = Array(lenx + leny)
  for (let i = 0; i < lenx; i++) {
    r[i] = x[i]
  }
  for (let i = 0; i < leny; i++) {
    r[i + lenx] = y[i]
  }
  return r
}

export const spanIndex_ = <A>(as: Chunk<A>, predicate: Predicate<A>): number => {
  const l = as.length
  let i = 0
  for (; i < l; i++) {
    if (!predicate(as[i])) {
      break
    }
  }
  return i
}

export function dropWhile_<A>(as: Chunk<A>, predicate: Predicate<A>): Chunk<A> {
  const i = spanIndex_(as, predicate)
  if (isTyped(as)) {
    return buffer(as.subarray(i, as.length))
  }
  const l = as.length
  const rest = Array(l - i)
  for (let j = i; j < l; j++) {
    rest[j - i] = as[j]
  }
  return rest
}

export function filter<A, B extends A>(
  refinement: Refinement<A, B>
): (fa: Chunk<A>) => Chunk<B>
export function filter<A>(predicate: Predicate<A>): (fa: Chunk<A>) => Chunk<A>
export function filter<A>(predicate: Predicate<A>): (fa: Chunk<A>) => Chunk<A> {
  return (self) => {
    if (isTyped(self)) {
      return buffer(self.filter(predicate as any))
    }
    if (Array.isArray(self)) {
      return self.filter(predicate)
    }
    return Array.from(self).filter(predicate)
  }
}

export function filterMap_<A, B>(self: Chunk<A>, f: (a: A) => O.Option<B>): Chunk<B> {
  if (Array.isArray(self)) {
    return A.filterMap_(self, f)
  }
  return A.filterMap_(Array.from(self), f)
}

/**
 * @dataFirst filterMap_
 */
export function filterMap<A, B>(f: (a: A) => O.Option<B>): (fa: Chunk<A>) => Chunk<B> {
  return (self) => filterMap_(self, f)
}

export const range: (start: number, end: number) => Chunk<number> = A.range

export function collectWhileMap_<A, B>(
  arr: Chunk<A>,
  f: (x: A) => O.Option<B>
): Chunk<B> {
  const result: B[] = []

  for (let i = 0; i < arr.length; i++) {
    const o = f(arr[i])

    if (O.isSome(o)) {
      result.push(o.value)
    } else {
      break
    }
  }

  return result
}

export function collectWhile_<A, A1 extends A>(
  arr: Chunk<A>,
  f: Refinement<A, A1>
): Chunk<A1>
export function collectWhile_<A>(arr: Chunk<A>, f: Predicate<A>): Chunk<A>
export function collectWhile_<A>(arr: Chunk<A>, f: Predicate<A>): Chunk<A> {
  let j = arr.length
  for (let i = 0; i < arr.length; i++) {
    if (!f(arr[i])) {
      j = i
      break
    }
  }

  if (isTyped(arr)) {
    return buffer(arr.subarray(0, j))
  }
  if (Array.isArray(arr)) {
    return arr.slice(0, j)
  }
  return Array.from(arr).slice(0, j)
}

export function chain_<A, B>(fa: Chunk<A>, f: (a: A) => Chunk<B>): Chunk<B> {
  let resLen = 0
  const l = fa.length
  const temp = new Array(l)
  for (let i = 0; i < l; i++) {
    const e = fa[i]
    const arr = f(e)
    resLen += arr.length
    temp[i] = arr
  }
  const r = Array(resLen)
  let start = 0
  for (let i = 0; i < l; i++) {
    const arr = temp[i]
    const l = arr.length
    for (let j = 0; j < l; j++) {
      r[j + start] = arr[j]
    }
    start += l
  }
  return r
}

export function takeLeft_<A>(as: Chunk<A>, n: number): Chunk<A> {
  if (isTyped(as)) {
    return buffer(as.subarray(0, n))
  }
  if (Array.isArray(as)) {
    return as.slice(0, n)
  }
  return Array.from(as).slice(0, n)
}

export function asBuffer(self: Chunk<number>): Buffer {
  if (Buffer && Buffer.isBuffer(self)) {
    return self
  }
  return Buffer.from(self)
}

export function asArray<A>(self: Chunk<A>): A.Array<A> {
  if (Array.isArray(self)) {
    return self
  }
  return Array.from(self)
}
