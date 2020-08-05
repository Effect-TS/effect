import { Closure } from "../Closure"

export interface Associative<A> extends Closure<A> {}

export const make = <A>(f: (l: A, r: A) => A): Associative<A> => ({ combine: f })
