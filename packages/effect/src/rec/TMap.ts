import { Kind, URIS } from "fp-ts/lib/HKT";
import * as EF from "../effect";

export interface TMap<T extends URIS, S, R, E> {
  <A, B>(ta: Kind<T, A>, f: (a: A) => EF.Effect<S, R, E, B>): EF.Effect<S, R, E, Kind<T, B>>;
}
