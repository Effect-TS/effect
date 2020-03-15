import {
  summon,
  tagged,
  AsOpaque
} from "@morphic-ts/batteries/lib/summoner-ESBAST";
import { EType, AType } from "@morphic-ts/batteries/lib/usage/utils";

const TodoAdded_ = summon(F =>
  F.interface(
    {
      type: F.stringLiteral("TodoAdded"),
      id: F.number(),
      todo: F.string()
    },
    "TodoAdded"
  )
);

export interface TodoAddedRaw extends EType<typeof TodoAdded_> {}
export interface TodoAdded extends AType<typeof TodoAdded_> {}

const TodoAdded = AsOpaque<TodoAddedRaw, TodoAdded>(TodoAdded_);

const TodoRemoved_ = summon(F =>
  F.interface(
    {
      type: F.stringLiteral("TodoRemoved"),
      id: F.number()
    },
    "TodoRemoved"
  )
);

export interface TodoRemovedRaw extends EType<typeof TodoRemoved_> {}
export interface TodoRemoved extends AType<typeof TodoRemoved_> {}

const TodoRemoved = AsOpaque<TodoRemovedRaw, TodoRemoved>(TodoRemoved_);

// define all events in your domain
export const DomainEvent = tagged("type")({ TodoAdded, TodoRemoved });
