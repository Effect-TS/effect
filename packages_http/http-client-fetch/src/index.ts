import querystring from "query-string"

import * as T from "@matechs/core/Effect"
import * as E from "@matechs/core/Either"
import * as L from "@matechs/core/Layer"
import * as O from "@matechs/core/Option"
import * as H from "@matechs/http-client"

function getContentType(requestType: H.RequestType): string {
  return H.foldRequestType(
    requestType,
    () => "application/json",
    () => "application/x-www-form-urlencoded",
    () => "multipart/form-data",
    () => "application/octet-stream"
  )
}

function getBody(
  body: unknown,
  requestType: H.RequestType
): string | ArrayBuffer | SharedArrayBuffer | FormData {
  return H.foldRequestType(
    requestType,
    () => JSON.stringify(body),
    () => querystring.stringify(body as any),
    () => (body as any) as FormData,
    () => body as Buffer
  )
}

export const Client = (fetchApi: typeof fetch) =>
  L.fromValue<H.Http>({
    [H.HttpURI]: {
      request(
        method: H.Method,
        url: string,
        requestType: H.RequestType,
        responseType: H.ResponseType,
        headers: Record<string, string>,
        body: unknown
      ): T.AsyncE<H.HttpError<string>, H.Response<any>> {
        const input: RequestInit = {
          headers: {
            "Content-Type": getContentType(requestType),
            ...headers
          },
          body: body ? getBody(body, requestType) : undefined,
          method: H.getMethodAsString(method)
        }

        return T.async((r) => {
          fetchApi(url, input)
            .then((resp) => {
              const h: Record<string, string> = {}

              resp.headers.forEach((val, key) => {
                h[key] = val
              })

              if (resp.status >= 200 && resp.status < 300) {
                H.foldResponseType(
                  responseType,
                  () => {
                    resp.json().then((json: unknown) => {
                      r(
                        E.right({
                          headers: h,
                          status: resp.status,
                          body: O.fromNullable(json)
                        })
                      )
                    })
                  },
                  () =>
                    resp.text().then((text) => {
                      r(
                        E.right({
                          headers: h,
                          status: resp.status,
                          body: O.fromNullable(text)
                        })
                      )
                    }),
                  () => {
                    if (resp["arrayBuffer"]) {
                      resp.arrayBuffer().then((arrayBuffer) => {
                        r(
                          E.right({
                            headers: h,
                            status: resp.status,
                            body: O.fromNullable(Buffer.from(arrayBuffer))
                          })
                        )
                      })
                    } else {
                      ;(resp as any).buffer().then((buffer: Buffer) => {
                        r(
                          E.right({
                            headers: h,
                            status: resp.status,
                            body: O.fromNullable(Buffer.from(buffer))
                          })
                        )
                      })
                    }
                  }
                )
              } else {
                resp.text().then((text) => {
                  r(
                    E.left({
                      _tag: H.HttpErrorReason.Response,
                      response: {
                        headers: h,
                        status: resp.status,
                        body: O.fromNullable(text)
                      }
                    })
                  )
                })
              }
            })
            .catch((err) => {
              r(E.left({ _tag: H.HttpErrorReason.Request, error: err }))
            })

          // eslint-disable-next-line @typescript-eslint/no-empty-function
          return (cb) => {
            cb()
          }
        })
      }
    }
  })
