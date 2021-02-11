import * as P from "../../Prelude"
import * as StateT from ".."

/**
 * Take over ownership of "S" making it fixed to provided "S"
 */
export type V<C, S> = P.CleanParam<C, "S"> & P.Fix<"S", S>

/**
 * State Input URI with local override of "S", this makes it safe to be
 * stacked multiple times
 */
export interface PSIn<S> extends P.URI<StateT.StateInURI, P.Fix<"S", S>> {}

/**
 * State Output URI with local override of "S", this makes it safe to be
 * stacked multiple times
 */
export interface PSOut<S> extends P.URI<StateT.StateOutURI, P.Fix<"S", S>> {}

/**
 * Construct the transformed URI as [StateIn, F, StateOut]
 */
export type ParametricStateT<F extends P.URIS, S> = P.PrependURI<
  PSIn<S>,
  P.AppendURI<F, PSOut<S>>
>

export function monad<S>() {
  return <F extends P.URIS, C>(M: P.Monad<F, C>) => getMonad_<F, C, S>(M)
}

function getMonad_<F extends P.URIS, C, S>(
  M: P.Monad<F, C>
): P.Monad<ParametricStateT<F, S>, V<C, S>>
function getMonad_<F, S>(
  M: P.Monad<P.UHKT<F>>
): P.Monad<ParametricStateT<P.UHKT<F>, S>, V<P.Auto, S>> {
  return P.instance(StateT.monad(M))
}
