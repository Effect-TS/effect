export const apFirst: <B>(fb: B) => <A>(fa: A) => A = (_) => (fa) => fa
