// sockjs-client ships as a Node-style bundle and touches the bare `global`
// object at import time, which browsers don't provide — alias it to window so
// the WebSocket layer (and therefore the whole app) can boot.
(window as unknown as { global: typeof globalThis }).global = window;
