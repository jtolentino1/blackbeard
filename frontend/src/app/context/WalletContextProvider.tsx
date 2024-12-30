'use client';

import { FC, ReactNode, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-wallets';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { clusterApiUrl } from '@solana/web3.js';
import { Cluster } from '@solana/web3.js';

interface Props {
  children: ReactNode;
}

const WalletComponents: FC<Props> = ({ children }) => {
  const network = process.env.NEXT_PUBLIC_SOLANA_NETWORK || 'devnet';

  const endpoint = useMemo(() => {
    if (network === 'mainnet-beta') {
      return process.env.NEXT_PUBLIC_SOLANA_RPC_MAINNET!;
    } else {
      return clusterApiUrl(network as Cluster);
    }
  }, [network]);

  const wallets = useMemo(
    () => [new PhantomWalletAdapter()],
    []
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};

const WalletContextProvider: FC<Props> = ({ children }) => {
  const WalletContextProviderComponent = dynamic(
    () => Promise.resolve(WalletComponents),
    {
      ssr: false,
    }
  );

  return <WalletContextProviderComponent>{children}</WalletContextProviderComponent>;
};

export default WalletContextProvider;
