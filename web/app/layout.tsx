import "./globals.css";
import ThemeManager from "@/components/ThemeManager";

export const metadata = { title: "Clinic OS" };

// Inline script prevents flash of wrong theme before React hydrates.
const THEME_INIT = `
try {
  var t = JSON.parse(localStorage.getItem('cos:theme') || '"dark"');
  var a = JSON.parse(localStorage.getItem('cos:accentColor') || '"teal"');
  document.documentElement.setAttribute('data-theme', t);
  document.documentElement.setAttribute('data-accent', a);
} catch(e) {}
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <head>
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="h-full bg-surface font-sans antialiased">
        <ThemeManager />
        {children}
      </body>
    </html>
  );
}
