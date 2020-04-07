import { effect as T } from "@matechs/effect";

// experimental alpha
/* istanbul ignore file */

export const always = <R, E, A>(m: T.Effect<R, E, A>): T.Effect<R, E, never> => T.forever(m) as any;
