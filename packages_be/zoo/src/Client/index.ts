import * as ZC from "node-zookeeper-client"
import { CreateMode } from "node-zookeeper-client"

import * as T from "@matechs/core/Effect"
import * as E from "@matechs/core/Either"
import * as F from "@matechs/core/Function"
import { pipe } from "@matechs/core/Function"
import * as M from "@matechs/core/Managed"
import * as O from "@matechs/core/Option"
import * as Service from "@matechs/core/Service"

// work in progress
/* istanbul ignore file */

export const clientConfigURI = "@matechs/zoo/clientConfigURI"

export interface ClientConfig {
  [clientConfigURI]: {
    connectionString: string
    options?: Partial<ZC.Option>
  }
}

export interface ZooError {
  _tag:
    | "ConnectError"
    | "MkdirpError"
    | "CreateError"
    | "GetChildrenError"
    | "WaitDeleteError"
    | "ConnectionDroppedError"
}

export const provideClientConfig = (_: ClientConfig[typeof clientConfigURI]) =>
  T.provide<ClientConfig>({
    [clientConfigURI]: _
  })

export interface ConnectError extends ZooError {
  _tag: "ConnectError"
  message: string
}

export interface MkdirpError extends ZooError {
  _tag: "MkdirpError"
  message: string
}

export interface CreateError extends ZooError {
  _tag: "CreateError"
  message: string
}

export interface GetChildrenError extends ZooError {
  _tag: "GetChildrenError"
  message: string
}

export interface WaitDeleteError extends ZooError {
  _tag: "WaitDeleteError"
  message: string
}

export interface ConnectionDroppedError extends ZooError {
  _tag: "ConnectionDroppedError"
  message: string
}

export const error = <E extends ZooError>(e: E): E => e

interface Mkdirp {
  _tag: "Mkdirp"
  path: string
}

interface Createp {
  _tag: "Createp"
  path: string
}

interface NodeId {
  _tag: "NodeId"
  id: string
}

interface Deleted {
  _tag: "Deleted"
  path: string
}

interface Children {
  _tag: "Children"
  root: string
  paths: string[]
}

type Out = Mkdirp | Createp | NodeId | Children | Deleted

const out = <A extends Out>(a: A): A => a

export interface Client {
  connect(): T.AsyncE<ConnectError, Client>
  listen(f: F.FunctionN<[ZC.State], void>): F.Lazy<void>
  state(): T.AsyncE<never, O.Option<ZC.State>>
  mkdirp(path: string): T.AsyncE<MkdirpError, Mkdirp>
  dispose(): T.AsyncE<never, void>
  currentId(path: string): T.AsyncE<never, NodeId>
  create(
    path: string,
    mode: keyof typeof CreateMode,
    data?: Buffer | undefined
  ): T.AsyncE<CreateError, Createp>
  getChildren(root: string): T.AsyncE<GetChildrenError, Children>
  waitDelete(path: string): T.AsyncE<WaitDeleteError, Deleted>
}

export class ClientImpl implements Client {
  private _state: O.Option<ZC.State> = O.none
  private readonly listeners: Map<number, F.FunctionN<[ZC.State], void>> = new Map()
  private opc = 0

  constructor(readonly client: ZC.Client) {
    client.on("state", (state) => {
      this.dispatch(state)
    })

    this.connect = this.connect.bind(this)
    this.dispatch = this.dispatch.bind(this)
    this.listen = this.listen.bind(this)
    this.state = this.state.bind(this)
    this.dispose = this.dispose.bind(this)
    this.mkdirp = this.mkdirp.bind(this)
    this.create = this.create.bind(this)
    this.currentId = this.currentId.bind(this)
    this.getChildren = this.getChildren.bind(this)
    this.waitDelete = this.waitDelete.bind(this)
  }

  state() {
    return T.pure(this._state)
  }

  private dispatch(state: ZC.State) {
    this._state = O.some(state)

    this.listeners.forEach((l) => {
      l(state)
    })
  }

  listen(f: F.FunctionN<[ZC.State], void>): F.Lazy<void> {
    const op = this.opc

    this.opc = this.opc + 1

    this.listeners.set(op, f)

    return () => {
      this.listeners.delete(op)
    }
  }

  connect() {
    return T.async<ConnectError, Client>((res) => {
      this.client.connect()

      const l = this.listen((s) => {
        if (
          [
            ZC.State.AUTH_FAILED.code,
            ZC.State.CONNECTED_READ_ONLY.code,
            ZC.State.DISCONNECTED.code
          ].indexOf(s.code) !== -1
        ) {
          l()
          res(
            E.left(
              error({
                _tag: "ConnectError",
                message: ZC.State.name
              })
            )
          )
        }
        if (s.code === ZC.State.SYNC_CONNECTED.code) {
          l()
          res(E.right(this))
        }
      })

      return (cb) => {
        l()
        this.dispose()
        cb()
      }
    })
  }

  dispose() {
    return T.sync(() => {
      this.client.close()
    })
  }

  mkdirp(path: string) {
    return T.async<MkdirpError, Mkdirp>((res) => {
      this.client.mkdirp(path, (err, p) => {
        if (err) {
          if ("code" in err) {
            res(
              E.left(
                error({
                  _tag: "MkdirpError",
                  message: err.toString()
                })
              )
            )
          } else {
            res(
              E.left(
                error({
                  _tag: "MkdirpError",
                  message: err.message
                })
              )
            )
          }
        } else {
          res(E.right(out({ path: p, _tag: "Mkdirp" })))
        }
      })

      return (cb) => {
        cb()
      }
    })
  }

  // tslint:disable-next-line: prefer-function-over-method
  currentId(path: string) {
    return T.sync(
      (): NodeId => {
        const p = path.split("/")
        return out({ id: p[p.length - 1], _tag: "NodeId" })
      }
    )
  }

  create(path: string, mode: keyof typeof CreateMode, data?: Buffer) {
    return T.async<CreateError, Createp>((res) => {
      const cb = (err: Error | ZC.Exception, p: string) => {
        if (err) {
          if ("code" in err) {
            res(
              E.left(
                error({
                  _tag: "CreateError",
                  message: err.toString()
                })
              )
            )
          } else {
            res(
              E.left(
                error({
                  _tag: "CreateError",
                  message: err.message
                })
              )
            )
          }
        } else {
          res(E.right(out({ path: p, _tag: "Createp" })))
        }
      }

      if (data) {
        this.client.create(path, data, CreateMode[mode], cb)
      } else {
        this.client.create(path, CreateMode[mode], cb)
      }

      return (cb) => {
        cb()
      }
    })
  }

  getChildren(root: string) {
    return T.async<GetChildrenError, Children>((res) => {
      this.client.getChildren(root, (err, paths) => {
        if (err) {
          if ("code" in err) {
            res(
              E.left(
                error({
                  _tag: "GetChildrenError",
                  message: err.toString()
                })
              )
            )
          } else {
            res(
              E.left(
                error({
                  _tag: "GetChildrenError",
                  message: err.message
                })
              )
            )
          }
        } else {
          res(E.right(out({ paths: paths.sort(), _tag: "Children", root })))
        }
      })

      return (cb) => {
        cb()
      }
    })
  }

  waitDelete(path: string) {
    return T.async<WaitDeleteError, Deleted>((res) => {
      this.client.exists(
        path,
        (event) => {
          if (event.type === ZC.Event.NODE_DELETED) {
            res(E.right(out({ _tag: "Deleted", path })))
          }
        },
        (err) => {
          if (err) {
            if ("code" in err) {
              res(E.left(error({ _tag: "WaitDeleteError", message: "" })))
            } else {
              res(
                E.left(
                  error({
                    _tag: "WaitDeleteError",
                    message: err.message
                  })
                )
              )
            }
          }
        }
      )

      return (cb) => {
        cb()
      }
    })
  }
}

export const ClientFactoryURI = "@matechs/zoo/clientFactoryURI"

const ClientFactory_ = Service.define({
  [ClientFactoryURI]: {
    createClient: Service.cn<T.Async<Client>>()
  }
})

export interface ClientFactory extends Service.TypeOf<typeof ClientFactory_> {}

export const ClientFactory = Service.opaque<ClientFactory>()(ClientFactory_)

export const provideClientFactory = Service.implement(ClientFactory)({
  [ClientFactoryURI]: {
    createClient: T.access(
      (_: ClientConfig) =>
        new ClientImpl(
          ZC.createClient(
            _[clientConfigURI].connectionString,
            _[clientConfigURI].options
          )
        )
    )
  }
})

const { createClient } = Service.access(ClientFactory)[ClientFactoryURI]

export const managedClient = M.bracket(
  pipe(
    createClient,
    T.chain((c) => c.connect())
  ),
  (client) => client.dispose()
)
