import * as MHM from "../../Collections/Mutable/HashMap"
import type * as EQ from "../../Equal"
import type * as H from "../../Hash"
import * as I from "../../Iterable"
import * as O from "../../Option"

export class HashSet<A> {
  private hashMap: MHM.HashMap<A, boolean>

  constructor(E: EQ.Equal<A>, H: H.Hash<A>) {
    this.hashMap = MHM.make(E, H)
  }

  size(): number {
    return this.hashMap.length.get
  }

  isEmpty(): boolean {
    return this.size() === 0
  }

  contains(a: A): boolean {
    return O.getOrElse_(this.hashMap.get(a), () => false)
  }

  add(a: A): boolean {
    this.hashMap.set(a, true)
    return this.contains(a)
  }

  remove(a: A): boolean {
    this.hashMap.remove(a)

    return !this.contains(a)
  }

  [Symbol.iterator](): Iterator<A> {
    return I.map_(this.hashMap, ([a]) => a)[Symbol.iterator]()
  }
}

export function make<A>(E: EQ.Equal<A>, H: H.Hash<A>): HashSet<A> {
  return new HashSet(E, H)
}

export function size<A>(self: HashSet<A>): number {
  return self.size()
}

export function isEmpty<A>(self: HashSet<A>): boolean {
  return self.isEmpty()
}

export function contains_<A>(self: HashSet<A>, a: A): boolean {
  return self.contains(a)
}

export function contains<A>(a: A) {
  return (self: HashSet<A>) => contains_(self, a)
}

export function add_<A>(self: HashSet<A>, a: A): boolean {
  return self.add(a)
}

export function add<A>(a: A) {
  return (self: HashSet<A>) => add_(self, a)
}

export function remove_<A>(self: HashSet<A>, a: A): boolean {
  return self.remove(a)
}

export function remove<A>(a: A) {
  return (self: HashSet<A>) => remove_(self, a)
}
