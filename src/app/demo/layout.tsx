import {DemoProvider} from '@/components/demo-provider';
import {demoBatches} from '@/lib/demo';
export default async function Layout({children}:{children:React.ReactNode}){return <DemoProvider initial={await demoBatches()}>{children}</DemoProvider>}
