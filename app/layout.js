import "./globals.css";

export const metadata = {
  title: "Remeselník AI",
  description: "AI aplikácia pre remeselníkov",
};

export default function RootLayout({ children }) {
  return (
    <html lang="sk">
      <body>{children}</body>
    </html>
  );
}