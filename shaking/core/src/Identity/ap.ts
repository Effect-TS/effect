import { ap_ } from "./ap_"

export const ap: <A>(fa: A) => <B>(fab: (a: A) => B) => B = (fa) => (fab) =>
  ap_(fab, fa)
