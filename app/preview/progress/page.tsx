import {notFound} from 'next/navigation';
import {ProgressPreview} from '../../ProgressPreview';
export const metadata={title:'Development layout fixture',robots:{index:false,follow:false}};
export default function Page(){if(process.env.NODE_ENV!=='development')notFound();return <ProgressPreview/>;}
