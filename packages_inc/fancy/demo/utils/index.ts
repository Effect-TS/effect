import * as I from "@matechs/core/Monocle/Iso"
import { Mutable } from "@matechs/core/Utils"
import * as M from "@matechs/morphic"

const isoMutable = <A>(): I.Iso<
  A,
  {
    -readonly [k in keyof A]: A[k] extends readonly any[] ? Mutable<A[k]> : A[k]
  }
> =>
  I.create(
    (s) => s as any,
    (s) => s
  )

export const mutable = <E, A>(_: M.M<{}, E, A>) =>
  M.make((F) => F.iso(_(F), isoMutable<A>()))
