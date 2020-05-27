import Long from "long";
import { eventStoreTcpConnection, accessConfig } from "./client";
import * as T from "@matechs/core/Effect";
import * as E from "@matechs/core/Either";
import * as M from "@matechs/core/Managed";
import { pipe } from "@matechs/core/Pipe";
export const esMetaURI = "@matechs/cqrs-es/esMetaURI";
export const readEvents = (readId) => (streamId) => (decode) => (process) => (store) => (provider) => M.use(eventStoreTcpConnection, (connection) => pipe(T.sequenceT(accessConfig, store.get(readId, streamId), T.accessEnvironment()), T.chain(([config, from, r]) => T.async((done) => {
    const subscription = connection.subscribeToStreamFrom(streamId, Long.fromString(BigInt(from).toString(10), false, 10), true, (_, event) => {
        if (event.event && event.event.data) {
            return T.runToPromise(pipe(decode(JSON.parse(event.event.data.toString("utf-8"))), T.mapError((e) => ({
                type: "decode",
                error: e
            })), T.chain((x) => pipe(Object.assign(Object.assign({}, x), { [esMetaURI]: { raw: event } }), process, T.mapError((e) => ({
                type: "process",
                error: e
            })))), T.chainTap((_) => pipe(store.set(readId, event.originalStreamId, BigInt(event.originalEventNumber.toString(10))), T.mapError((e) => ({
                type: "offset",
                error: e
            })))), provider, T.mapError((x) => "type" in x ? x : { type: "provider", error: x }), T.provide(r)));
        }
        else {
            return Promise.resolve();
        }
    }, () => {
        // live
    }, (_, _reason, error) => {
        if (error) {
            done("type" in error
                ? E.left(error)
                : E.left({
                    type: "EventStoreError",
                    message: error["message"]
                }));
        }
        else {
            done(E.left({
                type: "EventStoreError",
                message: _reason
            }));
        }
    }, config.settings.defaultUserCredentials);
    return () => {
        subscription.stop();
    };
}))));
export const offsetStore = (_) => _;
