/**
 * @tsplus static effect/core/stream/Channel.Ops acquireUseReleaseExit
 */
export function acquireUseReleaseExit<
  Env,
  InErr,
  InElem,
  InDone,
  OutErr,
  OutElem1,
  OutDone,
  Acquired
>(
  acquire: LazyArg<Effect<Env, OutErr, Acquired>>,
  use: (a: Acquired) => Channel<Env, InErr, InElem, InDone, OutErr, OutElem1, OutDone>,
  release: (a: Acquired, exit: Exit<OutErr, OutDone>) => Effect<Env, never, any>
): Channel<Env, InErr, InElem, InDone, OutErr, OutElem1, OutDone> {
  return Channel.fromEffect(
    Ref.make<(exit: Exit<OutErr, OutDone>) => Effect<Env, never, any>>((_) => Effect.unit)
  ).flatMap((ref) =>
    Channel.fromEffect(
      acquire()
        .tap((a) => ref.set((exit) => release(a, exit)))
        .uninterruptible
    )
      .flatMap(use)
      .ensuringWith((exit) => ref.get().flatMap((f) => f(exit)))
  )
}
