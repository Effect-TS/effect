/**
 * @tsplus static ets/Channel/Ops succeedWith
 */
export function succeedWith<R, Z>(
  f: (r: R) => Z
): Channel<R, unknown, unknown, unknown, never, never, Z> {
  return Channel.fromEffect(Effect.environmentWith(f));
}
