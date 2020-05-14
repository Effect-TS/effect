export const extend: <A, B>(f: (fa: A) => B) => (ma: A) => B = (f) => (ma) => f(ma)
