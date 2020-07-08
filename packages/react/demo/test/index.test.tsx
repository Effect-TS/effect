import { act, render } from "@testing-library/react"
import { renderHook } from "@testing-library/react-hooks"
import * as fc from "fast-check"
import * as pr from "pure-rand"

import {
  DecodingError,
  Done,
  HasGithubOrganizations,
  HasHttp,
  Http,
  HttpError,
  OrganizationsView,
  provideGithubOrganizations
} from "../pages"

import { pipe } from "@matechs/core/Function"
import * as T from "@matechs/core/next/Effect"
import * as L from "@matechs/core/next/Layer"
import * as M from "@matechs/morphic"
import * as FC from "@matechs/morphic/fc"
import * as R from "@matechs/react"

export class HttpTest extends Http {
  n = -1

  constructor(private urls: (_: string) => any) {
    super()
  }

  generate<A>(a: fc.Arbitrary<A>) {
    this.n = this.n + 1
    return a.generate(new fc.Random(pr.mersenne(this.n))).value
  }

  getJson: <E, T>(
    _: M.M<{}, E, T>
  ) => (url: string) => T.AsyncRE<T.DefaultEnv, HttpError | DecodingError, T> = (m) => (
    u
  ) =>
    T.effectTotal(() => {
      this.urls(u)
      return this.generate(FC.derive(m))
    })
}

export const nextTick = () => T.runPromise(T.delay(0)(T.unit))

const afterThis: <A>(
  f: (defer: (thunk: () => Promise<any>) => void) => () => Promise<A>
) => () => Promise<A> = (f) => async () => {
  const afterAll = [] as (() => Promise<any>)[]

  const defer = (thunk: () => Promise<any>) => {
    afterAll.push(thunk)
  }

  try {
    return await f(defer)()
  } finally {
    await Promise.all(afterAll.map((p) => p()))
  }
}

describe("Matechs", () => {
  it("test via render", async () => {
    const urls = jest.fn()

    const App = pipe(
      provideGithubOrganizations,
      L.using(L.service(HasHttp).pure(new HttpTest(urls))),
      R.render(OrganizationsView)
    )

    const { findByText, getByText } = render(<App />)

    await findByText(/loading/i)

    await nextTick()

    await findByText(/i&x/i)

    expect(urls).toHaveBeenCalledWith("https://api.github.com/organizations?since=0")

    const next = getByText(/next/i)

    act(() => {
      next.click()
    })

    await findByText(/loading/i)

    await nextTick()

    await findByText(/2ZI/i)

    expect(urls).toHaveBeenCalledWith(
      "https://api.github.com/organizations?since=2046377821"
    )
  })

  it(
    "test via hook",
    afterThis((defer) => async () => {
      const urls = jest.fn()

      const layer = pipe(
        provideGithubOrganizations,
        L.using(
          L.service(HasHttp).pure(
            new (class extends Http {
              getJson: <E, T>(
                _: M.M<{}, E, T>
              ) => (
                url: string
              ) => T.AsyncRE<T.DefaultEnv, HttpError | DecodingError, T> = (_) => (
                u
              ) => {
                urls(u)
                return u === "https://api.github.com/organizations?since=0"
                  ? T.succeedNow([{ id: 1 }, { id: 2 }, { id: 3 }] as any)
                  : u === "https://api.github.com/organizations?since=3"
                  ? T.succeedNow([{ id: 4 }, { id: 5 }, { id: 6 }] as any)
                  : u === "https://api.github.com/organizations?since=6"
                  ? T.succeedNow([{ id: 7 }, { id: 8 }, { id: 9 }] as any)
                  : T.fail(new HttpError(new Error(u)))
              }
            })()
          )
        )
      )

      const { cleanup, runtime } = R.testRuntime(layer)

      defer(cleanup)

      const { result, waitForNextUpdate } = renderHook(() =>
        HasGithubOrganizations.read(runtime).useOrganizations()
      )

      expect(result.current._tag).toStrictEqual("Loading")

      await waitForNextUpdate()

      expect(result.current._tag).toStrictEqual("Done")

      const done = result.current as Done

      expect(done.orgs.length).toBeGreaterThan(0)

      const firstPage = done.orgs

      act(() => {
        ;(result.current as Done).nextPage()
      })

      await act(() => waitForNextUpdate())

      expect(result.current._tag).toStrictEqual("Loading")

      await act(() => waitForNextUpdate())

      expect(result.current._tag).toStrictEqual("Done")

      const secondPage = (result.current as Done).orgs

      expect(firstPage).not.toStrictEqual(secondPage)

      act(() => {
        ;(result.current as Done).nextPage()
      })

      await act(() => waitForNextUpdate())

      expect(result.current._tag).toStrictEqual("Loading")

      await act(() => waitForNextUpdate())

      expect(result.current._tag).toStrictEqual("Done")

      const thirdPage = (result.current as Done).orgs

      expect(secondPage).not.toStrictEqual(thirdPage)

      expect(urls).toHaveBeenCalledWith("https://api.github.com/organizations?since=0")
      expect(urls).toHaveBeenCalledWith("https://api.github.com/organizations?since=3")
      expect(urls).toHaveBeenCalledWith("https://api.github.com/organizations?since=6")
    })
  )
})
