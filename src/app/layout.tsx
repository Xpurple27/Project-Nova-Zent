
import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
export const metadata:Metadata={title:"NOVA ZENITH — Arcane Formula",description:"A cooperative mathematical RPG. Four paths. One seal. Your formula shapes the battle."};
export default function RootLayout({children}:{children:React.ReactNode}){
 return <html lang="id"><body><header className="topbar"><Link href="/" className="brand" aria-label="NOVA ZENITH home"><span className="brand-mark">✦</span><span>NOVA <strong>ZENITH</strong><small>THE ARCANE FORMULA</small></span></Link><nav><Link href="/lobby">Expedition Lobby <span aria-hidden>↗</span></Link></nav></header><main>{children}</main><footer>NOVA ZENITH <span>✦</span> Cooperative mathematical RPG · Foundation v0.1</footer></body></html>;
}
