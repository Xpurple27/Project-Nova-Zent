import type { Viewport, Metadata } from "next";
import AudioProvider from "@/components/audio/AudioProvider";
import Link from "next/link";
import "./globals.css";
export const viewport:Viewport={width:"device-width",initialScale:1,viewportFit:"cover"};
export const metadata:Metadata={title:"NOVA ZENITH — Arcane Formula",description:"A cooperative mathematical RPG. Four paths. One seal. Your formula shapes the battle."};
export default function RootLayout({children}:{children:React.ReactNode}){
 return <html lang="id"><head><link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.22/dist/katex.min.css" crossOrigin="anonymous"/><script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.22/dist/katex.min.js" crossOrigin="anonymous"/></head><body><AudioProvider><header className="topbar"><Link href="/" className="brand" aria-label="NOVA ZENITH home"><span className="brand-mark">✦</span><span>NOVA <strong>ZENITH</strong><small>THE ARCANE FORMULA</small></span></Link><nav><Link href="/lobby">Expedition Lobby <span aria-hidden>↗</span></Link></nav></header><main>{children}</main><footer>NOVA ZENITH <span>✦</span> Cooperative mathematical RPG · Foundation v0.1</footer></AudioProvider></body></html>;
}
