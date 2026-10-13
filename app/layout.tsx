import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./legal.css";
import "./mobile-layout.css";

declare const __SPOONED_RELEASE__: {version:string};
declare const __SPOONED_ENV__: string;
const DEV = __SPOONED_ENV__ === "dev";

export const viewport: Viewport = {width: "device-width", initialScale: 1, viewportFit: "cover"};

export const metadata: Metadata = {
  metadataBase: new URL("https://spoonedosrs.com"),
  title: "Spooned OSRS · OSRS pet & drop tracker",
  openGraph: {type:"website",siteName:"Spooned OSRS",title:"Spooned OSRS",description:"Find your fellow collectors. Pets, drops and achievements from Old School RuneScape.",url:"https://spoonedosrs.com",images:[{url:"https://spoonedosrs.com/api/share?v=5",width:1200,height:630,type:"image/png",alt:"Spooned OSRS — find your fellow collectors"}]},
  twitter: {card:"summary_large_image",title:"Spooned OSRS",description:"Find your fellow collectors. Pets, drops and achievements from Old School RuneScape.",images:["https://spoonedosrs.com/api/share?v=5"]},
  description: "Track your OSRS pets, drops and collection log, with real odds at your kill count.",
  ...(DEV ? {robots: {index: false, follow: false}} : {}),
  icons: {
    icon: "/brand/rocky-icon.png",
    shortcut: "/brand/rocky-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{DEV&&<div className="dev-banner" role="note">Dev environment: test data, not the live site</div>}{children}<footer className="legal-footer"><a href="/privacy">Privacy</a><a href="/terms">Terms</a><a href="https://github.com/chris-fweather/SpoonedOSRS/releases" target="_blank" rel="noopener noreferrer" title="Source code for each version">v{__SPOONED_RELEASE__.version} · Source code</a></footer></body>
    </html>
  );
}



