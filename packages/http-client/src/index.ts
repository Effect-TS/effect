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

export type RequestType = "JSON" | "DATA" | "FORM";

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
    request: <E, O>(
      method: Method,
      url: string,
      headers: Record<string, string>,
      requestType: RequestType,
      body?: unknown
    ) => T.Effect<HttpDeserializer, HttpError<E>, Response<O>>;
  };
}

function hasHeaders(r: object): r is HttpHeaders {
  return typeof r[httpHeadersEnv] !== "undefined";
}

export type RequestF = <R, E, O>(
  method: Method,
  url: string,
  requestType: RequestType,
  body?: unknown
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

export type HttpEnv = Http & MiddlewareStack;
export type RequestEnv = HttpEnv & HttpDeserializer;

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
  requestType: RequestType,
  body?: I
): T.Effect<RequestEnv & R, HttpError<E>, Response<O>> {
  return T.accessM((r: Http & R) =>
    r[httpEnv].request(
      method,
      url,
      hasHeaders(r) ? r[httpHeadersEnv] : {},
      requestType,
      body
    )
  );
}

export function request<R, E, O>(
  method: Method,
  url: string,
  requestType: RequestType,
  body?: unknown
): T.Effect<RequestEnv & R, HttpError<E>, Response<O>> {
  return T.accessM((r: MiddlewareStack) =>
    foldMiddlewareStack(r, requestInner)<R, E, O>(
      method,
      url,
      requestType,
      body
    )
  );
}

export function get<E, O>(
  url: string
): T.Effect<RequestEnv, HttpError<E>, Response<O>> {
  return request(Method.GET, url, "JSON");
}

export function post<I, E, O>(
  url: string,
  body?: I
): T.Effect<RequestEnv, HttpError<E>, Response<O>> {
  return request(Method.POST, url, "JSON", body);
}

export function postData<I extends DataInput, E, O>(
  url: string,
  body?: I
): T.Effect<RequestEnv, HttpError<E>, Response<O>> {
  return request(Method.POST, url, "DATA", body);
}

export function patch<I, E, O>(
  url: string,
  body?: I
): T.Effect<RequestEnv, HttpError<E>, Response<O>> {
  return request(Method.PATCH, url, "JSON", body);
}

export function patchData<I extends DataInput, E, O>(
  url: string,
  body?: I
): T.Effect<RequestEnv, HttpError<E>, Response<O>> {
  return request(Method.PATCH, url, "DATA", body);
}

export function put<I, E, O>(
  url: string,
  body?: I
): T.Effect<RequestEnv, HttpError<E>, Response<O>> {
  return request(Method.PUT, url, "JSON", body);
}

export function putData<I extends DataInput, E, O>(
  url: string,
  body?: I
): T.Effect<RequestEnv, HttpError<E>, Response<O>> {
  return request(Method.PUT, url, "DATA", body);
}

export function del<I, E, O>(
  url: string,
  body?: I
): T.Effect<RequestEnv, HttpError<E>, Response<O>> {
  return request(Method.DELETE, url, "JSON", body);
}

export function postForm<E, O>(
  url: string,
  body: FormData
): T.Effect<RequestEnv, HttpError<E>, Response<O>> {
  return request(Method.POST, url, "FORM", body);
}

export function putForm<E, O>(
  url: string,
  body: FormData
): T.Effect<RequestEnv, HttpError<E>, Response<O>> {
  return request(Method.PUT, url, "FORM", body);
}

export function patchForm<E, O>(
  url: string,
  body: FormData
): T.Effect<RequestEnv, HttpError<E>, Response<O>> {
  return request(Method.PATCH, url, "FORM", body);
}

export function delForm<E, O>(
  url: string,
  body: FormData
): T.Effect<RequestEnv, HttpError<E>, Response<O>> {
  return request(Method.DELETE, url, "FORM", body);
}

export function delData<I extends DataInput, E, O>(
  url: string,
  body?: I
): T.Effect<RequestEnv, HttpError<E>, Response<O>> {
  return request(Method.DELETE, url, "DATA", body);
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

export const textDeserializer: HttpDeserializer = {
  [httpDeserializerEnv]: {
    errorResponse: <A>(i: string | undefined) => i as A | undefined,
    response: <A>(i: string | undefined) => i as A | undefined
  }
};

export function text<R, E, O>(
  req: T.Effect<R & RequestEnv, HttpError<E>, Response<O>>
): T.Effect<R & HttpEnv, HttpError<string>, Response<string>> {
  return T.provideR((r: R & HttpEnv) => ({ ...r, ...textDeserializer }))(
    req
  ) as any;
}

export function json<R, E, O>(
  req: T.Effect<R & RequestEnv, HttpError<E>, Response<O>>
): T.Effect<R & HttpEnv, HttpError<E>, Response<O>> {
  return T.provideR((r: R & HttpEnv) => ({ ...r, ...jsonDeserializer }))(req);
}

export function foldRequestType<A, B, C>(
  requestType: RequestType,
  onJson: () => A,
  onData: () => B,
  onForm: () => C
): A | B | C {
  switch (requestType) {
    case "JSON":
      return onJson();
    case "DATA":
      return onData();
    case "FORM":
      return onForm();
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
