import type { Metadata } from "next";
import WalletContextProvider from "./context/WalletContextProvider";
import { PaymentProvider } from "./context/PaymentContext";
import "./globals.css";

const TARGET_ADDRESS = process.env.NEXT_PUBLIC_TREASURY_ADDRESS;

if (!TARGET_ADDRESS) {
  console.error(
    "Payment address not configured! Please set NEXT_PUBLIC_PAYMENT_ADDRESS in your environment variables."
  );
}

export const metadata: Metadata = {
  title: "Blackbeard",
  description: "The high seas of Solana await you!",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <WalletContextProvider>
          <PaymentProvider targetAddress={TARGET_ADDRESS || ""}>
            {children}
          </PaymentProvider>
        </WalletContextProvider>
      </body>
    </html>
  );
}
