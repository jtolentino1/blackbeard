import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';

export default function ConnectButton() {
  const { connect, connected, connecting, wallet } = useWallet();
  const { setVisible } = useWalletModal();

  const handleConnectClick = async () => {
    if (!wallet) {
      // No wallet selected yet, show the modal
      setVisible(true);
    } else {
      // Wallet is selected, attempt to connect
      try {
        await connect();
      } catch (error) {
        console.error(error);
      }
    }
  };

  return (
    <button 
      onClick={handleConnectClick}
      disabled={connecting}
      className="bg-[#2985D4] text-[#ffffff] px-6 py-2 rounded-lg font-semibold hover:bg-[#2477BC] transition-colors"
    >
      {connecting ? 'Connecting...' : 'Connect'}
    </button>
  );
}
