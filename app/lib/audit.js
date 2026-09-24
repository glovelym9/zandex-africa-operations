export function auditPayload({actorId,action,entity,entityId,metadata={}}){return {actorId,action,entity,entityId,metadata,occurredAt:new Date()};}
