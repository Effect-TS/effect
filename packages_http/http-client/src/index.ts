import { T, O, F } from "@matechs/prelude";
import { ParsedQuery } from "query-string";

/* tested in the implementation packages */
/* istanbul ignore file */

export const middlewareStackEnv = "@matechs/http-client/middlewareStackURI";
export const httpEnv = "@matechs/http-client/httpURI";
export const httpHeadersEnv = "@matechs/http-client/httpHeadersURI";
export const httpDeserializerEnv = "@matechs/http-client/httpDeserializerURI";

export const Method = {
  GET: null,
  POST: null,
  PUT: null,
  DELETE: null,
  PATCH: null
};
export type Method = keyof typeof Method;

type Indexed<A extends string, B extends string> = {
  [a in A]: { [b in B]: any };
};
type MakeIndexed<A extends string, B extends string, T extends Indexed<A, B>> = T;

export type RequestType = "JSON" | "DATA" | "FORM" | "BINARY";

export type RequestBodyTypes = MakeIndexed<
  RequestType,
  Method,
  {
    JSON: {
      GET: unknown;
      POST: unknown;
      PUT: unknown;
      DELETE: unknown;
      PATCH: unknown;
    };
    DATA: {
      GET: ParsedQuery<string | number | boolean>;
      POST: ParsedQuery<string | number | boolean>;
      PUT: ParsedQuery<string | number | boolean>;
      DELETE: ParsedQuery<string | number | boolean>;
      PATCH: ParsedQuery<string | number | boolean>;
    };
    FORM: {
      GET: FormData;
      POST: FormData;
      PUT: FormData;
      DELETE: FormData;
      PATCH: FormData;
    };
    BINARY: {
      GET: Buffer;
      POST: Buffer;
      PUT: Buffer;
      DELETE: Buffer;
      PATCH: Buffer;
    };
  }
>;

export type ResponseType = "JSON" | "TEXT" | "BINARY";
export type ResponseTypes = MakeIndexed<
  ResponseType,
  Method,
  {
    JSON: {
      GET: unknown;
      POST: unknown;
      PUT: unknown;
      DELETE: unknown;
      PATCH: unknown;
    };
    TEXT: {
      GET: string;
      POST: string;
      PUT: string;
      DELETE: string;
      PATCH: string;
    };
    BINARY: {
      GET: Buffer;
      POST: Buffer;
      PUT: Buffer;
      DELETE: Buffer;
      PATCH: Buffer;
    };
  }
>;

export interface DataInput {
  [k: string]: unknown;
}

export type Headers = Record<string, string>;

export interface Response<Body> {
  body: O.Option<Body>;
  headers: Headers;
  status: number;
}

export const HttpErrorReason = {
  Request: "HttpErrorRequest",
  Response: "HttpErrorResponse"
} as const;

export type HttpErrorReason = typeof HttpErrorReason;

export interface HttpResponseError<ErrorBody> {
  _tag: HttpErrorReason["Response"];
  response: Response<ErrorBody>;
}

export function isHttpResponseError(u: unknown): u is HttpResponseError<unknown> {
  return typeof u === "object" && u !== null && u["_tag"] === "HttpResponseError";
}

export interface HttpRequestError {
  _tag: HttpErrorReason["Request"];
  error: Error;
}

export function isHttpRequestError(u: unknown): u is HttpRequestError {
  return typeof u === "object" && u !== null && u["_tag"] === "HttpRequestError";
}

export function isHttpError(u: unknown): u is HttpError<unknown> {
  return isHttpRequestError(u) || isHttpResponseError(u);
}

export type HttpError<ErrorBody> = HttpRequestError | HttpResponseError<ErrorBody>;

export function foldHttpError<A, B, ErrorBody>(
  onError: (e: Error) => A,
  onResponseError: (e: Response<ErrorBody>) => B
): (err: HttpError<ErrorBody>) => A | B {
  return (err) => {
    switch (err._tag) {
      case "HttpErrorRequest":
        return onError(err.error);
      case "HttpErrorResponse":
        return onResponseError(err.response);
    }
  };
}

export interface HttpHeaders {
  [httpHeadersEnv]: Record<string, string>;
}

export interface HttpOps {
  request<M extends Method, Req extends RequestType, Resp extends ResponseType>(
    method: M,
    url: string,
    requestType: Req,
    responseType: Resp,
    headers: Record<string, string>,
    body: RequestBodyTypes[Req][M]
  ): T.AsyncE<HttpError<string>, Response<ResponseTypes[Resp][M]>>;
}

export interface Http {
  [httpEnv]: HttpOps;
}

function hasHeaders(r: object): r is HttpHeaders {
  return typeof r[httpHeadersEnv] !== "undefined";
}

export type RequestF = <R, M extends Method, Req extends RequestType, Resp extends ResponseType>(
  method: M,
  url: string,
  requestType: Req,
  responseType: Resp,
  body?: RequestBodyTypes[Req][M]
) => T.AsyncRE<RequestEnv & R, HttpError<string>, Response<ResponseTypes[Resp][M]>>;

export type RequestMiddleware = (request: RequestF) => RequestF;

export interface MiddlewareStack {
  [middlewareStackEnv]?: {
    stack: RequestMiddleware[];
  };
}

export const middlewareStack: (stack?: RequestMiddleware[]) => MiddlewareStack = (stack = []) => ({
  [middlewareStackEnv]: {
    stack
  }
});

export type HttpEnv = Http & MiddlewareStack;
export type RequestEnv = HttpEnv;

function foldMiddlewareStack(
  { [middlewareStackEnv]: env }: MiddlewareStack,
  request: RequestF
): RequestF {
  if (env && env.stack.length > 0) {
    let r = request;

    for (const middleware of env.stack) {
      r = middleware(r);
    }

    return r;
  }

  return request;
}

export function requestInner<
  R,
  M extends Method,
  Req extends RequestType,
  Resp extends ResponseType
>(
  method: M,
  url: string,
  requestType: Req,
  responseType: Resp,
  body: RequestBodyTypes[Req][M]
): T.AsyncRE<RequestEnv & R, HttpError<string>, Response<ResponseTypes[Resp][M]>> {
  return T.accessM((r: Http & R) =>
    r[httpEnv].request<M, Req, Resp>(
      method,
      url,
      requestType,
      responseType,
      hasHeaders(r) ? r[httpHeadersEnv] : {},
      body
    )
  );
}

export function request<R, Req extends RequestType, Resp extends ResponseType>(
  method: "GET",
  requestType: Req,
  responseType: Resp
): (
  url: string,
  body?: RequestBodyTypes[Req]["GET"]
) => T.AsyncRE<RequestEnv & R, HttpError<string>, Response<ResponseTypes[Resp]["GET"]>>;
export function request<R, Req extends RequestType, Resp extends ResponseType>(
  method: "DELETE",
  requestType: Req,
  responseType: Resp
): (
  url: string,
  body?: RequestBodyTypes[Req]["DELETE"]
) => T.AsyncRE<RequestEnv & R, HttpError<string>, Response<ResponseTypes[Resp]["DELETE"]>>;
export function request<R, M extends Method, Req extends RequestType, Resp extends ResponseType>(
  method: M,
  requestType: Req,
  responseType: Resp
): (
  url: string,
  body: RequestBodyTypes[Req][M]
) => T.AsyncRE<RequestEnv & R, HttpError<string>, Response<ResponseTypes[Resp][M]>>;
export function request<R, M extends Method, Req extends RequestType, Resp extends ResponseType>(
  method: M,
  requestType: Req,
  responseType: Resp
): (
  url: string,
  body: RequestBodyTypes[Req][M]
) => T.AsyncRE<RequestEnv & R, HttpError<string>, Response<ResponseTypes[Resp][M]>> {
  return (url, body) =>
    T.accessM((r: MiddlewareStack) =>
      foldMiddlewareStack(r, requestInner)<R, M, Req, Resp>(
        method,
        url,
        requestType,
        responseType,
        body
      )
    );
}

export const get = request("GET", "JSON", "JSON");

export const post = request("POST", "JSON", "JSON");

export const postReturnText = request("POST", "JSON", "TEXT");

export const postData = request("POST", "DATA", "JSON");

export const postBinaryGetBinary = request("POST", "BINARY", "BINARY");

export const patch = request("PATCH", "JSON", "JSON");

export const patchData = request("PATCH", "DATA", "JSON");

export const patchBinaryGetBinary = request("PATCH", "BINARY", "BINARY");

export const put = request("PUT", "JSON", "JSON");

export const putData = request("PUT", "DATA", "JSON");

export const postForm = request("POST", "FORM", "JSON");

export const putForm = request("PUT", "FORM", "JSON");

export const patchForm = request("PATCH", "FORM", "JSON");

export const putBinaryGetBinary = request("PUT", "BINARY", "BINARY");

export const del = request("DELETE", "JSON", "JSON");

export const delForm = request("DELETE", "FORM", "JSON");

export const delData = request("DELETE", "DATA", "JSON");

export const delBinaryGetBinary = request("DELETE", "BINARY", "BINARY");

export function withHeaders(
  headers: Record<string, string>,
  replace = false
): <S, R, E, A>(eff: T.Effect<S, R, E, A>) => T.Effect<S, R, E, A> {
  return <S, R, E, A>(eff: T.Effect<S, R, E, A>) =>
    replace
      ? T.accessM((r: R) => T.provide({ ...r, [httpHeadersEnv]: headers })(eff))
      : T.accessM((r: R) =>
          T.provide({ ...r, [httpHeadersEnv]: { ...r[httpHeadersEnv], ...headers } })(eff)
        );
}

export function withPathHeaders(
  headers: Record<string, string>,
  path: F.Predicate<string>,
  replace = false
): RequestMiddleware {
  return (req) => (m, u, reqT, respT, b) =>
    path(u) ? withHeaders(headers, replace)(req(m, u, reqT, respT, b)) : req(m, u, reqT, respT, b);
}

export function foldRequestType<A, B, C, D>(
  requestType: RequestType,
  onJson: () => A,
  onData: () => B,
  onForm: () => C,
  onBinary: () => D
): A | B | C | D {
  switch (requestType) {
    case "JSON":
      return onJson();
    case "DATA":
      return onData();
    case "FORM":
      return onForm();
    case "BINARY":
      return onBinary();
  }
}

export function foldResponseType<A, B, C>(
  responseType: ResponseType,
  onJson: () => A,
  onText: () => B,
  onBinary: () => C
): A | B | C {
  switch (responseType) {
    case "JSON":
      return onJson();
    case "TEXT":
      return onText();
    case "BINARY":
      return onBinary();
  }
}

export function getMethodAsString(method: Method) {
  switch (method) {
    case "GET":
      return "GET";
    case "POST":
      return "POST";
    case "PUT":
      return "PUT";
    case "PATCH":
      return "PATCH";
    case "DELETE":
      return "DELETE";
  }
}
