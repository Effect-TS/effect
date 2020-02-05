import { effect as T } from "@matechs/effect";
import * as H from "@matechs/http-client";
import * as E from "fp-ts/lib/Either";
import { pipe } from "fp-ts/lib/pipeable";
import * as R from "fp-ts/lib/Record";
import * as C from "node-libcurl";
import path from "path";
import querystring, { ParsedUrlQueryInput } from "querystring";
import { fromNullable } from "fp-ts/lib/Option";

export const libcurl: (caPath?: string) => H.Http = (
  caPath = path.join(
    require.resolve("@matechs/http-client-libcurl").replace("index.js", ""),
    "../cacert-2019-11-27.pem"
  )
) => ({
  [H.httpEnv]: {
    request: (
      method: H.Method,
      url: string,
      requestType: H.RequestType,
      responseType: H.ResponseType,
      headers: Record<string, string>,
      body?: unknown
    ): T.Effect<T.NoEnv, H.HttpError<string>, H.Response<any>> =>
      requestType === "FORM" || requestType === "BINARY"
        ? /* istanbul ignore next */ requestType === "FORM"
          ? T.raiseError({
              // cannot be triggered from exposed functions
              _tag: H.HttpErrorReason.Request,
              error: new Error("multipart form not supported")
            })
          : T.raiseError({
              // cannot be triggered from exposed functions
              _tag: H.HttpErrorReason.Request,
              error: new Error("binary not supported")
            })
        : T.async(done => {
            const req = new C.Curl();
            const reqHead = [
              ...H.foldRequestType(
                requestType,
                () => ["Content-Type: application/json"],
                () => ["Content-Type: application/x-www-form-urlencoded"],
                () => ["Content-Type: multipart/form-data"],
                () => ["Content-Type: application/octet-stream"]
              ),
              ...pipe(
                headers,
                R.collect((k, v) => `${k}: ${v}`)
              )
            ];

            req.setOpt("URL", url);
            req.setOpt("CAINFO", caPath);
            req.setOpt("FOLLOWLOCATION", 1);
            req.setOpt("VERBOSE", 0);
            req.setOpt("SSL_VERIFYHOST", 2);
            req.setOpt("SSL_VERIFYPEER", 1);

            req.setOpt(C.Curl.option.HTTPHEADER, reqHead);

            if (method !== "GET") {
              customReq(H.getMethodAsString(method), req, requestType, body);
            }

            req
              .on("error", error => {
                done(
                  E.left({
                    _tag: H.HttpErrorReason.Request,
                    error
                  })
                );
              })
              .on("end", (statusCode, body, headers) => {
                if (statusCode >= 200 && statusCode < 300) {
                  H.foldResponseType(
                    responseType,
                    () =>
                      // JSON
                      done(
                        E.either.map(
                          E.tryCatch(
                            () => JSON.parse(body.toString()),
                            e => ({
                              // TODO: verify what to do exactly, this is not an error from the API => we should enlarge our error type
                              _tag: H.HttpErrorReason.Response,
                              response: getResponse(
                                statusCode,
                                "not a Json",
                                headers
                              )
                            })
                          ),
                          json => getResponse(statusCode, json, headers)
                        )
                      ),
                    () =>
                      // TEXT
                      done(
                        E.right(
                          getResponse(statusCode, body.toString(), headers)
                        )
                      ),
                    () =>
                      Buffer.isBuffer(body)
                        ? done(E.right(getResponse(statusCode, body, headers)))
                        : // BINARY
                          done(
                            E.left({
                              _tag: H.HttpErrorReason.Response,
                              response: getResponse(
                                statusCode,
                                "not a buffer",
                                headers
                              )
                            })
                          )
                  );
                } else {
                  done(
                    E.left({
                      _tag: H.HttpErrorReason.Response,
                      response: getResponse(
                        statusCode,
                        body.toString(),
                        headers
                      )
                    })
                  );
                }
              });

            req.perform();

            return () => {
              req.close();
            };
          })
  }
});

function customReq(
  method: string,
  req: C.Curl,
  requestType: H.RequestType,
  body?: unknown
): void {
  if (body) {
    req.setOpt(
      C.Curl.option.POSTFIELDS,
      H.foldRequestType(
        requestType,
        () => JSON.stringify(body),
        () => querystring.stringify(body as ParsedUrlQueryInput),
        () => querystring.stringify(body as ParsedUrlQueryInput),
        () => (body as Buffer).toString("utf-8")
      )
    );
  }

  req.setOpt(C.Curl.option.CUSTOMREQUEST, method);
}

function getResponse<A>(
  statusCode: number,
  body: A,
  headers: Buffer | C.HeaderInfo[]
): H.Response<NonNullable<A>> {
  return {
    status: statusCode,
    body: fromNullable(body),
    headers: getHeaders(headers)
  };
}

function getHeaders(headers: Buffer | C.HeaderInfo[]): C.HeaderInfo {
  /* istanbul ignore next */
  return headers.length > 0
    ? typeof headers[0] !== "number"
      ? headers[0]
      : {}
    : {};
}

export const client = pipe(T.noEnv, T.mergeEnv(libcurl()));
