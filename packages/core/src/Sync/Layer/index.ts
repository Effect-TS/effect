import { AtomicReference } from "@effect-ts/system/Support/AtomicReference"

import * as Sy from "../_internal"
import * as A from "../../Classic/Array"
import { pipe } from "../../Function"
import type { Has, Tag } from "../../Has"
import type { Erase, UnionToIntersection } from "../../Utils"

export abstract class SyncLayer<R, E, A> {
  readonly hash = new AtomicReference(Symbol())

  readonly _R!: (_: R) => void
  readonly _E!: () => E
  readonly _A!: () => A

  _I(): Instructions {
    return this as any
  }

  setKey(key: symbol) {
    this.hash.set(key)
    return this
  }

  ["+++"]<R2, E2, A2>(that: SyncLayer<R2, E2, A2>): SyncLayer<R & R2, E | E2, A & A2> {
    return new Both(this, that)
  }

  ["<+<"]<R2, E2, A2>(
    that: SyncLayer<R2, E2, A2>
  ): SyncLayer<Erase<R, A2> & R2, E | E2, A & A2> {
    return new Using(that, this)
  }

  [">+>"]<R2, E2, A2>(
    that: SyncLayer<R2, E2, A2>
  ): SyncLayer<Erase<R2, A> & R, E | E2, A & A2> {
    return new Using(this, that)
  }
}

export type Instructions =
  | Of<any, any, any>
  | Fresh<any, any, any>
  | Suspended<any, any, any>
  | Both<any, any, any, any, any, any>
  | Using<any, any, any, any, any, any>
  | All<SyncLayer<any, any, any>[]>

export class Of<R, E, A> extends SyncLayer<R, E, A> {
  readonly _tag = "FromSync"

  constructor(readonly sync: Sy.Sync<R, E, A>) {
    super()
  }
}

export class Fresh<R, E, A> extends SyncLayer<R, E, A> {
  readonly _tag = "Fresh"

  constructor(readonly sync: SyncLayer<R, E, A>) {
    super()
  }
}

export class Suspended<R, E, A> extends SyncLayer<R, E, A> {
  readonly _tag = "Suspended"

  constructor(readonly sync: () => SyncLayer<R, E, A>) {
    super()
  }
}

export class Both<R, E, A, R2, E2, A2> extends SyncLayer<R & R2, E | E2, A & A2> {
  readonly _tag = "Both"

  constructor(
    readonly left: SyncLayer<R, E, A>,
    readonly right: SyncLayer<R2, E2, A2>
  ) {
    super()
  }
}

export class Using<R, E, A, R2, E2, A2> extends SyncLayer<
  R & Erase<R2, A>,
  E | E2,
  A & A2
> {
  readonly _tag = "Using"

  constructor(
    readonly left: SyncLayer<R, E, A>,
    readonly right: SyncLayer<R2, E2, A2>
  ) {
    super()
  }
}

export type MergeR<Ls extends SyncLayer<any, any, any>[]> = UnionToIntersection<
  {
    [k in keyof Ls]: [Ls[k]] extends [SyncLayer<infer X, any, any>]
      ? unknown extends X
        ? never
        : X
      : never
  }[number]
>

export type MergeE<Ls extends SyncLayer<any, any, any>[]> = {
  [k in keyof Ls]: [Ls[k]] extends [SyncLayer<any, infer X, any>] ? X : never
}[number]

export type MergeA<Ls extends SyncLayer<any, any, any>[]> = UnionToIntersection<
  {
    [k in keyof Ls]: [Ls[k]] extends [SyncLayer<any, any, infer X>]
      ? unknown extends X
        ? never
        : X
      : never
  }[number]
>

export class All<Layers extends SyncLayer<any, any, any>[]> extends SyncLayer<
  MergeR<Layers>,
  MergeE<Layers>,
  MergeA<Layers>
> {
  readonly _tag = "All"

  constructor(readonly layers: Layers & { 0: SyncLayer<any, any, any> }) {
    super()
  }
}

type MemoMap = Map<symbol, any>

function getMemoOrElseCreate<R, E, A>(layer: SyncLayer<R, E, A>) {
  return (m: MemoMap) => {
    const x = m.get(layer.hash.get)
    if (x) {
      return Sy.succeed(x)
    } else {
      return pipe(
        scope(layer),
        Sy.chain((f) => f(m)),
        Sy.tap((a) =>
          Sy.sync(() => {
            m.set(layer.hash.get, a)
          })
        )
      )
    }
  }
}

function scope<R, E, A>(
  layer: SyncLayer<R, E, A>
): Sy.Sync<unknown, never, (_: MemoMap) => Sy.Sync<R, E, A>> {
  const ins = layer._I()

  switch (ins._tag) {
    case "FromSync": {
      return Sy.succeed((_) => ins.sync)
    }
    case "Fresh": {
      return Sy.succeed((_) => build(ins.sync))
    }
    case "Suspended": {
      return Sy.succeed(getMemoOrElseCreate(ins.sync()))
    }
    case "Both": {
      return Sy.succeed((_) =>
        pipe(
          getMemoOrElseCreate(ins.left)(_),
          Sy.chain((l) =>
            pipe(
              getMemoOrElseCreate(ins.right)(_),
              Sy.map((r) => ({ ...l, ...r }))
            )
          )
        )
      )
    }
    case "All": {
      return Sy.succeed((_) =>
        pipe(
          ins.layers,
          A.reduce(<Sy.Sync<any, any, any>>Sy.succeed({}), (b, a) =>
            pipe(
              getMemoOrElseCreate(a)(_),
              Sy.chain((x) => ({ ...b, ...x }))
            )
          )
        )
      )
    }
    case "Using": {
      return Sy.succeed((_) =>
        pipe(
          getMemoOrElseCreate(ins.left)(_),
          Sy.chain((l) =>
            pipe(
              getMemoOrElseCreate(ins.right)(_),
              Sy.map((r) => ({ ...l, ...r })),
              Sy.provide(l)
            )
          )
        )
      )
    }
  }
}

export function build<R, E, A>(layer: SyncLayer<R, E, A>) {
  return Sy.gen(function* (_) {
    const memo = yield* _(Sy.sync((): MemoMap => new Map()))
    const scoped = yield* _(scope(layer))

    return yield* _(scoped(memo))
  })
}

export function fromRawSync<R, E, T>(_: Sy.Sync<R, E, T>): SyncLayer<R, E, T> {
  return new Of(_)
}

export function fresh<R, E, A>(layer: SyncLayer<R, E, A>) {
  return new Fresh(layer)
}

export function suspended<R, E, A>(layer: () => SyncLayer<R, E, A>) {
  return new Suspended(layer)
}

export function fromSync<T>(tag: Tag<T>) {
  return <R, E>(_: Sy.Sync<R, E, T>): SyncLayer<R, E, Has<T>> =>
    new Of(pipe(_, Sy.map(tag.of)))
}

export function fromFunction<T>(tag: Tag<T>) {
  return <R, E>(_: (_: R) => T): SyncLayer<R, E, Has<T>> =>
    new Of(pipe(Sy.access(_), Sy.map(tag.of)))
}

export function fromValue<T>(tag: Tag<T>) {
  return (_: T): SyncLayer<unknown, never, Has<T>> => new Of(Sy.succeed(tag.of(_)))
}

export function and<R2, E2, A2>(left: SyncLayer<R2, E2, A2>) {
  return <R, E, A>(right: SyncLayer<R, E, A>): SyncLayer<R & R2, E | E2, A & A2> =>
    new Both(left, right)
}

export function andTo<R2, E2, A2>(left: SyncLayer<R2, E2, A2>) {
  return <R, E, A>(
    right: SyncLayer<R, E, A>
  ): SyncLayer<R & Erase<R2, A>, E | E2, A & A2> => new Using(right, left)
}

export function using<R2, E2, A2>(left: SyncLayer<R2, E2, A2>) {
  return <R, E, A>(
    right: SyncLayer<R, E, A>
  ): SyncLayer<Erase<R, A2> & R2, E | E2, A & A2> => new Using(left, right)
}

export function provideSyncLayer<R, E, A>(layer: SyncLayer<R, E, A>) {
  return <R2, E2, A2>(_: Sy.Sync<R2 & A, E2, A2>): Sy.Sync<R & R2, E | E2, A2> =>
    pipe(
      build(layer),
      Sy.chain((a) => pipe(_, Sy.provide(a)))
    )
}

export function all<Ls extends SyncLayer<any, any, any>[]>(
  ...ls: Ls & { 0: SyncLayer<any, any, any> }
): SyncLayer<MergeR<Ls>, MergeE<Ls>, MergeA<Ls>> {
  return new All(ls)
}
