import { EventEmitter } from "node:events";

export interface ChatRealtimeEvent {
  type: "message" | "status" | "heartbeat";
  conversationId: string;
  payload: unknown;
}

const globalBus = globalThis as unknown as {
  __onetabChatBus?: EventEmitter;
};

const bus = globalBus.__onetabChatBus ?? new EventEmitter();
if (!globalBus.__onetabChatBus) {
  bus.setMaxListeners(500);
  globalBus.__onetabChatBus = bus;
}

export function emitChatEvent(
  conversationId: string,
  type: ChatRealtimeEvent["type"],
  payload: unknown
) {
  bus.emit(`conv:${conversationId}`, {
    type,
    conversationId,
    payload,
  } satisfies ChatRealtimeEvent);
}

export function subscribeToConversation(
  conversationId: string,
  listener: (event: ChatRealtimeEvent) => void
): () => void {
  const channel = `conv:${conversationId}`;
  bus.on(channel, listener);
  return () => {
    bus.off(channel, listener);
  };
}
