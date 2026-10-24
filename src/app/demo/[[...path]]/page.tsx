import {demoBatches} from '@/lib/demo';
import {Workspace} from '@/components/workspace';
export default async function Demo(){return <Workspace initial={await demoBatches()} initialActor={{id:'demo-auditor',role:'AUDITOR'}} demo/>}
