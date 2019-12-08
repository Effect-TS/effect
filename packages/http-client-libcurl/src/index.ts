import { effect as T } from "@matechs/effect";
import * as H from "@matechs/http-client";
import * as E from "fp-ts/lib/Either";
import { pipe } from "fp-ts/lib/pipeable";
import * as R from "fp-ts/lib/Record";
import * as C from "node-libcurl";
import path from "path";
import querystring from "querystring";

function isJson(requestType?: H.RequestType) {
  switch (requestType) {
    case H.RequestType.JSON:
      return true;
    case H.RequestType.DATA:
      return false;
    default:
      return true;
  }
}

export const libcurl: (caPath?: string) => H.Http = (
  caPath = path.join(__dirname, "../cacert-2019-11-27.pem")
) => ({
  http: {
    request: <I, E, O>(
      method: H.Method,
      url: string,
      headers: Record<string, string>,
      body: I,
      requestType?: H.RequestType
    ): T.Effect<H.HttpDeserializer, H.HttpError<E>, H.Response<O>> =>
      T.accessM(({ httpDeserializer }: H.HttpDeserializer) =>
        T.async(done => {
          const req = new C.Curl();
          const reqHead = [
            ...(isJson(requestType) ? ["Content-Type: application/json"] : []),
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

          switch (method) {
            case H.Method.POST:
              customReq("POST", req, body, requestType);
              break;
            case H.Method.PUT:
              customReq("PUT", req, body, requestType);
              break;
            case H.Method.PATCH:
              customReq("PATCH", req, body, requestType);
              break;
            case H.Method.DELETE:
              customReq("DELETE", req, body, requestType);
              break;
            default:
              break;
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
                done(
                  E.right(
                    getResponse(
                      statusCode,
                      body.toString(),
                      headers,
                      httpDeserializer
                    )
                  )
                );
              } else {
                done(
                  E.left({
                    _tag: H.HttpErrorReason.Response,
                    response: getResponse(
                      statusCode,
                      body.toString(),
                      headers,
                      httpDeserializer
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
      )
  }
});

function customReq<I>(
  method: string,
  req: C.Curl,
  body?: I,
  requestType?: H.RequestType
) {
  if (body) {
    req.setOpt(
      C.Curl.option.POSTFIELDS,
      isJson(requestType)
        ? JSON.stringify(body)
        : querystring.stringify(body as any)
    );
  }

  req.setOpt(C.Curl.option.CUSTOMREQUEST, method);
}

function getResponse<A>(
  statusCode: number,
  bodyStr: string,
  headers: Buffer | C.HeaderInfo[],
  httpDeserializer: H.HttpDeserializer["httpDeserializer"]
): H.Response<A> {
  return {
    status: statusCode,
    body:
      bodyStr.length > 0
        ? statusCode >= 200 && statusCode < 300
          ? httpDeserializer.response(bodyStr)
          : httpDeserializer.errorResponse(bodyStr)
        : undefined,
    headers: getHeaders(headers)
  };
}

function getHeaders(headers: Buffer | C.HeaderInfo[]) {
  /* istanbul ignore next */
  return headers.length > 0
    ? typeof headers[0] !== "number"
      ? headers[0]
      : {}
    : {};
}
