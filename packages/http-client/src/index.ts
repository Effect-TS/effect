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

export enum RequestType {
  JSON,
  DATA
}

export interface DataInput {
  [k: string]: unknown;
}

export type Headers = Record<string, string>;

export interface Response<Body> {
  body: Option<Body>;
  headers: Headers;
  status: number;
}

export interface HttpResponseError<ErrorBody> {
  _tag: HttpErrorReason.Response;
  response: Response<ErrorBody>;
}

export interface HttpRequestError {
  _tag: HttpErrorReason.Request;
  error: Error;
}

export interface HttpDeserializer {
  [httpDeserializerEnv]: {
    response: <A>(a: string) => A | undefined;
    errorResponse: <E>(error: string) => E | undefined;
  };
}

export enum HttpErrorReason {
  Request,
  Response
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
      case HttpErrorReason.Request:
        return onError(err.error);
      case HttpErrorReason.Response:
        return onResponseError(err.response);
    }
  };
}

export interface HttpHeaders {
  [httpHeadersEnv]: Record<string, string>;
}

export interface Http {
  [httpEnv]: {
    request: <I, E, O>(
      method: Method,
      url: string,
      headers: Record<string, string>,
      body?: I,
      requestType?: RequestType
    ) => T.Effect<HttpDeserializer, HttpError<E>, Response<O>>;
  };
}

function hasHeaders(r: T.Env): r is HttpHeaders {
  return typeof r[httpHeadersEnv] !== "undefined";
}

export type RequestF = <R, I, E, O>(
  method: Method,
  url: string,
  body?: I,
  requestType?: RequestType
) => T.Effect<RequestEnv & R, HttpError<E>, Response<O>>;

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

export type RequestEnv = Http & HttpDeserializer & MiddlewareStack;

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

export function requestInner<R, I, E, O>(
  method: Method,
  url: string,
  body?: I,
  requestType?: RequestType
): T.Effect<RequestEnv & R, HttpError<E>, Response<O>> {
  return T.accessM((r: Http & R) =>
    r[httpEnv].request(
      method,
      url,
      hasHeaders(r) ? r[httpHeadersEnv] : {},
      body,
      requestType
    )
  );
}

export function request<R, I, E, O>(
  method: Method,
  url: string,
  body?: I,
  requestType?: RequestType
): T.Effect<RequestEnv & R, HttpError<E>, Response<O>> {
  return T.accessM((r: MiddlewareStack) =>
    foldMiddlewareStack(r, requestInner)<R, I, E, O>(
      method,
      url,
      body,
      requestType
    )
  );
}

export function get<E, O>(
  url: string
): T.Effect<RequestEnv, HttpError<E>, Response<O>> {
  return request(Method.GET, url);
}

export function post<I, E, O>(
  url: string,
  body?: I
): T.Effect<RequestEnv, HttpError<E>, Response<O>> {
  return request(Method.POST, url, body);
}

export function postData<I extends DataInput, E, O>(
  url: string,
  body?: I
): T.Effect<RequestEnv, HttpError<E>, Response<O>> {
  return request(Method.POST, url, body, RequestType.DATA);
}

export function patch<I, E, O>(
  url: string,
  body?: I
): T.Effect<RequestEnv, HttpError<E>, Response<O>> {
  return request(Method.PATCH, url, body);
}

export function patchData<I extends DataInput, E, O>(
  url: string,
  body?: I
): T.Effect<RequestEnv, HttpError<E>, Response<O>> {
  return request(Method.PATCH, url, body, RequestType.DATA);
}

export function put<I, E, O>(
  url: string,
  body?: I
): T.Effect<RequestEnv, HttpError<E>, Response<O>> {
  return request(Method.PUT, url, body);
}

export function putData<I extends DataInput, E, O>(
  url: string,
  body?: I
): T.Effect<RequestEnv, HttpError<E>, Response<O>> {
  return request(Method.PUT, url, body, RequestType.DATA);
}

export function del<I, E, O>(
  url: string,
  body?: I
): T.Effect<RequestEnv, HttpError<E>, Response<O>> {
  return request(Method.DELETE, url, body);
}

export function delData<I extends DataInput, E, O>(
  url: string,
  body?: I
): T.Effect<RequestEnv, HttpError<E>, Response<O>> {
  return request(Method.DELETE, url, body, RequestType.DATA);
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
  return req => (m, u, b, r) =>
    path(u) ? withHeaders(headers, replace)(req(m, u, b, r)) : req(m, u, b, r);
}

function tryJson<A>(a: string): A | undefined {
  try {
    return JSON.parse(a);
  } catch (_) {
    return undefined;
  }
}

export const jsonDeserializer: HttpDeserializer = {
  [httpDeserializerEnv]: {
    errorResponse: tryJson,
    response: tryJson
  }
};
