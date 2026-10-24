import {z} from 'zod';
import {actor,batches,checkOrigin,failure,saveBatch} from '@/lib/server';
import {actionSchema,canRead,detectConflicts} from '@/lib/domain';
import {applyAction} from '@/lib/workflow';
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){try{checkOrigin(request);const a=await actor(),{id}=await params;const key=z.uuid().parse(request.headers.get('idempotency-key'));const all=await batches(),row=all.find(r=>r.batch.id===id);if(!row||!canRead(a,row.batch))throw new Error('Record access denied');if(row.batch.events.some(e=>e.id===key))return Response.json(row.batch);row.batch.findings=detectConflicts(row.batch,all.map(r=>r.batch));const action=actionSchema.parse(await request.json());const next=await applyAction(row.batch,a,action,all.map(r=>r.batch),key);await saveBatch(next,row.version,key,a.id);return Response.json(next);}catch(e){return failure(e);}}
