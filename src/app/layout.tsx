import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata={title:'BioProof | Every claim begins with evidence',description:'Agricultural residue evidence, independent review, and tamper-evident proof.'};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}
