import { createBirpc } from "birpc";
import type {
  ClientFunctions,
  ServerFunctions,
} from "../../../common/test/types";

const ws = new WebSocket("ws://localhost:5191");

await new Promise<void>((resolve) =>
  ws.addEventListener("open", () => {
    resolve();
  }),
);

const clientFunctions: ClientFunctions = {
  hey(name: string) {
    return `Hey ${name} from client`;
  },
};

export const rpc = createBirpc<ServerFunctions, ClientFunctions>(
  clientFunctions,
  {
    post: (data) => ws.send(data),
    on: (fn) => (ws.onmessage = (ev) => fn((ev as MessageEvent).data)),
    // these are required when using WebSocket
    serialize: (v) => JSON.stringify(v),
    deserialize: (v) => JSON.parse(v),
  },
);

await rpc.hi("Client");
