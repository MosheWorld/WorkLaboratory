import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Embedding Lab | Multimodal Vector Playground",
  description: "Create, compare, and explore text and image embeddings in one interactive 3D lab.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
