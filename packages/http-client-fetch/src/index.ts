import { effect as T } from "@matechs/effect";
import * as H from "@matechs/http-client";
import querystring from "querystring";
import { left, right } from "fp-ts/lib/Either";
import { pipe } from "fp-ts/lib/pipeable";
import { fromNullable } from "fp-ts/lib/Option";

function isJson(requestType?: H.RequestType): boolean {
  switch (requestType) {
    case H.RequestType.JSON:
      return true;
    case H.RequestType.DATA:
      return false;
    default:
      return true;
  }
}

function getMethod(method: H.Method) {
  switch (method) {
    case H.Method.GET:
      return "GET";
    case H.Method.POST:
      return "POST";
    case H.Method.PUT:
      return "PUT";
    case H.Method.PATCH:
      return "PATCH";
    case H.Method.DELETE:
      return "DELETE";
  }
}

export function contentType(requestType?: H.RequestType) {
  if (
    typeof requestType === "undefined" ||
    requestType === H.RequestType.JSON
  ) {
    return "application/json";
  }
  return "application/x-www-form-urlencoded";
}

export const httpFetch: (fetchApi: typeof fetch) => H.Http = fetchApi => ({
  [H.httpEnv]: {
    request: (method, url, headers, body, requestType) =>
      T.accessM((d: H.HttpDeserializer) =>
        T.async(r => {
          fetchApi(url, {
            headers: { ...headers, "Content-Type": contentType(requestType) },
            body: body
              ? isJson(requestType)
                ? JSON.stringify(body)
                : querystring.stringify(body as any)
              : undefined,
            method: getMethod(method)
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

export const jsonClient = pipe(
  T.noEnv,
  T.mergeEnv(
    httpFetch(
      window && window.fetch ? window.fetch : require("isomorphic-fetch")
    )
  ),
  T.mergeEnv(H.jsonDeserializer)
);
