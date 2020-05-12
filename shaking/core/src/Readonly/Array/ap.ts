import { ap_ } from "./ap_"

export const ap: <A>(
  fa: readonly A[]
) => <B>(fab: readonly ((a: A) => B)[]) => readonly B[] = (fa) => (fab) => ap_(fab, fa)
