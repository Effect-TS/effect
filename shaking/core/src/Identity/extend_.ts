export const extend_: <A, B>(wa: A, f: (wa: A) => B) => B = (wa, f) => f(wa)
