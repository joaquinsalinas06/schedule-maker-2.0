import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { ToastProvider } from "@/components/ui/toast";
import { StructuredData } from "@/components/seo/StructuredData";
import { generateOrganizationSchema, generateSoftwareApplicationSchema } from "@/lib/seo";
import { SpeedInsights } from "@vercel/speed-insights/next"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Schedule Maker | Generador de Horarios Inteligente",
    template: "%s | Schedule Maker"
  },
  description: "Crea horarios universitarios optimizados con inteligencia artificial. Colabora en tiempo real, evita conflictos y encuentra la combinación perfecta de clases.",
  keywords: [
    "generador de horarios",
    "horarios universitarios", 
    "planificador académico",
    "schedule maker",
    "university schedule",
    "class planner",
    "horarios UTEC",
    "colaboración estudiantes"
  ],
  authors: [{ name: "Schedule Maker Team" }],
  creator: "Schedule Maker",
  publisher: "Schedule Maker",
  openGraph: {
    type: "website",
    locale: "es_PE",
    url: "https://schedule-maker.vercel.app",
    title: "Schedule Maker | Generador de Horarios Inteligente",
    description: "Crea horarios universitarios optimizados con inteligencia artificial. Colabora en tiempo real, evita conflictos y encuentra la combinación perfecta de clases.",
    siteName: "Schedule Maker",
  },
  twitter: {
    card: "summary_large_image",
    title: "Schedule Maker | Generador de Horarios Inteligente",
    description: "Crea horarios universitarios optimizados con inteligencia artificial.",
    creator: "@schedule_maker",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    google: "verification_token_here", // Add your Google Search Console verification
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <StructuredData data={generateOrganizationSchema()} />
        <StructuredData data={generateSoftwareApplicationSchema()} />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <ToastProvider>
            {children}
            <SpeedInsights/>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
