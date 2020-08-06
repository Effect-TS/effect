import { Closure } from "../Closure"

export interface Associative<A> extends Closure<A> {}

export const make = <A>(f: (r: A) => (l: A) => A): Associative<A> => ({ combine: f })
