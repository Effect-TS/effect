import { Kind, URIS } from "fp-ts/lib/HKT";
import * as EF from "../effect";

export interface TMap<T extends URIS, R, E> {
  <A, B>(ta: Kind<T, A>, f: (a: A) => EF.Effect<R, E, B>): EF.Effect<R, E, Kind<T, B>>;
}
