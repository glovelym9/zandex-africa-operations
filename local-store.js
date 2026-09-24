const KEY='zandex-africa-v1';

export function saveSnapshot({core,catalog}) {
  const stock=[...core.stock.entries()];
  localStorage.setItem(KEY,JSON.stringify({stock,ledger:core.ledger,sales:core.sales,catalog,savedAt:new Date().toISOString()}));
}

export function loadSnapshot() {
  const raw=localStorage.getItem(KEY);
  return raw ? JSON.parse(raw) : null;
}

export function clearSnapshot() { localStorage.removeItem(KEY); }
