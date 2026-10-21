import {notFound} from 'next/navigation';import PresentationLab from '@/components/presentation/PresentationLab';
export const dynamic='force-dynamic';
export default function Page(){if(process.env.NODE_ENV==='production'&&process.env.NOVA_ENABLE_OFFLINE_DEMO!=='1')notFound();return <PresentationLab/>;}
