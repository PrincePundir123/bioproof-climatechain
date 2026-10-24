import { actionSchema, authorize, type Actor, type Batch, type Action, detectConflicts } from './domain';
import { appendEvent } from './proof';
export async function applyAction(original:Batch,actor:Actor,input:Action,all:Batch[],eventId=crypto.randomUUID()){
 const action=actionSchema.parse(input);authorize(actor,original,action);const b=structuredClone(original);
 switch(action.type){
 case 'DECLARE':b.status='DECLARED';break;
 case 'PICKUP':b.pickup={...action.measurement,actorId:actor.id,timestamp:action.timestamp,notes:action.notes};b.status='PICKED_UP';break;
 case 'INTAKE':b.intake={...action.measurement,actorId:actor.id,timestamp:action.timestamp,receipt:action.receipt,facility:action.facility,process:action.process,notes:action.notes};b.status='RECEIVED';break;
 case 'REQUEST_REVIEW':b.status='UNDER_REVIEW';break;
 case 'APPROVE':case 'REJECT':b.status=action.type==='APPROVE'?'APPROVED':'REJECTED';b.decision={actorId:actor.id,status:b.status,reason:action.reason};break;
 case 'DISPUTE':b.status='DISPUTED';break;
 case 'RESOLVE':{const finding=b.findings.find(f=>f.id===action.findingId);if(!finding)throw new Error('Finding not found');finding.resolution=action.reason;break;}
 case 'SOIL_REVIEW':b.soilReview=action.reason;break;
 }
 b.findings=detectConflicts(b,all);
 b.events=await appendEvent(b.events,{id:eventId,batchId:b.id,type:action.type,actor,timestamp:new Date().toISOString(),evidenceIds:b.evidence.map(e=>e.id),payload:JSON.parse(JSON.stringify(action))});return b;
}
export function publicRecord(b:Batch){return {id:b.id,region:b.region,residue:b.residue,declared:b.declared,status:b.status,synthetic:b.synthetic,pickup:b.pickup?{kg:b.pickup.kg,basis:b.pickup.basis,timestamp:b.pickup.timestamp}:null,intake:b.intake?{kg:b.intake.kg,basis:b.intake.basis,timestamp:b.intake.timestamp,process:b.intake.process}:null,decision:b.decision?{status:b.decision.status,summary:'Independent review decision recorded. Detailed reasoning is private.'}:null,anchor:b.anchor,root:b.events.at(-1)?.hash,events:b.events.map(e=>({type:e.type,timestamp:e.timestamp,role:e.actor.role,hash:e.hash})),outstandingDispute:b.status==='DISPUTED'};}
