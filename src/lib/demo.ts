import {type Batch,detectConflicts} from './domain';
import {appendEvent,sha256} from './proof';
export async function demoBatches():Promise<Batch[]>{
 const all:Batch[]=[];
 for(let n=1;n<=4;n++){
 const id=`BP-00${n}`;const b:Batch={id,farmerId:'demo-farmer',plotId:`plot-${n}`,region:n===4?'Haryana, India':'Punjab, India',residue:n===4?'Wheat straw':'Rice straw',declared:{kg:n===4?950:600,basis:'wet'},totalResidue:n===4?1000:1200,status:n===1?'APPROVED':n===4?'DECLARED':'UNDER_REVIEW',evidence:[],events:[],findings:[],synthetic:true,anchor:{status:'NOT_REQUESTED'}};
 const steps=[{type:'CREATE',role:'FARMER' as const,payload:{kg:b.declared.kg,basis:'wet'}},{type:'DECLARE',role:'FARMER' as const,payload:{kg:b.declared.kg}}];
 if(n<4){b.pickup={kg:600,basis:'wet',actorId:'demo-collector',timestamp:'2026-10-23T08:00:00.000Z',notes:'Synthetic scale reading at collection.'};b.intake={kg:n===1?560:600,basis:'wet',actorId:'demo-processor',timestamp:'2026-10-23T10:00:00.000Z',receipt:n===1?'WB-1001':'WB-2002',facility:'Punjab Demonstration Facility',process:'Composting',notes:n===1?'Synthetic reconciliation: loose material lost during handling. Supporting records reviewed in demonstration.':'Synthetic weighbridge record. Receipt overlap needs investigation.'};b.evidence=[{id:`${id}-pickup`,name:'Synthetic pickup record',type:'pickup',uploadedBy:'demo-collector',sha256:await sha256(`SYNTHETIC pickup ${id}`)},{id:`${id}-intake`,name:'Synthetic intake receipt',type:'intake',uploadedBy:'demo-processor',sha256:await sha256(`SYNTHETIC receipt ${b.intake.receipt}`)}];}
 for(let i=0;i<steps.length;i++)b.events=await appendEvent(b.events,{id:`${id}-${i}`,batchId:id,type:steps[i].type,actor:{id:'demo-farmer',role:steps[i].role},timestamp:`2026-10-23T0${i+6}:00:00.000Z`,evidenceIds:[],payload:steps[i].payload});
 if(b.pickup&&b.intake){for(const [type,role,payload] of [['PICKUP','COLLECTOR',b.pickup],['INTAKE','PROCESSOR',b.intake],['REQUEST_REVIEW','AUDITOR',{reason:'Custody records ready'}]] as const)b.events=await appendEvent(b.events,{id:`${id}-${type}`,batchId:id,type,actor:{id:`demo-${role.toLowerCase()}`,role},timestamp:type==='PICKUP'?b.pickup.timestamp:'2026-10-23T10:00:00.000Z',evidenceIds:b.evidence.map(e=>e.id),payload});}
 all.push(b);
 }
 for(const b of all)b.findings=detectConflicts(b,all);
 const approved=all[0];for(const f of approved.findings)f.resolution='Synthetic auditor reviewed the documented 40 kg handling difference and supporting custody records. This is a demonstration decision, not real-world assurance.';
 approved.decision={actorId:'demo-auditor',status:'APPROVED',reason:'Synthetic auditor reviewed the 40 kg discrepancy and accepted the documented reconciliation. No environmental outcome is certified.'};
 approved.events=await appendEvent(approved.events,{id:'BP-001-approval',batchId:approved.id,type:'APPROVE',actor:{id:'demo-auditor',role:'AUDITOR'},timestamp:'2026-10-23T12:00:00.000Z',evidenceIds:approved.evidence.map(e=>e.id),payload:{reason:approved.decision.reason,resolutions:approved.findings}});
 return all;
}
