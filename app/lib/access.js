export const roles={DIRECTION:'DIRECTION',GESTIONNAIRE:'GESTIONNAIRE'};
const grants={
  DIRECTION:new Set(['products','suppliers','purchases','stock','agents','assignments','sales','expenses','inventory','cash','reports','users']),
  GESTIONNAIRE:new Set(['stock','agents','assignments','sales','expenses','inventory','cash','reports'])
};
export function assertAccess(user,module){if(!user||!grants[user.role]?.has(module))throw new Error('Accès non autorisé.');}
