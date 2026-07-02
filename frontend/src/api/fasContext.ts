import { FasContext } from './types';

/* The FAS redirect lands on /portal?clientip=…&clientmac=…&hid=…&sig=…
   before the customer has logged in. We stash the signed context in
   localStorage so it survives the login round-trip; /session/connect
   re-verifies the signature server-side, so a tampered copy is useless. */

const KEY = 'cybera.fasContext';

export const captureFasContext = (params: URLSearchParams): FasContext | null => {
  const clientip = params.get('clientip');
  const clientmac = params.get('clientmac');
  const hid = params.get('hid');
  const sig = params.get('sig');
  if (!clientip || !clientmac || !hid || !sig) return null;
  const ctx: FasContext = { clientip, clientmac, hid, sig };
  localStorage.setItem(KEY, JSON.stringify(ctx));
  return ctx;
};

export const loadFasContext = (): FasContext | null => {
  const raw = localStorage.getItem(KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as FasContext;
  } catch {
    return null;
  }
};
