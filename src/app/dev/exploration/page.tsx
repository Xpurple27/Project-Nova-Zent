import {notFound} from 'next/navigation';
import ExplorationLab from '@/components/exploration/ExplorationLab';
export const dynamic='force-dynamic';
export default function Page(){if(process.env.NODE_ENV==='production'&&process.env.NOVA_ENABLE_OFFLINE_DEMO!=='1')notFound();return <ExplorationLab/>;}
