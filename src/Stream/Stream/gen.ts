import type { Effect } from "../../Effect"
import { fromEither, service } from "../../Effect"
import { die } from "../../Effect/die"
import type { Either } from "../../Either"
import { NoSuchElementException, PrematureGeneratorExit } from "../../GlobalExceptions"
import type { Has, Tag } from "../../Has"
import * as L from "../../List"
import type { Option } from "../../Option"
import type { _E, _R } from "../../Utils"
import { isEither, isOption, isTag } from "../../Utils"
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
  } else if (isTag(_)) {
    return new GenStream(fromEffect(service(_)))
  }
  return new GenStream(fromEffect(_))
}

export function gen<RBase, EBase, AEff>(): <Eff extends GenStream<RBase, EBase, any>>(
  f: (i: {
    <A>(_: Tag<A>): GenStream<Has<A>, never, A>
    <E, A>(_: Option<A>, onNone: () => E): GenStream<unknown, E, A>
    <A>(_: Option<A>): GenStream<unknown, NoSuchElementException, A>
    <E, A>(_: Either<E, A>): GenStream<unknown, E, A>
    <R, E, A>(_: Effect<R, E, A>): GenStream<R, E, A>
    <R, E, A>(_: Stream<R, E, A>): GenStream<R, E, A>
  }) => Generator<Eff, AEff, any>
) => Stream<_R<Eff>, _E<Eff>, AEff>
export function gen<EBase, AEff>(): <Eff extends GenStream<any, EBase, any>>(
  f: (i: {
    <A>(_: Tag<A>): GenStream<Has<A>, never, A>
    <E, A>(_: Option<A>, onNone: () => E): GenStream<unknown, E, A>
    <A>(_: Option<A>): GenStream<unknown, NoSuchElementException, A>
    <E, A>(_: Either<E, A>): GenStream<unknown, E, A>
    <R, E, A>(_: Effect<R, E, A>): GenStream<R, E, A>
    <R, E, A>(_: Stream<R, E, A>): GenStream<R, E, A>
  }) => Generator<Eff, AEff, any>
) => Stream<_R<Eff>, _E<Eff>, AEff>
export function gen<AEff>(): <Eff extends GenStream<any, any, any>>(
  f: (i: {
    <A>(_: Tag<A>): GenStream<Has<A>, never, A>
    <E, A>(_: Option<A>, onNone: () => E): GenStream<unknown, E, A>
    <A>(_: Option<A>): GenStream<unknown, NoSuchElementException, A>
    <E, A>(_: Either<E, A>): GenStream<unknown, E, A>
    <R, E, A>(_: Effect<R, E, A>): GenStream<R, E, A>
    <R, E, A>(_: Stream<R, E, A>): GenStream<R, E, A>
  }) => Generator<Eff, AEff, any>
) => Stream<_R<Eff>, _E<Eff>, AEff>
export function gen<Eff extends GenStream<any, any, any>, AEff>(
  f: (i: {
    <A>(_: Tag<A>): GenStream<Has<A>, never, A>
    <E, A>(_: Option<A>, onNone: () => E): GenStream<unknown, E, A>
    <A>(_: Option<A>): GenStream<unknown, NoSuchElementException, A>
    <E, A>(_: Either<E, A>): GenStream<unknown, E, A>
    <R, E, A>(_: Effect<R, E, A>): GenStream<R, E, A>
    <R, E, A>(_: Stream<R, E, A>): GenStream<R, E, A>
  }) => Generator<Eff, AEff, any>
): Stream<_R<Eff>, _E<Eff>, AEff>
export function gen(...args: any[]): any {
  function gen_<Eff extends GenStream<any, any, any>, AEff>(
    f: (i: any) => Generator<Eff, AEff, any>
  ): Stream<_R<Eff>, _E<Eff>, AEff> {
    return suspend(() => {
      function run(replayStack: L.List<any>): Stream<any, any, AEff> {
        const iterator = f(adapter as any)
        let state = iterator.next()
        for (const a of replayStack) {
          if (state.done) {
            return fromEffect(die(new PrematureGeneratorExit()))
          }
          state = iterator.next(a)
        }
        if (state.done) {
          return succeed(state.value)
        }
        return chain_(state.value["effect"], (val) => {
          return run(L.append_(replayStack, val))
        })
      }
      return run(L.empty())
    })
  }

  if (args.length === 0) {
    return (f: any) => gen_(f)
  }
  return gen_(args[0])
}
