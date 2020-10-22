import * as Sy from "../_internal"
import type { Has, Tag } from "../../Classic/Has"
import { pipe } from "../../Function"

export abstract class SyncLayer<R, E, A> {
  readonly _R!: (_: R) => void
  readonly _E!: () => E
  readonly _A!: () => A

  _I(): Instructions {
    return this as any
  }

  ["+++"]<R2, E2, A2>(that: SyncLayer<R2, E2, A2>): SyncLayer<R & R2, E | E2, A & A2> {
    return new Both(this, that)
  }
}

export type Instructions = Of<any, any, any> | Both<any, any, any, any, any, any>

export class Of<R, E, A> extends SyncLayer<R, E, A> {
  readonly _tag = "FromSync"

  constructor(readonly sync: Sy.Sync<R, E, A>) {
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

type MemoMap = Map<SyncLayer<any, any, any>, any>

function getMemoOrElseCreate<R, E, A>(layer: SyncLayer<R, E, A>) {
  return (m: MemoMap) => {
    const x = m.get(layer)
    if (x) {
      return Sy.succeed(x)
    } else {
      return pipe(
        scope(layer),
        Sy.chain((f) => f(m)),
        Sy.tap((a) =>
          Sy.sync(() => {
            m.set(layer, a)
          })
        )
      )
    }
  }
}

export function scope<R, E, A>(
  layer: SyncLayer<R, E, A>
): Sy.Sync<unknown, never, (_: MemoMap) => Sy.Sync<R, E, A>> {
  const ins = layer._I()

  switch (ins._tag) {
    case "FromSync": {
      return Sy.succeed((_: MemoMap) => ins.sync)
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
  }
}

export function build<R, E, A>(layer: SyncLayer<R, E, A>) {
  return Sy.gen(function* (_) {
    const memo = yield* _(Sy.sync((): MemoMap => new Map()))
    const scoped = yield* _(scope(layer))

    return yield* _(scoped(memo))
  })
}

export function fromSync<T>(tag: Tag<T>) {
  return <R, E>(_: Sy.Sync<R, E, T>): SyncLayer<R, E, Has<T>> =>
    new Of(pipe(_, Sy.map(tag.of)))
}

export function provideSyncLayer<R, E, A>(layer: SyncLayer<R, E, A>) {
  return <R2, E2, A2>(_: Sy.Sync<R2 & A, E2, A2>): Sy.Sync<R & R2, E | E2, A2> =>
    pipe(
      build(layer),
      Sy.chain((a) => pipe(_, Sy.provide(a)))
    )
}
