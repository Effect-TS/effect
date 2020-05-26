import * as C from "node-libcurl"
import * as F from "@matechs/core/Function"
import * as H from "@matechs/http-client"
export declare const libcurl: (_?: {
  caPath?: string
  requestTransformer?: F.Endomorphism<C.Curl>
}) => H.Http
