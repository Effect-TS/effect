import * as A from "../Array"
import * as L from "../List"

export abstract class Chunk<A> implements Iterable<A> {
  abstract length(): number
  abstract get(i: number): A | undefined
  abstract [Symbol.iterator](): Iterator<A>
}

function* genOf<A>(a: A) {
  yield a
}

function* concatGen<A, B>(l: Chunk<A>, r: Chunk<B>) {
  yield* l
  yield* r
}

export class ChunkSingle<A> extends Chunk<A> {
  readonly _tag = "ChunkSingle"

  constructor(readonly a: A) {
    super()
  }

  get(i: number) {
    return i === 0 ? this.a : undefined
  }

  length() {
    return 1
  }

  [Symbol.iterator](): Iterator<A> {
    return genOf(this.a)
  }
}

export class ChunkArray<A> extends Chunk<A> {
  readonly _tag = "ChunkArray"

  constructor(readonly arr: readonly A[]) {
    super()
  }

  get(i: number) {
    return this.arr[i]
  }

  length() {
    return this.arr.length
  }

  [Symbol.iterator](): Iterator<A> {
    return this.arr[Symbol.iterator]()
  }
}

export class ChunkList<A> extends Chunk<A> {
  readonly _tag = "ChunkList"

  constructor(readonly list: L.List<A>) {
    super()
  }

  get(i: number) {
    return L.unsafeNth_(this.list, i)
  }

  length() {
    return this.list.length
  }

  [Symbol.iterator](): Iterator<A> {
    return this.list[Symbol.iterator]()
  }
}

export class ChunkConcat<A, B> extends Chunk<A | B> {
  readonly _tag = "ChunkConcat"

  constructor(readonly l: Chunk<A>, readonly r: Chunk<B>) {
    super()
  }

  get(i: number) {
    return i >= this.l.length() ? this.r.get(i - this.l.length()) : this.l.get(i)
  }

  length() {
    return this.l.length() + this.r.length()
  }

  [Symbol.iterator](): Iterator<A | B> {
    return concatGen(this.l, this.r)
  }
}

export class ChunkBuffer extends Chunk<number> {
  readonly _tag = "ChunkBuffer"

  constructor(readonly buf: Buffer) {
    super()
  }

  get(i: number) {
    return this.buf[i]
  }

  length() {
    return this.buf.length
  }

  map<B>(f: (a: number) => B) {
    return new ChunkList(L.map_(L.from(this.buf), f))
  }

  [Symbol.iterator](): Iterator<number> {
    return this.buf[Symbol.iterator]()
  }
}

export class ChunkEmpty extends Chunk<never> {
  readonly _tag = "ChunkEmpty"

  constructor() {
    super()
  }

  get() {
    return undefined
  }

  length() {
    return 0
  }

  map() {
    return new ChunkEmpty()
  }

  [Symbol.iterator](): Iterator<never> {
    return A.empty[Symbol.iterator]()
  }
}

/**
 * @optimize identity
 */
export function concrete<A>(
  self: Chunk<A>
):
  | ChunkSingle<A>
  | ChunkConcat<A, A>
  | ChunkEmpty
  | ChunkArray<A>
  | ChunkList<A>
  | ChunkBuffer
export function concrete(self: any): any {
  return self
}

export function buffer(self: Buffer): Chunk<number> {
  return new ChunkBuffer(self)
}

export function array<A>(self: A.Array<A>): Chunk<A> {
  return new ChunkArray(self)
}

export function list<A>(self: L.List<A>): Chunk<A> {
  return new ChunkList(self)
}

export function single<A>(self: A): Chunk<A> {
  return new ChunkSingle(self)
}

export function concat_<A, B>(left: Chunk<A>, right: Chunk<B>): Chunk<A | B> {
  return new ChunkConcat(left, right)
}

/**
 * @dataFirst concat_
 */
export function concat<B>(right: Chunk<B>): <A>(left: Chunk<A>) => Chunk<A | B> {
  return (left) => new ChunkConcat(left, right)
}

export function empty<A = never>(): Chunk<A> {
  return new ChunkEmpty()
}

export function drop_<A>(self: Chunk<A>, n: number): Chunk<A> {
  const c = concrete(self)
  switch (c._tag) {
    case "ChunkArray": {
      return new ChunkArray(A.dropLeft_(c.arr, n))
    }
    case "ChunkList": {
      return new ChunkList(L.drop_(c.list, n))
    }
    case "ChunkSingle": {
      return n === 0 ? c : new ChunkEmpty()
    }
    case "ChunkConcat": {
      if (n > c.l.length()) {
        return drop_(c.r, n - c.l.length())
      } else {
        return new ChunkConcat(drop_(c.l, n), c.r)
      }
    }
    case "ChunkBuffer": {
      return new ChunkBuffer(c.buf.slice(n, c.buf.length)) as any
    }
    case "ChunkEmpty": {
      return c
    }
  }
}

/**
 * @dataFirst drop_
 */
export function drop(n: number): <A>(self: Chunk<A>) => Chunk<A> {
  return (self) => drop_(self, n)
}

export function get_<A>(self: Chunk<A>, i: number): A | undefined {
  return self.get(i)
}

/**
 * @dataFirst get_
 */
export function get(i: number): <A>(self: Chunk<A>) => A | undefined {
  return (self) => self.get(i)
}

export function toArray<A>(self: Chunk<A>): A.Array<A> {
  const c = concrete(self)
  switch (c._tag) {
    case "ChunkArray": {
      return c.arr
    }
    case "ChunkList": {
      return L.toArray(c.list)
    }
    case "ChunkSingle": {
      return [c.a]
    }
    case "ChunkConcat": {
      return [...toArray(c.l), ...toArray(c.r)]
    }
    case "ChunkBuffer": {
      return Array.from(c.buf) as any
    }
    case "ChunkEmpty": {
      return []
    }
  }
}

/**
 * @dataFirst map_
 */
export function map<A, B>(f: (a: A) => B) {
  return (self: Chunk<A>) => map_(self, f)
}

export function map_<A, B>(self: Chunk<A>, f: (a: A) => B): Chunk<B> {
  const c = concrete(self)
  switch (c._tag) {
    case "ChunkArray": {
      return new ChunkArray(c.arr.map(f))
    }
    case "ChunkList": {
      return new ChunkList(L.map_(c.list, f))
    }
    case "ChunkBuffer": {
      return new ChunkList(L.map_(L.from(c.buf) as any, f))
    }
    case "ChunkEmpty": {
      return c
    }
    case "ChunkSingle": {
      return new ChunkSingle(f(c.a))
    }
    case "ChunkConcat": {
      return new ChunkConcat(map_(c.l, f), map_(c.r, f))
    }
  }
}

export function reduce_<A, B>(self: Chunk<A>, b: B, f: (b: B, a: A) => B): B {
  let x = b
  for (const y of self) {
    x = f(x, y)
  }
  return x
}

export function reduce<A, B>(b: B, f: (b: B, a: A) => B): (self: Chunk<A>) => B {
  return (self) => reduce_(self, b, f)
}
