import {describe,it,expect} from 'vitest';
import {canonical,appendEvent,verifyChain,sha256} from '../src/lib/proof';
import {compareWeights,normalizeReceipt,soilSafe,authorize,detectConflicts,type Batch} from '../src/lib/domain';
import {applyAction,publicRecord} from '../src/lib/workflow';
const batch=():Batch=>({id:'A',farmerId:'f',plotId:'p',region:'Punjab',residue:'Rice straw',declared:{kg:600,basis:'wet'},status:'DRAFT',evidence:[],events:[],findings:[],anchor:{status:'NOT_REQUESTED'},synthetic:true});
describe('cryptographic integrity',()=>{
 it('canonicalizes nested object ordering',()=>expect(canonical({z:1,a:{c:2,b:1}})).toBe(canonical({a:{b:1,c:2},z:1})));
 it('rejects ambiguous values',()=>expect(()=>canonical({a:undefined})).toThrow());
 it('hashes real bytes using known SHA-256 vector',async()=>expect(await sha256('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'));
 it('detects modification and truncation',async()=>{const events=await appendEvent([],{id:'1',batchId:'A',type:'DECLARE',actor:{id:'f',role:'FARMER'},timestamp:'2026-10-24T00:00:00Z',evidenceIds:[],payload:{kg:600}});expect((await verifyChain(events)).valid).toBe(true);const copy=structuredClone(events);copy[0].payload.kg=601;expect((await verifyChain(copy)).index).toBe(0);expect((await verifyChain([],events[0].hash)).valid).toBe(false);});
});
describe('review rules',()=>{
 it('normalizes receipt identifiers',()=>expect(normalizeReceipt(' wb- 001 ')).toBe('WB001'));
 it('explains 40kg variance',()=>expect(compareWeights({kg:600,basis:'wet'},{kg:560,basis:'wet'})).toMatchObject({kg:40,flagged:true}));
 it('marks unknown basis uncertain',()=>expect(compareWeights({kg:600,basis:'unknown'},{kg:560,basis:'wet'}).uncertain).toBe(true));
 it('converts wet to dry transparently',()=>expect(compareWeights({kg:100,basis:'wet',moisture:20},{kg:80,basis:'dry'})).toMatchObject({kg:0}));
 it('rejects negative mass',()=>expect(()=>compareWeights({kg:-1,basis:'wet'},{kg:2,basis:'wet'})).toThrow());
 it('never issues a safe soil threshold',()=>{expect(soilSafe(batch()).state).toBe('INSUFFICIENT_INFORMATION');expect(soilSafe({...batch(),totalResidue:650}).state).toBe('REQUIRES_AGRONOMIC_REVIEW');});
 it('requires independent audit actor',()=>expect(()=>authorize({id:'f',role:'AUDITOR'},{...batch(),status:'UNDER_REVIEW'},{type:'APPROVE',reason:'Enough justification'})).toThrow('Independent'));
 it('rejects direct invalid transitions',()=>expect(()=>authorize({id:'c',role:'COLLECTOR'},batch(),{type:'PICKUP',measurement:{kg:600,basis:'wet'},timestamp:new Date().toISOString(),notes:'scale'})).toThrow());
 it('detects scoped receipts and identical file bytes',()=>{const a={...batch(),intake:{kg:600,basis:'wet' as const,actorId:'p',timestamp:'2026-10-24T12:00:00Z',receipt:'WB-1',facility:'Mill',process:'Composting',notes:'received'},evidence:[{id:'e1',name:'receipt',type:'intake',uploadedBy:'p',sha256:'same'}]};const b={...a,id:'B',evidence:[{...a.evidence[0],id:'e2'}]};expect(detectConflicts(a,[a,b]).map(f=>f.code)).toEqual(expect.arrayContaining(['SAME_RECEIPT_NUMBER','IDENTICAL_FILE_HASH']));});
 it('redacts private actor and evidence data',()=>{const result=JSON.stringify(publicRecord({...batch(),evidence:[{id:'e',name:'private',type:'pickup',uploadedBy:'secret',sha256:'abc',storagePath:'private-path'}]}));expect(result).not.toContain('private-path');expect(result).not.toContain('farmerId');});
 it('runs custody workflow and rejects duplicate pickup',async()=>{let b=batch();b=await applyAction(b,{id:'f',role:'FARMER'},{type:'DECLARE'},[]);b=await applyAction(b,{id:'c',role:'COLLECTOR'},{type:'PICKUP',measurement:{kg:600,basis:'wet'},timestamp:new Date().toISOString(),notes:'Scale measured'},[]);await expect(applyAction(b,{id:'c',role:'COLLECTOR'},{type:'PICKUP',measurement:{kg:600,basis:'wet'},timestamp:new Date().toISOString(),notes:'Retry'},[])).rejects.toThrow();b=await applyAction(b,{id:'p',role:'PROCESSOR'},{type:'INTAKE',measurement:{kg:560,basis:'wet'},timestamp:new Date().toISOString(),receipt:'WB-1',facility:'Mill',process:'Composting',notes:'Difference requires review'},[]);expect(b.findings.some(f=>f.code==='CONFLICTING_QUANTITY')).toBe(true);expect((await verifyChain(b.events)).valid).toBe(true);});
});
