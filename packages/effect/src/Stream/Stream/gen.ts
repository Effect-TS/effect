import type { Effect } from "../../Effect"
import { fromEither } from "../../Effect"
import { die } from "../../Effect/die"
import type { Either } from "../../Either"
import { NoSuchElementException, PrematureGeneratorExit } from "../../GlobalExceptions"
import type { Option } from "../../Option"
import type { _E, _R } from "../../Utils"
import { isEither, isOption } from "../../Utils"
import { chain_ } from "./chain"
import { Stream } from "./definitions"
import { fail } from "./fail"
import { fromEffect } from "./fromEffect"
import { succeed } from "./succeed"
import { suspend } from "./suspend"

export class GenStream<R, E, A> {
  readonly _R!: (_R: R) => void
  readonly _E!: () => E
  readonly _A!: () => A
  constructor(readonly effect: Stream<R, E, A>) {}
  *[Symbol.iterator](): Generator<GenStream<R, E, A>, A, any> {
    return yield this
  }
}

const adapter = (_: any, __?: any) => {
  if (isOption(_)) {
    return new GenStream(
      _._tag === "None"
        ? fail(__ ? __() : new NoSuchElementException())
        : succeed(_.value)
    )
  } else if (isEither(_)) {
    return new GenStream(fromEffect(fromEither(() => _)))
  } else if (_ instanceof Stream) {
    return new GenStream(_)
  }
  return new GenStream(fromEffect(_))
}

export function gen<Eff extends GenStream<any, any, any>, AEff>(
  f: (i: {
    <E, A>(_: Option<A>, onNone: () => E): GenStream<unknown, E, A>
    <A>(_: Option<A>): GenStream<unknown, NoSuchElementException, A>
    <E, A>(_: Either<E, A>): GenStream<unknown, E, A>
    <R, E, A>(_: Effect<R, E, A>): GenStream<R, E, A>
    <R, E, A>(_: Stream<R, E, A>): GenStream<R, E, A>
  }) => Generator<Eff, AEff, any>
): Stream<_R<Eff>, _E<Eff>, AEff> {
  return suspend(() => {
    function run(replayStack: any[]): Stream<any, any, AEff> {
      const iterator = f(adapter as any)
      let state = iterator.next()
      for (let i = 0; i < replayStack.length; i++) {
        if (state.done) {
          return fromEffect(die(new PrematureGeneratorExit()))
        }
        state = iterator.next(replayStack[i])
      }
      if (state.done) {
        return succeed(state.value)
      }
      return chain_(state.value["effect"], (val) => {
        return run(replayStack.concat([val]))
      })
    }
    return run([])
  })
}
