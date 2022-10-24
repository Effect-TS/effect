/**
 * @tsplus static effect/core/stream/Channel.Aspects bind
 * @tsplus pipeable effect/core/stream/Channel bind
 * @category do
 * @since 1.0.0
 */
export function bind<
  N extends string,
  K,
  Env1,
  InErr1,
  InElem1,
  InDone1,
  OutErr1,
  OutElem1,
  OutDone
>(
  tag: Exclude<N, keyof K>,
  f: (_: K) => Channel<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone>
) {
  return <Env, InErr, InElem, InDone, OutErr, OutElem>(
    self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, K>
  ): Channel<
    Env | Env1,
    InErr & InErr1,
    InElem & InElem1,
    InDone & InDone1,
    OutErr | OutErr1,
    OutElem | OutElem1,
    K & { [k in N]: OutDone }
  > =>
    self.flatMap(
      (k) => f(k).map((a): K & { [k in N]: OutDone } => ({ ...k, [tag]: a } as any))
    )
}

/**
 * @tsplus static effect/core/stream/Channel.Aspects bindValue
 * @tsplus pipeable effect/core/stream/Channel bindValue
 * @category do
 * @since 1.0.0
 */
export function bindValue<
  N extends string,
  K,
  OutDone
>(
  tag: Exclude<N, keyof K>,
  f: (_: K) => OutDone
) {
  return <Env, InErr, InElem, InDone, OutErr, OutElem>(
    self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, K>
  ): Channel<
    Env,
    InErr,
    InElem,
    InDone,
    OutErr,
    OutElem,
    K & { [k in N]: OutDone }
  > => self.map((k): K & { [k in N]: OutDone } => ({ ...k, [tag]: f(k) } as any))
}

/**
 * @tsplus static effect/core/stream/Channel.Ops Do
 * @category do
 * @since 1.0.0
 */
export function Do(): Channel<never, unknown, unknown, unknown, never, never, {}> {
  return Channel.fromEffect(Effect.succeed({}))
}
