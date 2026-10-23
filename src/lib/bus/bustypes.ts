export type EventMap = {
    'player:fullscreen:visible:change': [state: boolean]
};


export type EventCallback<T extends keyof EventMap> = (...args: EventMap[T]) => void;
export type EventSubscription = { unsubscribe: () => void };
