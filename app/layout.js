import "./globals.css";
import AppShell from "./components/AppShell";

export const metadata = {
  title: "CV Review App",
  description: "Upload, parse, and categorize CVs with AI assistance",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full">
        <AppShell>
          {children}
        </AppShell>
      </body>
    </html>
  );
}
