import { Either, tailRec } from "../Either"

export const chainRec: <A, B>(a: A, f: (a: A) => Either<A, B>) => B = tailRec
