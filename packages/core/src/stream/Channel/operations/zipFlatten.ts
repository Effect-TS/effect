/**
 * Returns a new channel that is the sequential composition of this channel
 * and the specified channel. The returned channel terminates with a flattened
 * tuple of the terminal values of both channels.
 *
 * @tsplus static effect/core/stream/Channel.Aspects zipFlatten
 * @tsplus pipeable effect/core/stream/Channel zipFlatten
 * @category zipping
 * @since 1.0.0
 */
export function zipFlatten<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone1>(
  that: Channel<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone1>
) {
  return <Env, InErr, InElem, InDone, OutErr, OutElem, OutDone extends ReadonlyArray<any>>(
    self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
  ): Channel<
    Env | Env1,
    InErr & InErr1,
    InElem & InElem1,
    InDone & InDone1,
    OutErr | OutErr1,
    OutElem | OutElem1,
    readonly [...OutDone, OutDone1]
  > => self.flatMap((a) => that.map((b) => [...a, b]))
}
