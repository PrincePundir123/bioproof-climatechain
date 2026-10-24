import {redirect} from 'next/navigation';
import {actor,batches,configured,db} from '@/lib/server';
import {canRead} from '@/lib/domain';
import {Workspace} from '@/components/workspace';
export const dynamic='force-dynamic';
export default async function Dashboard(){if(!configured())redirect('/login');const a=await actor().catch(()=>null);if(!a)redirect('/login');const all=await batches();const {data}=await db().from('farm_plots').select('id,display_name,approximate_region').eq('farmer_id',a.id);return <Workspace initial={all.map(r=>r.batch).filter(b=>canRead(a,b))} initialActor={a} demo={false} plots={data??[]}/>}
