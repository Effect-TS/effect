import { effect as T } from "@matechs/effect";
import * as H from "@matechs/http-client";
import querystring from "querystring";
import { left, right } from "fp-ts/lib/Either";
import { pipe } from "fp-ts/lib/pipeable";
import { fromNullable } from "fp-ts/lib/Option";

export const httpFetch: (fetchApi: typeof fetch) => H.Http = fetchApi => ({
  [H.httpEnv]: {
    request: (method, url, headers, requestType, body) =>
      T.accessM((d: H.HttpDeserializer) =>
        T.async(r => {
          fetchApi(url, {
            headers: {
              ...headers,
              "Content-Type": H.foldRequestType(
                requestType,
                () => "application/json",
                () => "application/x-www-form-urlencoded",
                () => "multipart/form-data"
              )
            },
            body: body
              ? H.foldRequestType(
                  requestType,
                  () => JSON.stringify(body),
                  () => querystring.stringify(body as any),
                  () => (body as any) as FormData
                )
              : undefined,
            method: H.getMethodAsString(method)
          })
            .then(resp => {
              const h: Record<string, string> = {};

              resp.headers.forEach((val, key) => {
                h[key] = val;
              });

              if (resp.status >= 200 && resp.status < 300) {
                resp.text().then(b => {
                  r(
                    right({
                      headers: h,
                      status: resp.status,
                      body: fromNullable(d[H.httpDeserializerEnv].response(b))
                    })
                  );
                });
              } else {
                resp.text().then(b => {
                  r(
                    left({
                      _tag: H.HttpErrorReason.Response,
                      response: {
                        headers: h,
                        status: resp.status,
                        body: fromNullable(
                          d[H.httpDeserializerEnv].errorResponse(b)
                        )
                      }
                    })
                  );
                });
              }
            })
            .catch(err => {
              r(left({ _tag: H.HttpErrorReason.Request, error: err }));
            });

          // tslint:disable-next-line: no-empty
          return () => {};
        })
      )
  }
});

export const jsonClient = (fetchApi: typeof fetch) =>
  pipe(
    T.noEnv,
    T.mergeEnv(httpFetch(fetchApi)),
    T.mergeEnv(H.jsonDeserializer)
  );
