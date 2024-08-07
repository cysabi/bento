import type { Peer, Hooks } from "crossws";

export type ServerConfig<S> = S & Actions<S>;

export type Model<S> = {
  state: S;
  actions: Actions<S>;
  init?: (setter: Setter<S>) => Promise<void> | void;
};

export type Actions<S> = {
  [key: string]: (
    set: (setter: Setter<S>) => void,
    payload?: any
  ) => Promise<void> | void;
};

export type Setter<S> = (state: S) => void;
export type Patch = { path: string[]; value?: any };
export type Message =
  | ({ type: "init" } & MessageInit)
  | ({ type: "action" } & MessageAction);
export type MessageInit = {
  scopes: Patch["path"][];
};
export type MessageAction = {
  action: string;
  payload: any;
};
export type Emit = {
  ws: Peer;
  patches?: Patch[];
};

export type Clients = Map<Peer, MessageInit["scopes"]>;
export type WS = Partial<Hooks>;
