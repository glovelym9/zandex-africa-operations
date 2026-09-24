const rights={
  direction:['dashboard','products','suppliers','purchases','stock','agents','assignments','sales','expenses','cash','inventory','reports','users'],
  gestionnaire:['dashboard','stock','agents','assignments','sales','expenses','cash','inventory','reports']
};

export function can(role, module) { return rights[role]?.includes(module) || false; }
export function requireRight(role, module) {
  if (!can(role,module)) throw new Error('Vous ne disposez pas du droit requis pour cette opération.');
}
