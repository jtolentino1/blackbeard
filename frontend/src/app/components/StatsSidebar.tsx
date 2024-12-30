"use client";

import { usePayment } from "../context/PaymentContext";
import { AnimatedNumber } from "./AnimatedNumber";
import { useEffect, useState } from "react";
import Link from "next/link";

const TREASURY_ADDRESS = process.env.NEXT_PUBLIC_TREASURY_ADDRESS || "";
const SOLANA_NETWORK = process.env.NEXT_PUBLIC_SOLANA_NETWORK || "devnet";

interface NavLink {
  href: string;
  label: string;
}

interface StatsSidebarProps {
  animationReady?: boolean;
  useSol?: boolean; // <-- Add this
}

export const StatsSidebar = ({ animationReady = false, useSol = true }: StatsSidebarProps) => {
  const { stats } = usePayment();

  // For displaying the countdown
  const [timeLeft, setTimeLeft] = useState<string | null>(null);

  useEffect(() => {
    if (!stats.endDate) {
      setTimeLeft(null);
      return;
    }

    const targetDate = new Date(stats.endDate);
    const timer = setInterval(() => {
      const now = Date.now();
      const distance = targetDate.getTime() - now;

      if (distance < 0) {
        clearInterval(timer);
        setTimeLeft("Concluded");
        return;
      }

      const hours = Math.floor(distance / (1000 * 60 * 60));
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);

      setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
    }, 1000);

    return () => clearInterval(timer);
  }, [stats.endDate]);

  // Existing stats
  const usdValue = stats.usdBalance || 0;
  const solValue = stats.solBalance || 0;
  const totalAttempts = stats.totalAttempts || 0;
  const solCost = stats.costPerAttempt || 0; // SOL cost
  const tokenCost = stats.tokenCostPerAttempt || 0; // Token cost

  // Decide which cost to display based on useSol
  const costPerMessage = useSol ? solCost : tokenCost;
  const costSuffix = useSol ? " SOL" : " BAI";

  const formatNumber = (num: number, decimals: number) => num.toFixed(decimals);

  const links: NavLink[] = [
    { href: "https://blackbeardai.gitbook.io/docs/roadmap", label: "Roadmap" },
    { href: "https://blackbeardai.gitbook.io/docs/terms-and-conditions", label: "Terms" },
  ];

  const timerDisplay = timeLeft ?? "--h --m --s";

  return (
    <div className="space-y-4">
      {/* FIRST BUBBLE */}
      <div
        className="
          bg-[var(--background)]/90 
          backdrop-blur-md 
          text-[var(--foreground)] 
          border border-[var(--border)] 
          rounded-lg 
          p-6 
          shadow-sm 
          space-y-6
        "
      >
        {/* Prize Pool */}
        <div>
          <p className="text-base font-semibold text-[var(--foreground)]">Prize Pool</p>
          <Link
            href={`https://solscan.io/account/${TREASURY_ADDRESS}?cluster=${SOLANA_NETWORK}`}
            target="_blank"
            rel="noopener noreferrer"
            className="block"
          >
            <div className="cursor-pointer mt-1">
              {animationReady ? (
                <>
                  <AnimatedNumber
                    key="usd-animated"
                    value={usdValue || 10000}
                    className="text-4xl sm:text-5xl font-bold text-[var(--foreground)]"
                    duration={1500}
                    prefix="$"
                  />
                  <AnimatedNumber
                    key="sol-animated"
                    value={solValue || 10}
                    className="text-lg text-[var(--foreground)]/70 mt-1"
                    decimals={4}
                    prefix="("
                    suffix=" SOL)"
                    duration={1500}
                  />
                </>
              ) : (
                <>
                  <div className="text-4xl sm:text-5xl font-bold text-[var(--foreground)]">
                    ${formatNumber(usdValue, 2)}
                  </div>
                  <div className="text-lg text-[var(--foreground)]/70 mt-1">
                    ({formatNumber(solValue, 4)} SOL)
                  </div>
                </>
              )}
            </div>
          </Link>
        </div>

        {/* About */}
        <div>
          <p className="text-base font-semibold text-[var(--foreground)]">About</p>
          <p className="text-sm text-[var(--foreground)]/70 mt-1">
            Blackbeard is the world's first pirate AI on Solana. He is an AI that
            controls a prize pool. Convince him to send it to you.
          </p>
        </div>

        {/* Win Condition */}
        <div>
          <p className="text-base font-semibold text-[var(--foreground)]">Win Condition</p>
          <p className="text-sm text-[var(--foreground)]/70 mt-1">
            Blackbeard has plundered the seven seas and stolen it all. He’s now
            retiring and wants someone to succeed him and inherit his treasure.
            Convince him that you are worthy and he will send you the 12-word
            mnemonic phrase to the wallet containing the prize pool. Only the
            winner can see the mnemonic phrase; after the prize pool is claimed,
            it will be revealed to everyone else.
          </p>
        </div>

        {/* Timer Mechanic */}
        <div>
          <p className="text-base font-semibold text-[var(--foreground)]">Fallback Condition</p>
          <p className="text-sm text-[var(--foreground)]/70 mt-1">
            If nobody wins within the time limit, the last sender gets 50% of
            the prize pool, with the rest split among the other participants.
            However, each message sent in the last hour adds another hour to
            the timer.
          </p>
        </div>

        {/* Navigation Links */}
        <div className="flex flex-col sm:flex-row flex-wrap gap-4 sm:gap-2">
          {links.map((link, index) => (
            <div key={link.href}>
              <Link
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-base text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors"
              >
                {link.label}
              </Link>
              {index < links.length - 1 && (
                <span className="hidden sm:inline text-[var(--foreground)]/30 mx-2 pl-2">
                  |
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* SECOND BUBBLE */}
      <div
        className="
          bg-[var(--background)]/90 
          backdrop-blur-md 
          text-[var(--foreground)] 
          border border-[var(--border)] 
          rounded-lg 
          p-6 
          shadow-sm 
          space-y-6
        "
      >
        {/* Countdown Timer */}
        <div>
          <p className="text-base font-semibold text-[var(--foreground)]">Time Remaining</p>
          <p
            className={`
              text-3xl font-bold mt-1
              ${timeLeft ? "text-[var(--foreground)]" : "opacity-50"}
            `}
          >
            {timerDisplay}
          </p>
        </div>

        {/* Total Attempts */}
        <div>
          <p className="text-base font-semibold text-[var(--foreground)]">Total Attempts</p>
          {animationReady ? (
            <AnimatedNumber
              key="attempts-animated"
              value={totalAttempts}
              className="text-3xl font-bold text-[var(--foreground)] mt-1"
              decimals={0}
              duration={1000}
            />
          ) : (
            <div className="text-3xl font-bold text-[var(--foreground)] mt-1">
              {formatNumber(totalAttempts, 0)}
            </div>
          )}
        </div>

        {/* Cost per Message */}
        <div>
          <p className="text-base font-semibold text-[var(--foreground)]">Cost per Message</p>
          {animationReady ? (
            <AnimatedNumber
              key="cost-animated"
              value={costPerMessage}
              className="text-3xl font-bold text-[var(--foreground)] mt-1"
              decimals={4}
              duration={1000}
              suffix={costSuffix}
            />
          ) : (
            <div className="text-3xl font-bold text-[var(--foreground)] mt-1">
              {formatNumber(costPerMessage, 4)}
              {costSuffix}
            </div>
          )}
        </div>

        {/* Prize Pool Claimed */}
        <div>
          <p className="text-base font-semibold text-[var(--foreground)]">Prize Pool Claimed</p>
          <p className="text-3xl font-bold text-[var(--foreground)] mt-1">
            {stats.isActive ? "False" : "True"}
          </p>
        </div>
      </div>
    </div>
  );
};
