import { effect as T } from "@matechs/effect";
import { Predicate } from "fp-ts/lib/function";
import { Option } from "fp-ts/lib/Option";

/* tested in the implementation packages */
/* istanbul ignore file */

export const middlewareStackEnv: unique symbol = Symbol();
export const httpEnv: unique symbol = Symbol();
export const httpHeadersEnv: unique symbol = Symbol();
export const httpDeserializerEnv: unique symbol = Symbol();

export enum Method {
  GET,
  POST,
  PUT,
  DELETE,
  PATCH
}

export type RequestType = "JSON" | "DATA" | "FORM" | "BINARY";
export type ResponseType = "JSON" | "TEXT" | "BINARY";

export interface DataInput {
  [k: string]: unknown;
}

export type Headers = Record<string, string>;

export interface Response<Body> {
  body: Option<Body>;
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

export function isHttpResponseError(
  u: unknown
): u is HttpResponseError<unknown> {
  return (
    typeof u === "object" && u !== null && u["_tag"] === "HttpResponseError"
  );
}

export interface HttpRequestError {
  _tag: HttpErrorReason["Request"];
  error: Error;
}

export function isHttpRequestError(u: unknown): u is HttpRequestError {
  return (
    typeof u === "object" && u !== null && u["_tag"] === "HttpRequestError"
  );
}

export function isHttpError(u: unknown): u is HttpError<unknown> {
  return isHttpRequestError(u) || isHttpResponseError(u);
}

export type HttpError<ErrorBody> =
  | HttpRequestError
  | HttpResponseError<ErrorBody>;

export function foldHttpError<A, B, ErrorBody>(
  onError: (e: Error) => A,
  onResponseError: (e: Response<ErrorBody>) => B
): (err: HttpError<ErrorBody>) => A | B {
  return err => {
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

export interface Http {
  [httpEnv]: {
    request<O>(
      method: Method,
      url: string,
      headers: Record<string, string>,
      requestType: RequestType,
      responseType: "BINARY",
      body: unknown
    ): T.Effect<T.NoEnv, HttpError<string>, Response<Buffer>>;
    request<O>(
      method: Method,
      url: string,
      headers: Record<string, string>,
      requestType: RequestType,
      responseType: "TEXT",
      body: unknown
    ): T.Effect<T.NoEnv, HttpError<string>, Response<string>>;
    request<O>(
      method: Method,
      url: string,
      headers: Record<string, string>,
      requestType: RequestType,
      responseType: "JSON",
      body: unknown
    ): T.Effect<T.NoEnv, HttpError<string>, Response<unknown>>;
    request<O>(
      method: Method,
      url: string,
      headers: Record<string, string>,
      requestType: RequestType,
      responseType: ResponseType,
      body: unknown
    ): T.Effect<T.NoEnv, HttpError<string>, Response<O>>;
  };
}

function hasHeaders(r: object): r is HttpHeaders {
  return typeof r[httpHeadersEnv] !== "undefined";
}

export type RequestF = <R, O>(
  method: Method,
  url: string,
  requestType: RequestType,
  responseType: ResponseType,
  body: unknown
) => T.Effect<RequestEnv & R, HttpError<string>, Response<O>>;

export type RequestMiddleware = (request: RequestF) => RequestF;

export interface MiddlewareStack {
  [middlewareStackEnv]?: {
    stack: RequestMiddleware[];
  };
}

export const middlewareStack: (
  stack?: RequestMiddleware[]
) => MiddlewareStack = (stack = []) => ({
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

export function requestInner<R, I, O>(
  method: Method,
  url: string,
  requestType: RequestType,
  responseType: ResponseType,
  body?: I
): T.Effect<RequestEnv & R, HttpError<string>, Response<O>> {
  return T.accessM((r: Http & R) =>
    r[httpEnv].request(
      method,
      url,
      hasHeaders(r) ? r[httpHeadersEnv] : {},
      requestType,
      responseType,
      body
    )
  );
}

export function request<R, O>(
  method: Method,
  url: string,
  requestType: RequestType,
  responseType: ResponseType,
  body?: unknown
): T.Effect<RequestEnv & R, HttpError<string>, Response<O>> {
  return T.accessM((r: MiddlewareStack) =>
    foldMiddlewareStack(r, requestInner)<R, O>(
      method,
      url,
      requestType,
      responseType,
      body
    )
  );
}

export function get<O>(
  url: string
): T.Effect<RequestEnv, HttpError<string>, Response<O>> {
  return request(Method.GET, url, "JSON", "JSON");
}

export function post<I, O>(
  url: string,
  body?: I
): T.Effect<RequestEnv, HttpError<string>, Response<O>> {
  return request(Method.POST, url, "JSON", "JSON", body);
}

export function postReturnText<I, O>(
  url: string,
  body?: I
): T.Effect<RequestEnv, HttpError<string>, Response<O>> {
  return request(Method.POST, url, "JSON", "TEXT", body);
}

export function postData<I, O>(
  url: string,
  body?: I
): T.Effect<RequestEnv, HttpError<string>, Response<O>> {
  return request(Method.POST, url, "DATA", "JSON", body);
}

export function postBinaryGetBinary(
  url: string,
  body?: Buffer
): T.Effect<RequestEnv, HttpError<string>, Response<Buffer>> {
  return request(Method.POST, url, "BINARY", "BINARY", body);
}

export function patch<I, O>(
  url: string,
  body?: I
): T.Effect<RequestEnv, HttpError<string>, Response<O>> {
  return request(Method.PATCH, url, "JSON", "JSON", body);
}

export function patchData<I extends DataInput, O>(
  url: string,
  body?: I
): T.Effect<RequestEnv, HttpError<string>, Response<O>> {
  return request(Method.PATCH, url, "DATA", "JSON", body);
}

export function patchBinaryGetBinary<O>(
  url: string,
  body?: Buffer
): T.Effect<RequestEnv, HttpError<string>, Response<Buffer>> {
  return request(Method.PATCH, url, "BINARY", "BINARY", body);
}

export function put<I, E, O>(
  url: string,
  body?: I
): T.Effect<RequestEnv, HttpError<string>, Response<O>> {
  return request(Method.PUT, url, "JSON", "JSON", body);
}

export function putData<I extends DataInput, O>(
  url: string,
  body?: I
): T.Effect<RequestEnv, HttpError<string>, Response<O>> {
  return request(Method.PUT, url, "DATA", "JSON", body);
}

export function del<I, E, O>(
  url: string,
  body?: I
): T.Effect<RequestEnv, HttpError<string>, Response<O>> {
  return request(Method.DELETE, url, "JSON", "JSON", body);
}

export function postForm<E, O>(
  url: string,
  body: FormData
): T.Effect<RequestEnv, HttpError<string>, Response<O>> {
  return request(Method.POST, url, "FORM", "JSON", body);
}

export function putForm<E, O>(
  url: string,
  body: FormData
): T.Effect<RequestEnv, HttpError<string>, Response<O>> {
  return request(Method.PUT, url, "FORM", "JSON", body);
}

export function patchForm<E, O>(
  url: string,
  body: FormData
): T.Effect<RequestEnv, HttpError<string>, Response<O>> {
  return request(Method.PATCH, url, "FORM", "JSON", body);
}

export function putBinaryGetBinary(
  url: string,
  body: Buffer
): T.Effect<RequestEnv, HttpError<string>, Response<Buffer>> {
  return request(Method.PUT, url, "BINARY", "BINARY", body);
}

export function delForm<E, O>(
  url: string,
  body: FormData
): T.Effect<RequestEnv, HttpError<string>, Response<O>> {
  return request(Method.DELETE, url, "FORM", "JSON", body);
}

export function delData<I extends DataInput, O>(
  url: string,
  body?: I
): T.Effect<RequestEnv, HttpError<string>, Response<O>> {
  return request(Method.DELETE, url, "DATA", "JSON", body);
}

export function delBinaryGetBinary(
  url: string,
  body?: Buffer
): T.Effect<RequestEnv, HttpError<string>, Response<Buffer>> {
  return request(Method.DELETE, url, "BINARY", "BINARY", body);
}

export function withHeaders(
  headers: Record<string, string>,
  replace = false
): <R, E, A>(eff: T.Effect<R, E, A>) => T.Effect<R, E, A> {
  return <R, E, A>(eff: T.Effect<R, E, A>) =>
    replace
      ? T.provideR<R, HttpHeaders & R>(r => ({
          ...r,
          [httpHeadersEnv]: headers
        }))(eff)
      : T.provideR<R, HttpHeaders & R>(r => ({
          ...r,
          [httpHeadersEnv]: { ...r[httpHeadersEnv], ...headers }
        }))(eff);
}

export function withPathHeaders(
  headers: Record<string, string>,
  path: Predicate<string>,
  replace = false
): RequestMiddleware {
  return req => (m, u, reqT, respT, b) =>
    path(u)
      ? withHeaders(headers, replace)(req(m, u, reqT, respT, b))
      : req(m, u, reqT, respT, b);
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
    case Method.GET:
      return "GET";
    case Method.POST:
      return "POST";
    case Method.PUT:
      return "PUT";
    case Method.PATCH:
      return "PATCH";
    case Method.DELETE:
      return "DELETE";
  }
}
