// Phones connect to the teacher's laptop peer-to-peer (WebRTC).
// The free public PeerJS server (0.peerjs.com) only introduces the devices; game data goes directly between them.
import { Peer } from 'peerjs';

const PREFIX = 'mqahwa-cafe-';
export const hostId = (pin) => PREFIX + pin;

// ───────── Host (teacher's control window) ─────────
let host = null;

/**
 * Starts (or keeps) the host for this PIN.
 * handlers: onMessage(peerId, msg), onLeave(token), onStatus(status)
 * status: connecting | online | reconnecting | offline | id-taken | error
 */
export function startHost(pin, handlers) {
  if (host && host.pin === pin && host.peer && !host.peer.destroyed) {
    host.handlers = handlers;
    handlers.onStatus?.(host.status);
    return host;
  }
  stopHost();
  const h = { pin, conns: new Map(), handlers, status: 'connecting', retries: 0 };
  host = h;
  const setStatus = (s) => {
    h.status = s;
    h.handlers.onStatus?.(s);
  };
  const retry = () => {
    try {
      h.peer?.destroy();
    } catch {
      /* ignore */
    }
    if (host !== h) return;
    h.retries++;
    setTimeout(() => host === h && open(), Math.min(10000, 1500 * h.retries));
  };
  const open = () => {
    setStatus(h.retries ? 'reconnecting' : 'connecting');
    const peer = new Peer(hostId(pin), { debug: 0 });
    h.peer = peer;
    peer.on('open', () => {
      h.retries = 0;
      setStatus('online');
    });
    peer.on('connection', (conn) => {
      conn.on('open', () => h.conns.set(conn.peer, { conn, token: null }));
      conn.on('data', (msg) => h.handlers.onMessage?.(conn.peer, msg));
      conn.on('close', () => {
        const c = h.conns.get(conn.peer);
        h.conns.delete(conn.peer);
        if (c?.token) h.handlers.onLeave?.(c.token);
      });
      conn.on('error', () => {});
    });
    peer.on('disconnected', () => {
      if (host === h && !peer.destroyed) {
        setStatus('reconnecting');
        try {
          peer.reconnect();
        } catch {
          retry();
        }
      }
    });
    peer.on('error', (err) => {
      if (host !== h) return;
      if (err.type === 'peer-unavailable') return;
      if (err.type === 'unavailable-id') setStatus('id-taken');
      else if (['network', 'server-error', 'socket-error', 'socket-closed', 'disconnected'].includes(err.type)) setStatus('offline');
      else setStatus('error');
      retry();
    });
  };
  h.open = open;
  open();
  return h;
}

export function stopHost() {
  if (!host) return;
  try {
    host.peer?.destroy();
  } catch {
    /* ignore */
  }
  host = null;
}

export const hostStatus = () => host?.status || 'off';

/** Remember which player token a connection belongs to */
export function tagConnection(peerId, token) {
  const c = host?.conns.get(peerId);
  if (c) c.token = token;
}

export function sendToPeer(peerId, msg) {
  const c = host?.conns.get(peerId);
  if (c?.conn?.open) c.conn.send(msg);
}

export function sendToToken(token, msg) {
  if (!host) return;
  for (const c of host.conns.values()) if (c.token === token && c.conn.open) c.conn.send(msg);
}

export function connectedTokens() {
  if (!host) return new Set();
  return new Set([...host.conns.values()].filter((c) => c.token && c.conn.open).map((c) => c.token));
}

// ───────── Client (a phone) ─────────
/**
 * Connects to the host for this PIN and keeps reconnecting until closed.
 * onStatus: connecting | open | no-host | lost
 */
export function connectClient(pin, { onOpen, onMessage, onStatus }) {
  const c = { closed: false, failing: false };
  const fail = (why) => {
    if (c.closed || c.failing) return;
    c.failing = true;
    try {
      c.peer?.destroy();
    } catch {
      /* ignore */
    }
    onStatus?.(why || 'lost');
    setTimeout(() => {
      c.failing = false;
      start();
    }, 3000);
  };
  const start = () => {
    if (c.closed) return;
    onStatus?.('connecting');
    const peer = new Peer({ debug: 0 });
    c.peer = peer;
    peer.on('open', () => {
      const conn = peer.connect(hostId(pin), { reliable: true });
      c.conn = conn;
      const timer = setTimeout(() => !conn.open && fail('lost'), 10000);
      conn.on('open', () => {
        clearTimeout(timer);
        onStatus?.('open');
        onOpen?.();
      });
      conn.on('data', (m) => onMessage?.(m));
      conn.on('close', () => fail('lost'));
      conn.on('error', () => fail('lost'));
    });
    peer.on('error', (e) => fail(e.type === 'peer-unavailable' ? 'no-host' : 'lost'));
  };
  c.send = (m) => {
    if (c.conn?.open) {
      c.conn.send(m);
      return true;
    }
    return false;
  };
  c.close = () => {
    c.closed = true;
    try {
      c.peer?.destroy();
    } catch {
      /* ignore */
    }
  };
  start();
  return c;
}
