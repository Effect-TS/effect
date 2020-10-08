import type { Predicate } from "../Function"
import type { Option } from "../Option"
import { none, some } from "../Option"

export class Fused<A> {
  readonly _A!: A
  constructor(readonly base: readonly any[], readonly op: Op) {}
}

export type Op = OpMap | OpFilter | OpThen | OpId

export interface OpId {
  readonly _tag: "OpId"
}

export interface OpMap {
  readonly _tag: "OpMap"
  map: (a: any, i: number) => any
}

export interface OpFilter {
  readonly _tag: "OpFilter"
  predicate: Predicate<any>
}

export interface OpThen {
  readonly _tag: "OpThen"
  left: Op
  right: Op
}

export function map<A, B>(f: (a: A, i: number) => B) {
  return (_: Fused<A> | ReadonlyArray<A>): Fused<B> =>
    Array.isArray(_)
      ? new Fused(_, {
          _tag: "OpThen",
          left: {
            _tag: "OpId"
          },
          right: {
            _tag: "OpMap",
            map: f
          }
        })
      : new Fused((_ as Fused<A>).base, {
          _tag: "OpThen",
          left: (_ as Fused<A>).op,
          right: {
            _tag: "OpMap",
            map: f
          }
        })
}

export function filter<A>(p: Predicate<A>) {
  return (_: Fused<A> | ReadonlyArray<A>): Fused<A> =>
    Array.isArray(_)
      ? new Fused(_, {
          _tag: "OpThen",
          left: {
            _tag: "OpId"
          },
          right: {
            _tag: "OpFilter",
            predicate: p
          }
        })
      : new Fused((_ as Fused<A>).base, {
          _tag: "OpThen",
          left: (_ as Fused<A>).op,
          right: {
            _tag: "OpFilter",
            predicate: p
          }
        })
}

function runOp<A>(a: A, i: number, op: Op): Option<A> {
  switch (op._tag) {
    case "OpMap": {
      return some(op.map(a, i))
    }
    case "OpFilter": {
      if (!op.predicate(a)) {
        return none
      }

      return some(a)
    }
    case "OpId": {
      return some(a)
    }
    case "OpThen": {
      const left = runOp(a, i, op.left)
      if (left._tag === "None") {
        return none
      } else {
        const right = runOp(left.value, i, op.right)
        if (right._tag === "None") {
          return none
        } else {
          return some(right.value)
        }
      }
    }
  }
}

export function run<A>(self: Fused<A>): readonly A[] {
  const r: A[] = []
  let n = 0
  let d = 0

  for (const i of self.base) {
    const p = runOp(i, n - d, self.op)
    if (p._tag === "Some") {
      r.push(p.value)
    } else {
      d += 1
    }
    n += 1
  }

  return r
}
