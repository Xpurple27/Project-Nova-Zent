
import { notFound } from "next/navigation";
import CombatLab from "@/components/combat/CombatLab";
export const dynamic="force-dynamic";
export default function CombatPage(){
 if(process.env.NODE_ENV==="production"&&process.env.NOVA_ENABLE_OFFLINE_DEMO!=="1")notFound();
 return <CombatLab debug={process.env.NODE_ENV!=="production"}/>;
}
