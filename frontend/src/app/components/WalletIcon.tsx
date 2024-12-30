'use client';

import Avatar from 'boring-avatars';

interface WalletIconProps {
  address: string;
  size?: number;
}

export default function WalletIcon({ address, size = 20 }: WalletIconProps) {
  // Ensure we have a valid address string
  if (!address) return null;
  
  // More reliable seed generation
  const seed = address.split('').reduce((acc, char) => {
    return acc + char.charCodeAt(0);
  }, 0);

  // Generate colors based on the seed
  const generateColors = (baseSeed: number) => {
    const h1 = baseSeed % 360;
    const h2 = (h1 + 120) % 360;
    const h3 = (h1 + 240) % 360;

    return [
      `hsl(${h1}, 70%, 60%)`,
      `hsl(${h2}, 70%, 60%)`,
      `hsl(${h3}, 70%, 60%)`,
      `hsl(${h1}, 80%, 70%)`,
      `hsl(${h2}, 80%, 70%)`
    ];
  };

  const colors = generateColors(seed);

  return (
    <div className="inline-block rounded-full">
      <Avatar
        size={size}
        name={address}
        variant="marble"
        colors={colors}
        square={false}
      />
    </div>
  );
}