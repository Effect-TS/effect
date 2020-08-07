import { pipe } from "../src/Function"
import * as T from "../src/next/Effect"
import * as Has from "../src/next/Has"
import * as L from "../src/next/Layer"
import * as M from "../src/next/Managed"

class Show {
  constructor(readonly message: string) {}

  show() {
    return T.effectTotal(() => {
      console.log(this.message)
    })
  }
}

const HasShow = Has.has(Show)

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
