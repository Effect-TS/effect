import { pipe } from "../../Function"
import * as T from "../Effect"
import * as L from "../Layer"
import * as M from "../Managed"

class Show {
  constructor(readonly message: string) {}

  show() {
    return T.effectTotal(() => {
      console.log(this.message)
    })
  }
}

const HasShow = T.has(Show)()

const appLayer = pipe(
  L.service(HasShow).fromManaged(M.fromEffect(T.effectTotal(() => new Show("a")))),
  L.using(
    L.service(HasShow).fromManaged(M.fromEffect(T.effectTotal(() => new Show("b"))))
  ),
  L.using(
    L.service(HasShow).fromManaged(M.fromEffect(T.effectTotal(() => new Show("c"))))
  )
)

pipe(
  T.accessServiceM(HasShow)((s) => s.show()),
  T.provideSomeLayer(appLayer),
  T.runMain
)
