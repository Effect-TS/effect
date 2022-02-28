import { IO } from "../definition"

export class GenIO<A> {
  readonly _A!: () => A

  constructor(readonly io: IO<A>) {}

  *[Symbol.iterator](): Generator<GenIO<A>, A, any> {
    return yield this
  }
}

function adapter<A>(_: IO<A>): GenIO<A> {
  return new GenIO(_)
}

function run_<Eff extends GenIO<any>, AEff>(
  state: IteratorYieldResult<Eff> | IteratorReturnResult<AEff>,
  iterator: Generator<Eff, AEff, any>
): IO<AEff> {
  if (state.done) {
    return IO.succeed(state.value)
  }
  return state.value["io"].flatMap((val) => {
    const next = iterator.next(val)
    return run_(next, iterator)
  })
}

/**
 * Generator
 *
 * @tsplus static ets/IOOps gen
 */
export function gen<Eff extends GenIO<any>, AEff>(
  f: (i: { <A>(_: IO<A>): GenIO<A> }) => Generator<Eff, AEff, any>
): IO<AEff> {
  return IO.suspend(() => {
    const iterator = f(adapter)
    const state = iterator.next()
    return run_(state, iterator)
  })
}
