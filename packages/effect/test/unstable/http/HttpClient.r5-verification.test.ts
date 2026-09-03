import { assert, describe, it, type TaskMeta } from "@effect/vitest"
import { Context, Effect, Exit, Option, Ref } from "effect"
import { Cookies, HttpClient, HttpClientRequest, HttpClientResponse } from "effect/unstable/http"

declare module "vitest" {
  interface TaskMeta {
    r5Redirect?: Array<unknown>
  }
}

type Request = HttpClientRequest.HttpClientRequest
type Response = HttpClientResponse.HttpClientResponse
const response = (request: Request, status = 200, headers?: Record<string, string>) =>
  HttpClientResponse.fromWeb(
    request,
    new globalThis.Response(null, headers === undefined ? { status } : { status, headers })
  )
const requestView = (request: Request) => ({
  method: request.method,
  url: request.url,
  params: Array.from(request.urlParams),
  hash: Option.getOrUndefined(request.hash),
  headers: { ...request.headers },
  body: request.body._tag === "Uint8Array" ? Array.from(request.body.body) : request.body._tag
})
const state = () => ({ pre: 0, map: 0, transport: 0, caught: 0, filter: 0, alternative: 0, transform: 0 })
const harness = (
  meta: TaskMeta,
  route: (request: Request, hop: number) => Response = (request) => response(request)
) => {
  const records = meta.r5Redirect ??= []
  const counts = state()
  const requests: Array<Request> = []
  const responses: Array<Response> = []
  const client = HttpClient.makeWith(
    (effect: Effect.Effect<Request>) =>
      Effect.map(effect, (request) => {
        counts.transport++
        requests.push(request)
        const result = route(request, requests.length - 1)
        responses.push(result)
        return result
      }),
    (request) =>
      Effect.sync(() => {
        counts.pre++
        return request
      })
  )
  return { counts, requests, responses, client, records }
}
const observe = <E, R>(id: string, effect: Effect.Effect<Response, E, R>, fixture: ReturnType<typeof harness>) =>
  Effect.gen(function*() {
    const exit = yield* Effect.exit(effect)
    fixture.records.push({
      id,
      counts: { ...fixture.counts },
      requests: fixture.requests.map(requestView),
      responses: fixture.responses.map((r) => ({ status: r.status, request: requestView(r.request) })),
      outcome: Exit.isSuccess(exit)
        ? { success: true, status: exit.value.status, request: requestView(exit.value.request) }
        : { success: false, cause: exit.cause }
    })
    return exit
  })
const assertResponse = <E>(exit: Exit.Exit<Response, E>, expected: Response) => {
  assert.isTrue(Exit.isSuccess(exit))
  if (Exit.isSuccess(exit)) assert.strictEqual(exit.value, expected)
}
const wrap = <E, R>(client: HttpClient.HttpClient.With<E, R>, budget: number | "default" | "none") =>
  budget === "none"
    ? client
    : budget === "default"
    ? HttpClient.followRedirects(client)
    : HttpClient.followRedirects(client, budget)

describe("R5 followRedirects boundary", () => {
  for (const errorKind of ["string", "object"]) {
    for (const budget of ["none", 0, 1, "default"] as const) {
      const id = `R01-preprocess-recovered-${errorKind}-${budget}`
      it.effect(id, ({ task }) =>
        Effect.gen(function*() {
          const fixture = harness(task.meta)
          const error = errorKind === "string"
            ? "synthetic preprocessing failure"
            : new Error("synthetic preprocessing failure")
          const original = HttpClientRequest.get("https://fixture.invalid/start")
          const fallback = response(HttpClientRequest.get("https://fixture.invalid/fallback"))
          const seen: Array<unknown> = []
          const recovered = fixture.client.pipe(
            HttpClient.mapRequestEffect(() =>
              Effect.suspend(() => {
                fixture.counts.map++
                return Effect.fail(error)
              })
            ),
            HttpClient.catch((cause) =>
              Effect.sync(() => {
                fixture.counts.caught++
                seen.push(cause)
                return fallback
              })
            )
          )
          const execution = wrap(recovered, budget).execute(original)
          assert.deepStrictEqual(fixture.counts, state())
          const exit = yield* observe(id, execution, fixture)
          fixture.records.push({
            id: `${id}-identity`,
            recoveredExactError: seen[0] === error,
            exactFallback: Exit.isSuccess(exit) && exit.value === fallback
          })
          assertResponse(exit, fallback)
          assert.strictEqual(seen[0], error)
          assert.deepStrictEqual(fixture.counts, { ...state(), pre: 1, map: 1, caught: 1 })
        }))
    }
  }

  for (const budget of [0, "default"] as const) {
    it.effect(`R02-postprocess-recovery-${budget}`, ({ task }) =>
      Effect.gen(function*() {
        const fixture = harness(task.meta)
        const original = HttpClientRequest.get("https://fixture.invalid/start")
        const fallback = response(original)
        const error = new Error("synthetic postprocess failure")
        const client = fixture.client.pipe(
          HttpClient.transformResponse(Effect.flatMap(() => Effect.fail(error))),
          HttpClient.catch((caught) =>
            Effect.sync(() => {
              fixture.counts.caught++
              assert.strictEqual(caught, error)
              return fallback
            })
          ),
          HttpClient.followRedirects(budget === "default" ? undefined : budget)
        )
        assertResponse(yield* observe(`R02-${budget}`, client.execute(original), fixture), fallback)
        assert.deepStrictEqual(fixture.counts, { ...state(), pre: 1, transport: 1, caught: 1 })
      }))
  }

  for (const error of ["unrecovered preprocessing", new Error("unrecovered preprocessing")]) {
    it.effect(`R03-error-identity-${typeof error}`, ({ task }) =>
      Effect.gen(function*() {
        const fixture = harness(task.meta)
        const client = fixture.client.pipe(
          HttpClient.mapRequestEffect(() => Effect.fail(error)),
          HttpClient.followRedirects()
        )
        const exit = yield* observe(`R03-${typeof error}`, client.get("https://fixture.invalid/start"), fixture)
        assert.deepStrictEqual(exit, Exit.fail(error))
        const caught = yield* client.get("https://fixture.invalid/start").pipe(Effect.flip)
        fixture.records.push({
          id: `R03-${typeof error}-identity`,
          sameError: caught === error,
          counts: { ...fixture.counts }
        })
        assert.strictEqual(caught, error)
      }))
  }

  for (const budget of ["none", 0, "default"] as const) {
    it.effect(`R04-success-identity-${budget}`, ({ task }) =>
      Effect.gen(function*() {
        const fixture = harness(task.meta)
        const original = HttpClientRequest.get("https://fixture.invalid/start")
        const client = wrap(fixture.client, budget)
        const execution = client.execute(original)
        assert.deepStrictEqual(fixture.counts, state())
        const exit = yield* observe(`R04-${budget}`, execution, fixture)
        assertResponse(exit, fixture.responses[0])
        assert.strictEqual(fixture.requests[0], original)
        assert.deepStrictEqual(fixture.counts, { ...state(), pre: 1, transport: 1 })
      }))
  }

  const methodCases = [
    [301, "POST", "GET"],
    [301, "PUT", "PUT"],
    [302, "POST", "GET"],
    [302, "PUT", "PUT"],
    [303, "POST", "GET"],
    [303, "GET", "GET"],
    [303, "HEAD", "HEAD"],
    [307, "POST", "POST"],
    [307, "PUT", "PUT"],
    [307, "HEAD", "HEAD"],
    [308, "POST", "POST"],
    [308, "PUT", "PUT"],
    [308, "HEAD", "HEAD"]
  ] as const
  for (const [status, method, expectedMethod] of methodCases) {
    const id = `R05-method-${status}-${method}`
    it.effect(id, ({ task }) =>
      Effect.gen(function*() {
        const fixture = harness(task.meta, (request, hop) =>
          hop < 2
            ? response(request, status, { location: hop === 0 ? "../next/step?hop=1#one" : "final?hop=2#two" })
            : response(request))
        const original = HttpClientRequest.make(method)("/path/start", {
          urlParams: { initial: "yes" },
          hash: "initial",
          headers: { "x-retained": "yes", cookie: "sample=value" }
        }).pipe(HttpClientRequest.bodyText("payload"))
        const client = fixture.client.pipe(
          HttpClient.mapRequestEffect((request) =>
            Effect.sync(() => {
              fixture.counts.map++
              return request.pipe(
                HttpClientRequest.prependUrl("https://fixture.invalid"),
                HttpClientRequest.appendUrlParam("pre", "1")
              )
            })
          ),
          HttpClient.followRedirects()
        )
        const execution = client.execute(original)
        assert.deepStrictEqual(fixture.counts, state())
        const exit = yield* observe(id, execution, fixture)
        assertResponse(exit, fixture.responses[2])
        assert.strictEqual(fixture.responses[2].request, fixture.requests[2])
        assert.deepStrictEqual(fixture.counts, { ...state(), pre: 1, map: 1, transport: 3 })
        assert.deepStrictEqual(fixture.requests.map((r) => r.url), [
          "https://fixture.invalid/path/start",
          "https://fixture.invalid/next/step",
          "https://fixture.invalid/next/final"
        ])
        assert.deepStrictEqual(fixture.requests.map((r) => Array.from(r.urlParams)), [
          [["initial", "yes"], ["pre", "1"]],
          [["hop", "1"]],
          [["hop", "2"]]
        ])
        assert.deepStrictEqual(fixture.requests.map((r) => Option.getOrUndefined(r.hash)), ["initial", "one", "two"])
        assert.deepStrictEqual(fixture.requests.map((r) => r.method), [method, expectedMethod, expectedMethod])
        for (const request of fixture.requests.slice(1)) {
          assert.strictEqual(request.headers["x-retained"], "yes")
          assert.strictEqual(request.headers.cookie, "sample=value")
          if (method !== expectedMethod) {
            assert.strictEqual(request.body._tag, "Empty")
            assert.isUndefined(request.headers["content-type"])
            assert.isUndefined(request.headers["content-length"])
          } else {
            assert.strictEqual(request.body, original.body)
            assert.strictEqual(request.headers["content-type"], original.headers["content-type"])
            assert.strictEqual(request.headers["content-length"], original.headers["content-length"])
          }
        }
      }))
  }

  for (const budget of [0, 1, 2, "default"] as const) {
    it.effect(`R06-circular-bounded-${budget}`, ({ task }) =>
      Effect.gen(function*() {
        const fixture = harness(task.meta, (request, hop) =>
          response(request, 302, { location: hop % 2 === 0 ? "/b" : "/a" }))
        const exit = yield* observe(
          `R06-${budget}`,
          wrap(fixture.client, budget).get("https://fixture.invalid/a"),
          fixture
        )
        const attempts = (budget === "default" ? 10 : budget) + 1
        assertResponse(exit, fixture.responses[attempts - 1])
        assert.deepStrictEqual(fixture.counts, { ...state(), pre: 1, transport: attempts })
      }))
  }

  for (const status of [200, 299, 302, 304, 400]) {
    it.effect(`R07-no-location-${status}`, ({ task }) =>
      Effect.gen(function*() {
        const fixture = harness(task.meta, (request) => response(request, status))
        const exit = yield* observe(
          `R07-${status}`,
          HttpClient.followRedirects(fixture.client).get("https://fixture.invalid/start"),
          fixture
        )
        assertResponse(exit, fixture.responses[0])
        assert.deepStrictEqual(fixture.counts, { ...state(), pre: 1, transport: 1 })
      }))
  }

  it.effect("R08-context-remains-inside-response-wrapper", ({ task }) =>
    Effect.gen(function*() {
      const Marker = Context.Reference<string>("R5/RedirectMarker", { defaultValue: () => "outside" })
      const fixture = harness(task.meta)
      const seen: Array<string> = []
      const client = fixture.client.pipe(
        HttpClient.mapRequestEffect((request) =>
          Effect.map(Marker, (value) => {
            seen.push(value)
            fixture.counts.map++
            return HttpClientRequest.setHeader(request, "x-context", value)
          })
        ),
        HttpClient.transformResponse((effect) =>
          effect.pipe(
            Effect.tap(() =>
              Effect.map(Marker, (value) => {
                seen.push(value)
              })
            ),
            Effect.provideService(Marker, "inside")
          )
        ),
        HttpClient.followRedirects(0)
      )
      const exit = yield* observe("R08", client.get("https://fixture.invalid/start"), fixture)
      fixture.records.push({ id: "R08-context", seen })
      assertResponse(exit, fixture.responses[0])
      assert.deepStrictEqual(seen, ["inside", "inside"])
      assert.strictEqual(fixture.requests[0].headers["x-context"], "inside")
    }))

  it.effect("R09-catch-filter-transform-remain-enclosing", ({ task }) =>
    Effect.gen(function*() {
      const fixture = harness(task.meta)
      const fallback = response(HttpClientRequest.get("https://fixture.invalid/recovered"))
      const client = fixture.client.pipe(
        HttpClient.mapRequestEffect(() => Effect.fail("preprocess failed")),
        HttpClient.catch(() =>
          Effect.sync(() => {
            fixture.counts.caught++
            return fallback
          })
        ),
        HttpClient.filterOrFail((r) => {
          fixture.counts.filter++
          return r.status === 200
        }, () => "filter failed"),
        HttpClient.transformResponse(Effect.tap(() =>
          Effect.sync(() => {
            fixture.counts.transform++
          })
        )),
        HttpClient.followRedirects(0)
      )
      assertResponse(yield* observe("R09", client.get("https://fixture.invalid/start"), fixture), fallback)
      assert.deepStrictEqual(fixture.counts, { ...state(), pre: 1, caught: 1, filter: 1, transform: 1 })
    }))

  it.effect("R10-filter-alternative-response-identity", ({ task }) =>
    Effect.gen(function*() {
      const fixture = harness(task.meta, (request) => response(request, 302, { location: "/unused" }))
      const fallback = response(HttpClientRequest.get("https://fixture.invalid/alternative"))
      const client = fixture.client.pipe(
        HttpClient.filterOrElse((r) => {
          fixture.counts.filter++
          return r.status === 200
        }, () =>
          Effect.sync(() => {
            fixture.counts.alternative++
            return fallback
          })),
        HttpClient.transformResponse(Effect.tap(() =>
          Effect.sync(() => {
            fixture.counts.transform++
          })
        )),
        HttpClient.followRedirects()
      )
      assertResponse(yield* observe("R10", client.get("https://fixture.invalid/start"), fixture), fallback)
      assert.deepStrictEqual(fixture.counts, {
        ...state(),
        pre: 1,
        transport: 1,
        filter: 1,
        alternative: 1,
        transform: 1
      })
    }))

  it.effect("R11-filter-failure-identity", ({ task }) =>
    Effect.gen(function*() {
      const fixture = harness(task.meta)
      const error = new Error("filtered response")
      const client = fixture.client.pipe(
        HttpClient.filterOrFail(() => {
          fixture.counts.filter++
          return false
        }, () => error),
        HttpClient.followRedirects()
      )
      const exit = yield* observe("R11", client.get("https://fixture.invalid/start"), fixture)
      assert.deepStrictEqual(exit, Exit.fail(error))
      assert.deepStrictEqual(fixture.counts, { ...state(), pre: 1, transport: 1, filter: 1 })
    }))

  for (const status of [302, 307]) {
    it.effect(`R12-response-request-not-input-${status}`, ({ task }) =>
      Effect.gen(function*() {
        const fixture = harness(task.meta, (request, hop) =>
          hop === 0 ? response(request, status, { location: "next" }) : response(request))
        const other = HttpClientRequest.post("https://fixture.invalid/other/base").pipe(
          HttpClientRequest.bodyText("other")
        )
        const original = HttpClientRequest.put("https://fixture.invalid/start").pipe(
          HttpClientRequest.bodyText("original"),
          HttpClientRequest.setHeader("x-original", "retained")
        )
        const client = fixture.client.pipe(
          HttpClient.mapRequestEffect((request) =>
            Effect.sync(() => {
              fixture.counts.map++
              return HttpClientRequest.setHeader(request, "x-preprocessed", "retained")
            })
          ),
          HttpClient.transformResponse(Effect.map((r) => {
            fixture.counts.transform++
            return r.status === status ? response(other, status, { location: "next" }) : r
          })),
          HttpClient.followRedirects()
        )
        const exit = yield* observe(`R12-${status}`, client.execute(original), fixture)
        assertResponse(exit, fixture.responses[1])
        const redirected = fixture.requests[1]
        assert.strictEqual(redirected.url, "https://fixture.invalid/other/next")
        assert.strictEqual(redirected.method, "PUT")
        assert.strictEqual(redirected.body, original.body)
        assert.strictEqual(redirected.headers["x-original"], "retained")
        assert.strictEqual(redirected.headers["x-preprocessed"], "retained")
        assert.deepStrictEqual(fixture.counts, { ...state(), pre: 1, map: 1, transport: 2, transform: 2 })
      }))
  }

  it.effect("R13-nested-redirect-wrappers-preserve-current-input", ({ task }) =>
    Effect.gen(function*() {
      const fixture = harness(task.meta, (request, hop) =>
        hop === 0
          ? response(request, 302, { location: "/middle" })
          : hop === 1
          ? response(request, 307, { location: "/final" })
          : response(request))
      const original = HttpClientRequest.post("https://fixture.invalid/start").pipe(
        HttpClientRequest.bodyText("original")
      )
      const client = fixture.client.pipe(HttpClient.followRedirects(1), HttpClient.followRedirects(2))
      assertResponse(yield* observe("R13", client.execute(original), fixture), fixture.responses[2])
      // Compatibility control: the outer wrapper's input remains POST, even after an inner rewrite.
      assert.deepStrictEqual(fixture.requests.map((r) => r.method), ["POST", "GET", "POST"])
      assert.strictEqual(fixture.requests[2].body, original.body)
      assert.deepStrictEqual(fixture.counts, { ...state(), pre: 1, transport: 3 })
    }))

  it.effect("R14-recovered-request-failure-redirects-from-fallback-request", ({ task }) =>
    Effect.gen(function*() {
      const fixture = harness(task.meta)
      const fallbackRequest = HttpClientRequest.put("https://fixture.invalid/recovered/base").pipe(
        HttpClientRequest.bodyText("fallback"),
        HttpClientRequest.setHeader("x-fallback", "yes")
      )
      const fallback = response(fallbackRequest, 307, { location: "next?recovered=1" })
      const client = fixture.client.pipe(
        HttpClient.mapRequestEffect(() =>
          Effect.suspend(() => {
            fixture.counts.map++
            return Effect.fail("request failed")
          })
        ),
        HttpClient.catch(() =>
          Effect.sync(() => {
            fixture.counts.caught++
            return fallback
          })
        ),
        HttpClient.followRedirects()
      )
      const exit = yield* observe("R14", client.get("https://fixture.invalid/original"), fixture)
      assertResponse(exit, fixture.responses[0])
      assert.strictEqual(fixture.requests[0].url, "https://fixture.invalid/recovered/next")
      assert.strictEqual(fixture.requests[0].method, "PUT")
      assert.strictEqual(fixture.requests[0].body, fallbackRequest.body)
      assert.strictEqual(fixture.requests[0].headers["x-fallback"], "yes")
      assert.deepStrictEqual(Array.from(fixture.requests[0].urlParams), [["recovered", "1"]])
      assert.deepStrictEqual(fixture.counts, { ...state(), pre: 1, map: 1, transport: 1, caught: 1 })
    }))

  it.effect("R15-repeat-execution-resets-captured-request", ({ task }) =>
    Effect.gen(function*() {
      const fixture = harness(task.meta)
      const fallbackRequest = HttpClientRequest.put("https://fixture.invalid/recovered/base").pipe(
        HttpClientRequest.bodyText("fallback")
      )
      const fallback = response(fallbackRequest, 307, { location: "next" })
      const client = fixture.client.pipe(
        HttpClient.mapRequestEffect((request) =>
          Effect.suspend(() => {
            fixture.counts.map++
            return fixture.counts.map === 1 ? Effect.succeed(request) : Effect.fail("second evaluation")
          })
        ),
        HttpClient.catch(() =>
          Effect.sync(() => {
            fixture.counts.caught++
            return fallback
          })
        ),
        HttpClient.followRedirects()
      )
      const execution = client.get("https://fixture.invalid/original")
      assertResponse(yield* observe("R15-first", execution, fixture), fixture.responses[0])
      assertResponse(yield* observe("R15-second", execution, fixture), fixture.responses[1])
      assert.strictEqual(fixture.requests[1].method, "PUT")
      assert.strictEqual(fixture.requests[1].body, fallbackRequest.body)
      assert.deepStrictEqual(fixture.counts, { ...state(), pre: 2, map: 2, transport: 2, caught: 1 })
    }))

  for (const placement of ["inside", "outside"]) {
    it.effect(`R16-cookie-wrapper-${placement}`, ({ task }) =>
      Effect.gen(function*() {
        const jar = yield* Ref.make(Cookies.fromSetCookie("seed=initial"))
        const fixture = harness(task.meta, (request, hop) =>
          hop === 0
            ? response(request, 307, { location: "/next", "set-cookie": "first=one" })
            : response(request, 200, { "set-cookie": "last=two" }))
        const client = placement === "inside"
          ? fixture.client.pipe(HttpClient.withCookiesRef(jar), HttpClient.followRedirects())
          : fixture.client.pipe(HttpClient.followRedirects(), HttpClient.withCookiesRef(jar))
        assertResponse(
          yield* observe(`R16-${placement}`, client.get("https://fixture.invalid/start"), fixture),
          fixture.responses[1]
        )
        const cookies = Cookies.toCookieHeader(yield* Ref.get(jar)).split("; ").sort()
        fixture.records.push({ id: `R16-${placement}-jar`, cookies })
        assert.deepStrictEqual(
          cookies,
          placement === "inside" ? ["first=one", "last=two", "seed=initial"] : ["last=two", "seed=initial"]
        )
        assert.deepStrictEqual(fixture.requests.map((r) => r.headers.cookie), ["seed=initial", "seed=initial"])
        assert.deepStrictEqual(fixture.counts, { ...state(), pre: 1, transport: 2 })
      }))
  }

  for (const placement of ["inside", "outside"]) {
    it.effect(`R17-transform-request-argument-${placement}`, ({ task }) =>
      Effect.gen(function*() {
        const fixture = harness(task.meta, (request, hop) =>
          hop === 0
            ? response(request, 307, { location: "/next" }) :
            response(request))
        const seen: Array<Request> = []
        const transform = HttpClient.transform((effect: Effect.Effect<Response>, request) =>
          Effect.tap(effect, () =>
            Effect.sync(() => {
              fixture.counts.transform++
              seen.push(request)
            }))
        )
        const client = placement === "inside"
          ? fixture.client.pipe(transform, HttpClient.followRedirects())
          : fixture.client.pipe(HttpClient.followRedirects(), transform)
        assertResponse(
          yield* observe(`R17-${placement}`, client.get("https://fixture.invalid/start"), fixture),
          fixture.responses[1]
        )
        fixture.records.push({ id: `R17-${placement}-requests`, requests: seen.map(requestView) })
        assert.deepStrictEqual(seen, placement === "inside" ? fixture.requests : [fixture.requests[0]])
        assert.deepStrictEqual(fixture.counts, {
          ...state(),
          pre: 1,
          transport: 2,
          transform: placement === "inside" ? 2 : 1
        })
      }))
  }

  for (const statuses of [[302, 307], [307, 303, 308]]) {
    const id = `R18-mixed-method-chain-${statuses.join("-")}`
    it.effect(id, ({ task }) =>
      Effect.gen(function*() {
        const fixture = harness(task.meta, (request, hop) =>
          hop < statuses.length
            ? response(request, statuses[hop], { location: `/hop${hop + 1}` }) :
            response(request))
        const original = HttpClientRequest.post("https://fixture.invalid/start").pipe(
          HttpClientRequest.bodyText("original")
        )
        const exit = yield* observe(id, HttpClient.followRedirects(fixture.client).execute(original), fixture)
        assertResponse(exit, fixture.responses[statuses.length])
        assert.deepStrictEqual(
          fixture.requests.map((r) => r.method),
          statuses[0] === 302
            ? ["POST", "GET", "GET"] :
            ["POST", "POST", "GET", "GET"]
        )
        assert.deepStrictEqual(
          fixture.requests.map((r) => r.body._tag),
          statuses[0] === 302
            ? ["Uint8Array", "Empty", "Empty"] :
            ["Uint8Array", "Uint8Array", "Empty", "Empty"]
        )
        assert.deepStrictEqual(fixture.counts, { ...state(), pre: 1, transport: statuses.length + 1 })
      }))
  }
})
