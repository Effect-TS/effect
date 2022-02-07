// ets_tracing: off

import "../../Operator/index.js"

import { _A, _E, _R } from "@effect-ts/system/Effect"
import { AtomicReference } from "@effect-ts/system/Support/AtomicReference"

import * as A from "../../Collections/Immutable/Array/index.js"
import { pipe } from "../../Function/index.js"
import type { Has, Tag } from "../../Has/index.js"
import type { Erase, UnionToIntersection } from "../../Utils/index.js"
import * as Sy from "../_internal/index.js"

export abstract class SyncLayer<R, E, A> {
  readonly hash = new AtomicReference<PropertyKey>(Symbol());

  readonly [_R]!: (_: R) => void;
  readonly [_E]!: () => E;
  readonly [_A]!: () => A

  setKey(key: symbol) {
    this.hash.set(key)
    return this
  }

  ["+++"]<R2, E2, A2>(that: SyncLayer<R2, E2, A2>): SyncLayer<R & R2, E | E2, A & A2> {
    return new Both(this, that)
  }

  ["<<<"]<R2, E2, A2>(
    that: SyncLayer<R2, E2, A2>
  ): SyncLayer<Erase<R, A2> & R2, E | E2, A> {
    return new From(that, this)
  }

  [">>>"]<R2, E2, A2>(
    that: SyncLayer<R2, E2, A2>
  ): SyncLayer<Erase<R2, A> & R, E | E2, A2> {
    return new From(this, that)
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

  abstract scope(): Sy.Sync<unknown, never, (_: SyncMemoMap) => Sy.Sync<R, E, A>>

  build() {
    const scope = () => this.scope()

    return Sy.gen(function* (_) {
      const memo = yield* _(Sy.succeedWith((): SyncMemoMap => new Map()))
      const scoped = yield* _(scope())

      return yield* _(scoped(memo))
    })
  }
}

export class Of<R, E, A> extends SyncLayer<R, E, A> {
  readonly _tag = "FromSync"

  constructor(readonly sync: Sy.Sync<R, E, A>) {
    super()
  }

  scope(): Sy.Sync<unknown, never, (_: SyncMemoMap) => Sy.Sync<R, E, A>> {
    return Sy.succeed((_) => this.sync)
  }
}

export class Fresh<R, E, A> extends SyncLayer<R, E, A> {
  readonly _tag = "Fresh"

  constructor(readonly sync: SyncLayer<R, E, A>) {
    super()
  }

  scope(): Sy.Sync<unknown, never, (_: SyncMemoMap) => Sy.Sync<R, E, A>> {
    return Sy.succeed((_) => this.sync.build())
  }
}

export class Suspended<R, E, A> extends SyncLayer<R, E, A> {
  readonly _tag = "Suspended"

  constructor(readonly sync: () => SyncLayer<R, E, A>) {
    super()
  }

  scope(): Sy.Sync<unknown, never, (_: SyncMemoMap) => Sy.Sync<R, E, A>> {
    return Sy.succeed(getMemoOrElseCreate(this.sync()))
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

  scopeBoth(self: Both<R, E, A, R2, E2, A2>) {
    return Sy.succeed((map: SyncMemoMap) =>
      Sy.gen(function* (_) {
        const l = yield* _(getMemoOrElseCreate(self.left)(map))
        const r = yield* _(getMemoOrElseCreate(self.right)(map))

        return { ...l, ...r }
      })
    )
  }

  scope(): Sy.Sync<
    unknown,
    never,
    (_: SyncMemoMap) => Sy.Sync<R & R2, E | E2, A & A2>
  > {
    return this.scopeBoth(this)
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

  scope(): Sy.Sync<
    unknown,
    never,
    (_: SyncMemoMap) => Sy.Sync<R & Erase<R2, A>, E | E2, A & A2>
  > {
    return Sy.succeed((_: SyncMemoMap) =>
      pipe(
        getMemoOrElseCreate(this.left)(_),
        Sy.chain((l) =>
          pipe(
            getMemoOrElseCreate(this.right)(_),
            Sy.map((r) => ({ ...l, ...r })),
            Sy.provide(l)
          )
        )
      )
    ) as any
  }
}

export class From<R, E, A, R2, E2, A2> extends SyncLayer<R & Erase<R2, A>, E | E2, A2> {
  readonly _tag = "From"

  constructor(
    readonly left: SyncLayer<R, E, A>,
    readonly right: SyncLayer<R2, E2, A2>
  ) {
    super()
  }

  scope(): Sy.Sync<
    unknown,
    never,
    (_: SyncMemoMap) => Sy.Sync<R & Erase<R2, A>, E | E2, A2>
  > {
    return Sy.succeed((_: SyncMemoMap) =>
      pipe(
        getMemoOrElseCreate(this.left)(_),
        Sy.chain((l) => pipe(getMemoOrElseCreate(this.right)(_), Sy.provide(l)))
      )
    ) as any
  }
}

export class All<Layers extends SyncLayer<any, any, any>[]> extends SyncLayer<
  MergeR<Layers>,
  MergeE<Layers>,
  MergeA<Layers>
> {
  readonly _tag = "All"

  constructor(readonly layers: Layers & { 0: SyncLayer<any, any, any> }) {
    super()
  }

  scope(): Sy.Sync<
    unknown,
    never,
    (_: SyncMemoMap) => Sy.Sync<MergeR<Layers>, MergeE<Layers>, MergeA<Layers>>
  > {
    return Sy.succeed((_) =>
      pipe(
        this.layers,
        A.reduce(<Sy.Sync<any, any, any>>Sy.succeed({}), (b, a) =>
          pipe(
            getMemoOrElseCreate(a)(_),
            Sy.chain((x) => Sy.map_(b, (k) => ({ ...k, ...x })))
          )
        )
      )
    )
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

export type SyncMemoMap = Map<PropertyKey, any>

export function getMemoOrElseCreate<R, E, A>(layer: SyncLayer<R, E, A>) {
  return (m: SyncMemoMap): Sy.Sync<R, E, A> =>
    Sy.gen(function* (_) {
      const inMap = yield* _(Sy.succeedWith(() => m.get(layer.hash.get)))

      if (inMap) {
        return yield* _(Sy.succeed(inMap))
      } else {
        return yield* _(
          Sy.gen(function* (_) {
            const f = yield* _(layer.scope())
            const a = yield* _(f(m))
            yield* _(
              Sy.succeedWith(() => {
                m.set(layer.hash.get, a)
              })
            )
            return a
          })
        )
      }
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
    new Of(pipe(_, Sy.map(tag.has)))
}

export function fromFunction<T>(tag: Tag<T>) {
  return <R>(_: (_: R) => T): SyncLayer<R, never, Has<T>> =>
    new Of(pipe(Sy.access(_), Sy.map(tag.has)))
}

export function fromValue<T>(tag: Tag<T>) {
  return (_: T): SyncLayer<unknown, never, Has<T>> => new Of(Sy.succeed(tag.has(_)))
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

export function to<R2, E2, A2>(left: SyncLayer<R2, E2, A2>) {
  return <R, E, A>(
    right: SyncLayer<R, E, A>
  ): SyncLayer<R & Erase<R2, A>, E | E2, A2> => new From(right, left)
}

export function using<R2, E2, A2>(left: SyncLayer<R2, E2, A2>) {
  return <R, E, A>(
    right: SyncLayer<R, E, A>
  ): SyncLayer<Erase<R, A2> & R2, E | E2, A & A2> => new Using(left, right)
}

export function from<R2, E2, A2>(left: SyncLayer<R2, E2, A2>) {
  return <R, E, A>(
    right: SyncLayer<R, E, A>
  ): SyncLayer<Erase<R, A2> & R2, E | E2, A> => new From(left, right)
}

export function provideSyncLayer<R, E, A>(layer: SyncLayer<R, E, A>) {
  return <R2, E2, A2>(_: Sy.Sync<R2 & A, E2, A2>): Sy.Sync<R & R2, E | E2, A2> =>
    pipe(
      layer.build(),
      Sy.chain((a) => pipe(_, Sy.provide(a)))
    )
}

export function all<Ls extends SyncLayer<any, any, any>[]>(
  ...ls: Ls & { 0: SyncLayer<any, any, any> }
): SyncLayer<MergeR<Ls>, MergeE<Ls>, MergeA<Ls>> {
  return new All(ls)
}
