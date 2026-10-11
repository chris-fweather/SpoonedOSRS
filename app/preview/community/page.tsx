import {notFound} from 'next/navigation';
import {CommunityPreview} from '../../CommunityPreview';
export const metadata={title:'Community layout and reputation preview',robots:{index:false,follow:false}};
export default function Page(){if(process.env.NODE_ENV!=='development')notFound();return <CommunityPreview/>;}
