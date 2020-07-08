import * as React from "react"

import { pipe } from "@matechs/core/Function"
import * as T from "@matechs/core/next/Effect"
import * as L from "@matechs/core/next/Layer"
import * as M from "@matechs/morphic"
import * as R from "@matechs/react"

//
// Integration
//

const Organization_ = M.make((F) =>
  F.both(
    {
      id: F.number({
        conf: {
          [M.FastCheckURI]: (_, { module: { integer } }) => integer()
        }
      }),
      login: F.string({
        conf: {
          [M.FastCheckURI]: (_, { module: { string } }) => string(4)
        }
      })
    },
    {
      description: F.string(),
      avatar_url: F.string(),
      node_id: F.string(),
      url: F.string(),
      repos_url: F.string(),
      events_url: F.string(),
      hooks_urs: F.string(),
      issues_url: F.string(),
      members_url: F.string(),
      public_members_url: F.string()
    }
  )
)

export interface Organization extends M.AType<typeof Organization_> {}

export const Organization = M.opaque_<Organization>()(Organization_)
export const OrganizationArray = M.make((F) =>
  F.array(Organization(F), {
    conf: { [M.FastCheckURI]: (a) => a.filter((x) => x.length > 0) }
  })
)

interface Message {
  message: string
}

export class HttpError implements Message {
  readonly _tag = "HttpError"
  constructor(readonly error: unknown) {}

  get message() {
    if (this.error instanceof Error) {
      return this.error.message
    } else {
      return "Something went wrong"
    }
  }
}

export class DecodingError implements Message {
  readonly _tag = "DecodingError"
  constructor(readonly error: M.Errors) {}

  get message() {
    return M.reportFailure(this.error).join(", ")
  }
}

export abstract class Http {
  abstract readonly getJson: <T>(
    _: M.M<any, any, T>
  ) => (url: string) => T.AsyncRE<T.DefaultEnv, HttpError | DecodingError, T>
}

export class LiveHttp extends Http {
  readonly getJson: <T>(
    _: M.M<any, any, T>
  ) => (url: string) => T.AsyncE<HttpError | DecodingError, T> = (_) => (url: string) =>
    pipe(
      T.effectAsync<unknown, HttpError, unknown>((cb) => {
        fetch(url)
          .then((res) => res.json())
          .then((res) => {
            cb(T.succeedNow(res))
          })
          .catch((e) => {
            cb(T.fail(new HttpError(e)))
          })
      }),
      T.chain((u) =>
        pipe(
          T.fromEither(() => _.decode(u)),
          T.catchAll((e) => T.fail(new DecodingError(e)))
        )
      )
    )
}

export const HasHttp = T.has(Http)()

export const provideHttp = L.service(HasHttp).fromEffect(
  T.effectTotal(() => new LiveHttp())
)

export abstract class GithubOrganizations {
  abstract readonly useOrganizations: () => OrganizationsState
}

export class LiveGithubOrganizations extends GithubOrganizations {
  constructor(private http: Http) {
    super()
  }

  readonly fetchSince = (since: number) =>
    this.http.getJson(OrganizationArray)(
      `https://api.github.com/organizations?since=${since}`
    )

  readonly useOrganizations = () => {
    const [state, setState] = React.useState<OrganizationsState>({
      _tag: "Loading"
    })

    React.useEffect(() => {
      this.pageLoader(setState, 0, true)
    }, [])

    return state
  }

  readonly pageLoader = (
    setState: React.Dispatch<React.SetStateAction<OrganizationsState>>,
    since: number,
    initial = false
  ) =>
    pipe(
      T.effectTotal(() => {
        if (!initial) {
          setState({
            _tag: "Loading"
          })
        }
      }),
      T.chain(() => T.delay(1000)(this.fetchSince(since))),
      T.chain((orgs) =>
        T.effectTotal(() => {
          setState(() => ({
            _tag: "Done",
            orgs,
            nextPage: () => {
              this.pageLoader(
                setState,
                [0, ...orgs.map((o) => o.id)].reduce((a, b) => Math.max(a, b))
              )
            }
          }))
        })
      ),
      T.catchAll((e) =>
        T.effectTotal(() => {
          setState({
            _tag: "Errored",
            message: e.message,
            retry: () => {
              this.pageLoader(setState, since)
            }
          })
        })
      ),
      T.runAsync
    )
}

export const HasGithubOrganizations = T.has(GithubOrganizations)()
export type HasGithubOrganizations = T.HasType<typeof HasGithubOrganizations>

export const provideGithubOrganizations = L.service(HasGithubOrganizations).fromEffect(
  T.accessService(HasHttp)((http) => new LiveGithubOrganizations(http))
)

//
// View
//

export interface Loading {
  _tag: "Loading"
}

export interface Errored {
  _tag: "Errored"
  message: string
  retry: () => void
}

export interface Done {
  _tag: "Done"
  orgs: readonly Organization[]
  nextPage: () => void
}

export type OrganizationsState = Loading | Errored | Done

export function OrganizationsView({ runtime }: R.RuntimeProps<HasGithubOrganizations>) {
  const status = HasGithubOrganizations.read(runtime).useOrganizations()

  switch (status._tag) {
    case "Loading": {
      return <div>Loading...</div>
    }
    case "Errored": {
      return (
        <>
          <div>Error: {status.message}</div>
          <button
            onClick={() => {
              status.retry()
            }}
          >
            Retry
          </button>
        </>
      )
    }
    case "Done": {
      return (
        <>
          <div style={{ marginBottom: "1em" }}>Organizations:</div>
          {status.orgs.map((o) => o.login).join(", ")}
          <div style={{ marginTop: "1em" }}>
            <button
              onClick={() => {
                status.nextPage()
              }}
            >
              Next
            </button>
          </div>
        </>
      )
    }
  }
}

//
// Runtime
//

export default pipe(
  provideGithubOrganizations,
  L.using(provideHttp),
  R.render(OrganizationsView)
)
