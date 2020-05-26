import { ESMeta } from "./read"
import * as O from "@matechs/core/Option"
import { EventMetaHidden } from "@matechs/cqrs"
export declare function adaptMeta(meta: ESMeta): O.Option<EventMetaHidden>
