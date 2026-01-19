import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useBalance, useChainId } from 'wagmi';
import { base, baseSepolia } from 'wagmi/chains';
import { QRCodeSVG } from 'qrcode.react';

// USDC contract addresses
const USDC_ADDRESSES: Record<number, `0x${string}`> = {
  [base.id]: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  [baseSepolia.id]: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
};

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
  const { address } = useAccount();
  const chainId = useChainId();
  const usdcAddress = USDC_ADDRESSES[chainId];
  const [showQR, setShowQR] = useState(false);

  const { data: usdcBalance } = useBalance({
    address,
    token: usdcAddress,
    query: {
      enabled: !!address && !!usdcAddress,
    },
  });

  const formatBalance = (balance: typeof usdcBalance) => {
    if (!balance) return null;
    const value = parseFloat(balance.formatted);
    return `${value.toFixed(2)} ${balance.symbol}`;
  };

  return (
    <>
      <ConnectButton.Custom>
        {({
          account,
          chain,
          openAccountModal,
          openChainModal,
          openConnectModal,
          mounted,
        }) => {
          const ready = mounted;
          const connected = ready && account && chain;

          return (
            <div
              {...(!ready && {
                'aria-hidden': true,
                style: {
                  opacity: 0,
                  pointerEvents: 'none',
                  userSelect: 'none',
                },
              })}
              style={{ display: 'flex', gap: '8px', alignItems: 'center' }}
            >
              {(() => {
                if (!connected) {
                  return (
                    <button
                      onClick={openConnectModal}
                      type="button"
                      className="wallet-button wallet-button-connect"
                    >
                      Connect Wallet
                    </button>
                  );
                }

                if (chain.unsupported) {
                  return (
                    <button
                      onClick={openChainModal}
                      type="button"
                      className="wallet-button wallet-button-wrong-network"
                    >
                      Wrong network
                    </button>
                  );
                }

                return (
                  <>
                    <button
                      onClick={openChainModal}
                      type="button"
                      className="wallet-button wallet-button-chain"
                    >
                      {chain.hasIcon && chain.iconUrl && (
                        <img
                          alt={chain.name ?? 'Chain icon'}
                          src={chain.iconUrl}
                          className="chain-icon"
                        />
                      )}
                      {chain.name}
                    </button>

                    <button
                      onClick={openAccountModal}
                      type="button"
                      className="wallet-button wallet-button-account"
                    >
                      {formatBalance(usdcBalance) && (
                        <span className="usdc-balance">
                          {formatBalance(usdcBalance)}
                        </span>
                      )}
                      {account.displayName}
                    </button>

                    <button
                      onClick={() => setShowQR(true)}
                      type="button"
                      className="wallet-button wallet-button-qr"
                      title="Show QR Code"
                    >
                      <QRIcon />
                    </button>
                  </>
                );
              })()}
            </div>
          );
        }}
      </ConnectButton.Custom>

      {showQR && address && (
        <QRModal address={address} onClose={() => setShowQR(false)} />
      )}
    </>
  );
}
