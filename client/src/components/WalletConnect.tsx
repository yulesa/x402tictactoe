import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ConnectButton, useActiveAccount } from 'thirdweb/react';
import { createWallet } from 'thirdweb/wallets';
import { base, baseSepolia } from 'thirdweb/chains';
import { QRCodeSVG } from 'qrcode.react';
import { thirdwebClient } from '../thirdwebClient';

// Configure recommended wallets
const wallets = [
  createWallet('me.rainbow'),
  createWallet('io.rabby'),
  createWallet('io.metamask'),
  createWallet('com.coinbase.wallet'),
];

// USDC contract addresses
const USDC_ADDRESSES: Record<number, string> = {
  [base.id]: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  [baseSepolia.id]: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
};

// Use test mode for fiat onramp when on testnet
const isTestnet = import.meta.env.VITE_NETWORK === 'base-sepolia';

// QR Code icon component
function QRIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
      <rect x="14" y="14" width="3" height="3" />
      <rect x="18" y="14" width="3" height="3" />
      <rect x="14" y="18" width="3" height="3" />
      <rect x="18" y="18" width="3" height="3" />
    </svg>
  );
}

interface QRModalProps {
  address: string;
  onClose: () => void;
}

function QRModal({ address, onClose }: QRModalProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [onClose]);

  const copyAddress = async () => {
    await navigator.clipboard.writeText(address);
  };

  return createPortal(
    <div className="qr-modal-overlay" onClick={onClose}>
      <div className="qr-modal" onClick={(e) => e.stopPropagation()}>
        <button
          className="qr-modal-close"
          onClick={onClose}
          type="button"
        >
          ×
        </button>
        <h3>Your Wallet Address</h3>
        <div className="qr-code-container">
          <QRCodeSVG
            value={address}
            size={200}
            bgColor="#ffffff"
            fgColor="#000000"
            level="M"
          />
        </div>
        <p className="qr-address">{address}</p>
        <button
          className="wallet-button wallet-button-connect"
          onClick={copyAddress}
          type="button"
        >
          Copy Address
        </button>
      </div>
    </div>,
    document.body
  );
}

export function WalletConnect() {
  const account = useActiveAccount();
  const [showQR, setShowQR] = useState(false);

  return (
    <>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        {/* Thirdweb ConnectButton */}
        <ConnectButton
          client={thirdwebClient}
          wallets={wallets}
          chains={[base, baseSepolia]}
          theme="dark"
          connectButton={{
            label: 'Connect Wallet',
            style: {
              backgroundColor: '#22c55e',
              color: 'black',
              borderRadius: '12px',
              padding: '10px 20px',
              fontSize: '14px',
              fontWeight: '600',
            },
          }}
          detailsButton={{
            displayBalanceToken: {
              [baseSepolia.id]: USDC_ADDRESSES[baseSepolia.id],
              [base.id]: USDC_ADDRESSES[base.id],
            },
            style: {
              borderRadius: '12px',
              padding: '10px 16px',
              fontSize: '14px',
            },
          }}
          detailsModal={{
            payOptions: {
              buyWithFiat: {
                testMode: isTestnet,
              },
              buyWithCrypto: {},
            },
          }}
        />

        {/* QR Code button when connected */}
        {account && (
          <button
            onClick={() => setShowQR(true)}
            type="button"
            className="wallet-button wallet-button-qr"
            title="Show QR Code"
          >
            <QRIcon />
          </button>
        )}
      </div>

      {showQR && account?.address && (
        <QRModal address={account.address} onClose={() => setShowQR(false)} />
      )}
    </>
  );
}
