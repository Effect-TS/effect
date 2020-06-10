import * as L from "../src/local"
import * as S from "../src/session"

import { MockStorage } from "./mock"

import * as T from "@matechs/core/Effect"
import { Empty } from "@matechs/core/Layer"
import * as O from "@matechs/core/Option"
import * as M from "@matechs/test-jest"

const browserSpec = M.suite("browser")(
  M.testM(
    "use local storage",
    T.Do()
      .do(L.setItem("foo", "bar"))
      .bind("l", L.length)
      .bind("f", L.getItem("foo"))
      .bind("k", L.key(0))
      .do(L.removeItem("foo"))
      .bind("l2", L.length)
      .do(L.setItem("foo", "bar"))
      .do(L.clear)
      .bind("l3", L.length)
      .return(({ f, k, l, l2, l3 }) => {
        M.assert.deepStrictEqual(l, 1)
        M.assert.deepStrictEqual(l, 1)
        M.assert.deepStrictEqual(l, 1)
        M.assert.deepStrictEqual(k, O.some("foo"))
        M.assert.deepStrictEqual(k, O.some("foo"))
        M.assert.deepStrictEqual(k, O.some("foo"))
        M.assert.deepStrictEqual(f, O.some("bar"))
        M.assert.deepStrictEqual(l2, 0)
        M.assert.deepStrictEqual(l3, 0)
      })
  ),
  M.testM(
    "use session storage",
    T.Do()
      .do(S.setItem("foo", "bar"))
      .bind("l", S.length)
      .bind("f", S.getItem("foo"))
      .bind("k", S.key(0))
      .do(S.removeItem("foo"))
      .bind("l2", S.length)
      .do(S.setItem("foo", "bar"))
      .do(S.clear)
      .bind("l3", S.length)
      .return(({ f, k, l, l2, l3 }) => {
        M.assert.deepStrictEqual(l, 1)
        M.assert.deepStrictEqual(k, O.some("foo"))
        M.assert.deepStrictEqual(f, O.some("bar"))
        M.assert.deepStrictEqual(l2, 0)
        M.assert.deepStrictEqual(l3, 0)
      })
  )
)

const Deps = Empty.withMany(
  S.SessionStorage(new MockStorage([])),
  L.LocalStorage(new MockStorage([]))
)

M.run(browserSpec)(Deps.use)
