import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./legal.css";
import "./mobile-layout.css";

export const viewport: Viewport = {width: "device-width", initialScale: 1, viewportFit: "cover"};

export const metadata: Metadata = {
  metadataBase: new URL("https://spoonedosrs.com"),
  title: "Spooned OSRS · OSRS pet & drop tracker",
  openGraph: {type:"website",siteName:"Spooned OSRS",title:"Spooned OSRS",description:"Find your fellow collectors. Pets, drops and achievements from Old School RuneScape.",url:"https://spoonedosrs.com",images:[{url:"https://spoonedosrs.com/api/share?v=4",width:1200,height:630,type:"image/png",alt:"Spooned OSRS — find your fellow collectors"}]},
  twitter: {card:"summary_large_image",title:"Spooned OSRS",description:"Find your fellow collectors. Pets, drops and achievements from Old School RuneScape.",images:["https://spoonedosrs.com/api/share?v=4"]},
  description: "Track your OSRS pets, drops and collection log, with real odds at your kill count.",
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
      <body className="antialiased">{children}<footer className="legal-footer"><a href="/privacy">Privacy</a><a href="/terms">Terms</a></footer></body>
    </html>
  );
}



