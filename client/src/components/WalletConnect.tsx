import { ConnectButton } from '@rainbow-me/rainbowkit';

export function WalletConnect() {
  return (
    <ConnectButton
      chainStatus={{ smallScreen: 'full', largeScreen: 'full' }}
      showBalance={false}
      accountStatus={{
        smallScreen: 'avatar',
        largeScreen: 'full',
      }}
    />
  );
}
