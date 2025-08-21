import "./globals.css";

export const metadata = {
  title: "CV Review App",
  description: "Application for reviewing CVs",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
