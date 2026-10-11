import type {ReactNode} from 'react';
import './legal.css';
export function LegalPage({title,children}:{title:string;children:ReactNode}){
 return <main className="legal-page"><a href="/">← Spooned OSRS</a><p className="kicker">Updated 6 October 2026</p><h1>{title}</h1>{children}<p>Contact the Spooned OSRS team through our <a href="https://discord.gg/spoonedosrs" target="_blank" rel="noreferrer">Discord server</a>. Ask a server owner for a private conversation before sharing account or privacy details.</p></main>;
}
