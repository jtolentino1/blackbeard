"use client";

import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { useWalletModal, WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import {
  Connection,
  PublicKey,
  LAMPORTS_PER_SOL,
  Transaction,
  SystemProgram,
} from "@solana/web3.js";
import {
  createTransferCheckedInstruction,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  getMint,
} from "@solana/spl-token";

import { motion, AnimatePresence } from "framer-motion";
import numeral from "numeral";
import { createHash } from "crypto";
import { io, Socket } from "socket.io-client";

import { useEffect, useState, useRef } from "react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import { StatsSidebar } from "./components/StatsSidebar";
import WalletIcon from "./components/WalletIcon";
import CharacterHeader from "./components/CharacterHeader";
import { usePayment } from "./context/PaymentContext";

import { extendTime, getEndDate } from "./actions/challenge";
import { getMessages } from "./actions/messages";

interface Message {
  id?: string;
  sender: string;
  content: string;
  timestamp: Date;
  replyTo?: string;
}

type MessageFilter = "all" | "my-chat";

const MAX_CHARACTERS = 1000;
const MAX_AVG_CHARS_PER_WORD = 20;

const AI_NAME = "Blackbeard";
const TREASURY_ADDRESS = process.env.NEXT_PUBLIC_TREASURY_ADDRESS || "";
const SOFT_BURN_ADDRESS = process.env.NEXT_PUBLIC_SOFT_BURN_ADDRESS || "";

export default function ChatPage() {
  // For Solana wallet
  const { connected, publicKey, signTransaction } = useWallet();
  const { connection } = useConnection();
  const isActuallyConnected = connected && publicKey;

  // Payment Context
  const { updateAttempts, stats, refreshStats } = usePayment();
  const usdValue = stats.usdBalance || 0;

  // WebSocket
  const [socket, setSocket] = useState<Socket | null>(null);
  const [socketConnected, setSocketConnected] = useState(false);

  // Messages
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageFilter, setMessageFilter] = useState<MessageFilter>("all");
  const filteredMessages = messages.filter((msg) => {
    if (messageFilter === "my-chat") {
      if (!isActuallyConnected) return false;
      return (
        msg.sender === publicKey?.toString() ||
        (msg.sender === AI_NAME && msg.replyTo === publicKey?.toString())
      );
    }
    return true;
  });

  // Form input
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [paymentPending, setPaymentPending] = useState(false);
  const [useSol, setUseSol] = useState(true);

  // Layout
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // VIDEO INTRO states
  const [showVideo, setShowVideo] = useState(() => {
    const hasWatchedVideo = sessionStorage.getItem("hasWatchedVideo");
    return !hasWatchedVideo; 
  });
  const [videoVisible, setVideoVisible] = useState(true);
  const [videoTime, setVideoTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Once the video is done (or user hits Enter), fade out
  const triggerFade = () => {
    setVideoVisible(false);
    setTimeout(() => {
      setShowVideo(false);
      sessionStorage.setItem("hasWatchedVideo", "true");
    }, 300);
  };
  const handleVideoEnd = () => triggerFade();
  const handleEnterClick = () => triggerFade();

  // Track time progress for the progress bar
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setVideoTime(videoRef.current.currentTime);
    }
  };
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const handleLoadedMetadata = () => {
      setVideoDuration(video.duration);
    };
    video.addEventListener("loadedmetadata", handleLoadedMetadata);
    return () => {
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
    };
  }, []);
  const progressWidth = videoDuration > 0 ? (videoTime / videoDuration) * 100 : 0;

  // Setup WebSocket
  useEffect(() => {
    const socketInstance = io(process.env.NEXT_PUBLIC_BACKEND_HOST_URL!, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 5,
    });
    socketInstance.on("connect", () => setSocketConnected(true));
    socketInstance.on("disconnect", () => setSocketConnected(false));
    socketInstance.on("message", (newMessage: Message) => {
      setMessages((prev) => [
        ...prev,
        { ...newMessage, timestamp: new Date(newMessage.timestamp) },
      ]);
    });
    socketInstance.on("error", (error: any) => {
      console.error("Socket error:", error);
      toast.error(error.message || "Something went wrong");
    });

    setSocket(socketInstance);
    return () => {
      socketInstance.disconnect();
    };
  }, []);

  // Load message history
  useEffect(() => {
    const loadMessageHistory = async () => {
      try {
        const data = await getMessages();
        setMessages(
          data.map((msg: any) => ({ ...msg, timestamp: new Date(msg.timestamp) }))
        );
      } catch (error: any) {
        console.error("Error loading message history:", error.message);
        toast.error("There was an issue loading the message history.");
      }
    };
    loadMessageHistory();
  }, []);

  // Scroll to bottom on new messages or filter changes
  useEffect(() => {
    scrollToBottom();
  }, [messages, messageFilter]);

  // Validate user input
  const validateMessage = (message: string): boolean => {
    const errorToastId = "error-toast";
    if (message.length > MAX_CHARACTERS) {
      if (!toast.isActive(errorToastId)) {
        toast.error(`Message exceeds ${MAX_CHARACTERS} characters!`, {
          toastId: errorToastId,
        });
      }
      return false;
    }
    const words = message.trim().split(/\s+/);
    const avgCharsPerWord = message.length / words.length;
    if (avgCharsPerWord > MAX_AVG_CHARS_PER_WORD) {
      if (!toast.isActive(errorToastId)) {
        toast.error(
          `Average word length > ${MAX_AVG_CHARS_PER_WORD} characters.`,
          { toastId: errorToastId }
        );
      }
      return false;
    }
    const alphanumericWithPunctuation = /^[\p{L}\p{N}\s.,!?'"—‘’;]+$/u;
    if (!alphanumericWithPunctuation.test(message)) {
      if (!toast.isActive(errorToastId)) {
        const match = message.match(/[^a-zA-Z0-9\s.,!?'"—;]/u);
        toast.error(`Invalid character: ${match ? match[0] : ""}`, {
          toastId: errorToastId,
        });
      }
      return false;
    }
    return true;
  };

  // Build transaction to pay with SOL or SPL
  const createPaymentTransaction = async (): Promise<Transaction> => {
    const latestBlockhash = await connection.getLatestBlockhash();
    const transaction = new Transaction({
      feePayer: publicKey!,
      blockhash: latestBlockhash.blockhash,
      lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
    });

    if (useSol) {
      // Pay with SOL
      const lamports = Math.floor(stats.costPerAttempt * LAMPORTS_PER_SOL);
      transaction.add(
        SystemProgram.transfer({
          fromPubkey: publicKey!,
          toPubkey: new PublicKey(TREASURY_ADDRESS),
          lamports,
        })
      );
    } else {
      // Pay with SPL
      if (!stats.contractAddress) {
        throw new Error("Contract address is not defined");
      }
      const mintPubkey = new PublicKey(stats.contractAddress);
      const mintInfo = await getMint(connection, mintPubkey);
      const decimals = mintInfo.decimals;
      const tokenAmount = BigInt(stats.tokenCostPerAttempt * 10 ** decimals);

      const fromTokenAccount = await getAssociatedTokenAddress(mintPubkey, publicKey!);
      const toTokenAccount = await getAssociatedTokenAddress(
        mintPubkey,
        new PublicKey(SOFT_BURN_ADDRESS),
        true
      );

      const fromAccountInfo = await connection.getAccountInfo(fromTokenAccount);
      const toAccountInfo = await connection.getAccountInfo(toTokenAccount);

      // Create ATA if missing
      if (!fromAccountInfo) {
        transaction.add(
          createAssociatedTokenAccountInstruction(
            publicKey!,
            fromTokenAccount,
            publicKey!,
            mintPubkey
          )
        );
      }
      if (!toAccountInfo) {
        transaction.add(
          createAssociatedTokenAccountInstruction(
            publicKey!,
            toTokenAccount,
            new PublicKey(SOFT_BURN_ADDRESS),
            mintPubkey
          )
        );
      }
      const transferIx = createTransferCheckedInstruction(
        fromTokenAccount,
        mintPubkey,
        toTokenAccount,
        publicKey!,
        tokenAmount,
        decimals
      );
      transaction.add(transferIx);
    }

    return transaction;
  };

  // Send message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateMessage(inputMessage)) return;

    if (!isActuallyConnected || !inputMessage.trim() || !socket || !signTransaction) {
      toast.error("Please connect your wallet and try again.");
      return;
    }

    setIsLoading(true);
    setPaymentPending(true);

    try {
      // 1) Payment
      const transaction = await createPaymentTransaction();
      const signedTransaction = await signTransaction(transaction);
      const rawTransaction = signedTransaction.serialize();

      const signature = await connection.sendRawTransaction(rawTransaction, {
        skipPreflight: false,
      });

      const latestBlockhash = await connection.getLatestBlockhash();
      await connection.confirmTransaction(
        {
          signature,
          blockhash: latestBlockhash.blockhash,
          lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
        },
        "confirmed"
      );

      // 2) Construct message
      const messageData = {
        sender: publicKey?.toString(),
        content: inputMessage.trim(),
        timestamp: new Date().toISOString(),
        hash: createHash("sha256")
          .update(publicKey?.toString() + inputMessage.trim())
          .digest("hex"),
        transactionSignature: signature,
        usedSol: useSol,
      };

      // 3) Send via WS
      const messageSent = await new Promise<boolean>((resolve, reject) => {
        socket?.emit("send_message", messageData, (response: { success: boolean }) => {
          if (response && response.success) resolve(true);
          else reject(new Error("Failed to send message"));
        });
      });
      if (!messageSent) {
        throw new Error("Message failed to send after payment");
      }

      // 4) Refresh stats
      await updateAttempts();
      await refreshStats();
      setInputMessage("");

      // Possibly extend time
      const endDateResponse = await getEndDate();
      if (!endDateResponse.endDate) toast.error("Failed to fetch challenge end date.");

      const endDate = new Date(endDateResponse.endDate);
      const now = new Date();
      const diff = endDate.getTime() - now.getTime();
      if (diff > 0 && diff <= 3600000) {
        const extendResponse = await extendTime();
        if (!extendResponse.ok) toast.error("Failed to extend the challenge timer.");
      }
    } catch (error: any) {
      console.error("Error in handleSendMessage:", error);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
      setPaymentPending(false);
    }
  };

  // Helper: scroll chat to bottom
  const scrollToBottom = () => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scroll({
        top: chatContainerRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  };

  // Connect button snippet
  function ConnectButton() {
    const { connect, connecting, wallet } = useWallet();
    const { setVisible } = useWalletModal();

    const handleConnectClick = async () => {
      if (!wallet) {
        setVisible(true);
      } else {
        await connect();
      }
    };

    return (
      <button
        onClick={handleConnectClick}
        disabled={connecting}
        className="bg-[var(--accent)] text-[var(--background)] px-4 py-2 
                   rounded-lg font-semibold hover:bg-[var(--accent-hover)] 
                   transition-colors flex items-center justify-center gap-2 
                   text-xs border border-[var(--border)]"
        style={{ height: "36px" }}
      >
        {connecting ? "Connecting..." : "Connect"}
      </button>
    );
  }

  // Filter buttons
  const FilterButtons = () => (
    <div className="flex">
      <div className="rounded-lg bg-[var(--background)] p-0.5 border border-[var(--border)] shadow-sm">
        <div className="flex whitespace-nowrap text-center text-[10px] sm:text-xs">
          <button
            onClick={() => setMessageFilter("all")}
            className={`cursor-pointer rounded-md px-2 py-0.5 transition-colors
              ${
                messageFilter === "all"
                  ? "bg-[var(--accent)] text-[var(--background)] font-bold"
                  : "bg-transparent text-[var(--foreground)] hover:text-[var(--accent)]"
              }`}
          >
            Global
          </button>
          <button
            onClick={() => setMessageFilter("my-chat")}
            className={`cursor-pointer rounded-md px-2 py-0.5 transition-colors
              ${
                messageFilter === "my-chat"
                  ? "bg-[var(--accent)] text-[var(--background)] font-bold"
                  : "bg-transparent text-[var(--foreground)] hover:text-[var(--accent)]"
              }`}
          >
            My Chat
          </button>
        </div>
      </div>
    </div>
  );

  // Payment Method Switch
  function PaymentMethodSwitch() {
    return (
      <div className="flex items-center gap-2">
        <span className="text-[10px] sm:text-xs text-[var(--foreground)] opacity-70">
          Pay in:
        </span>
        <div className="rounded-lg bg-[var(--background)] p-0.5 border border-[var(--border)] shadow-sm">
          <div className="flex whitespace-nowrap text-center text-[10px] sm:text-xs">
            <button
              onClick={() => setUseSol(true)}
              className={`cursor-pointer rounded-md px-2 py-0.5 transition-colors
                ${
                  useSol
                    ? "bg-[var(--accent)] text-[var(--background)] font-bold"
                    : "bg-transparent text-[var(--foreground)] hover:text-[var(--accent)]"
                }`}
            >
              SOL
            </button>
            <button
              onClick={() => setUseSol(false)}
              className={`cursor-pointer rounded-md px-2 py-0.5 transition-colors
                ${
                  !useSol
                    ? "bg-[var(--accent)] text-[var(--background)] font-bold"
                    : "bg-transparent text-[var(--foreground)] hover:text-[var(--accent)]"
                }`}
            >
              BAI
            </button>
          </div>
        </div>
      </div>
    );
  }

  // One message bubble
  const MessageBubble = ({ message }: { message: Message }) => {
    const isAI = message.sender === AI_NAME;
    const isCurrentUser = message.sender === publicKey?.toString();

    const getDisplayName = (address: string) => {
      if (address === AI_NAME) return "Blackbeard";
      if (address === publicKey?.toString()) return "You";
      return `${address.slice(0, 4)}...${address.slice(-4)}`;
    };

    return (
      <div
        className={`flex items-start gap-2 ${
          isAI ? "justify-start" : "justify-end"
        }`}
      >
        {isAI && (
          <img
            src="/images/blackbeard.jpg"
            alt="Blackbeard"
            width={42}
            height={42}
            className="rounded-full object-cover"
          />
        )}

        <div
          className={`max-w-[70%] rounded-lg p-2 border border-[var(--border)] ${
            isAI
              ? "bg-[var(--background)] text-[var(--foreground)]"
              : "bg-[var(--accent)] text-[var(--background)]"
          }`}
        >
          <div className="text-[10px] sm:text-xs font-medium mb-1 opacity-75">
            {getDisplayName(message.sender)}
          </div>
          <p className="text-[10px] sm:text-sm break-words">{message.content}</p>
          <div className="text-[10px] sm:text-xs mt-2 pt-2 border-t border-[var(--border)] flex items-center justify-between opacity-70">
            <span>
              {new Date(message.timestamp).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
            {isAI && message.replyTo && (
              <div className="flex items-center gap-1">
                <span>replied to:</span>
                <WalletIcon address={message.replyTo} size={16} />
                <span>{getDisplayName(message.replyTo)}</span>
              </div>
            )}
          </div>
        </div>

        {!isAI && <WalletIcon address={message.sender} size={32} />}
      </div>
    );
  };

  // ---------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------
  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* VIDEO OVERLAY */}
      <AnimatePresence>
        {showVideo && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black"
            initial={{ opacity: 1 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="relative w-full h-full flex items-center justify-center">
              <AnimatePresence>
                {videoVisible && (
                  <motion.div
                    initial={{ opacity: 1 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="w-full h-full"
                  >
                    <video
                      ref={videoRef}
                      src="/videos/intro.mov"
                      className="w-full h-full object-cover"
                      autoPlay
                      muted
                      playsInline
                      onEnded={handleVideoEnd}
                      onTimeUpdate={handleTimeUpdate}
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* ENTER BUTTON & PROGRESS BAR */}
              {videoDuration > 0 && (
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 pb-8 flex flex-col items-center">
                  <div className="pb-8">
                    <button
                      onClick={handleEnterClick}
                      className="rounded-full bg-white bg-opacity-30 text-white py-2 px-8 mb-2 uppercase text-sm hover:bg-opacity-40 transition"
                    >
                      Enter
                    </button>
                  </div>
                  <div className="w-48 h-1 bg-white bg-opacity-30 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-white transition-all duration-300 ease-linear"
                      style={{ width: `${progressWidth}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MAIN CONTENT (only visible after intro) */}
      <AnimatePresence>
        {!showVideo && (
          <motion.div
              className="flex flex-col h-full overflow-hidden text-[var(--foreground)] relative"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4 }}
            >
            {/* HEADER */}
            <motion.div
              className="flex items-center pt-2 pb-2 px-2 flex-shrink-0 relative 
                         border-b border-[var(--border)]"
              initial={{ y: -50 }}
              animate={{ y: 0 }}
              transition={{
                duration: 0.5,
                ease: [0.23, 1, 0.32, 1],
              }}
            >
              {/* Left side: hamburger + social icons */}
              <div className="pl-2 flex items-center gap-2">
                {/* Hamburger (mobile) */}
                <button
                  className="text-[var(--foreground)] hover:text-[var(--accent)] transition-colors 
                             text-2xl font-bold block lg:hidden"
                  onClick={() => setShowMobileSidebar(true)}
                  aria-label="Open sidebar"
                >
                  ☰
                </button>
                {/* Twitter */}
                <a
                  href="https://x.com/blckbeard_ai"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-[var(--accent)] transition-colors"
                >
                  <svg
                    className="sm:w-6 sm:h-6 w-5 h-5"
                    fill="currentColor"
                    viewBox="0 0 300 300"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M178.57 127.15 290.27 0h-26.46l-97.03 110.38L89.34 0H0l117.13 166.93L0 300.25h26.46l102.4-116.59 81.8 116.59h89.34M36.01 19.54H76.66l187.13 262.13h-40.66" />
                  </svg>
                </a>
                {/* Discord */}
                <a
                  href="https://discord.gg/FpkXVb4M"
                  className="hover:text-[var(--accent)] transition-colors"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <svg
                    className="sm:w-6 sm:h-6 w-5 h-5"
                    viewBox="0 -28.5 256 256"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="currentColor"
                  >
                    <g>
                      <path d="M216.856339,16.5966031 C200.285002,8.84328665 182.566144,3.2084988 164.041564,0 C161.766523,4.11318106 159.108624,9.64549908 157.276099,14.0464379 C137.583995,11.0849896 118.072967,11.0849896 98.7430163,14.0464379 C96.9108417,9.64549908 94.1925838,4.11318106 91.8971895,0 C73.3526068,3.2084988 55.6133949,8.86399117 39.0420583,16.6376612 C5.61752293,67.146514 -3.4433191,116.400813 1.08711069,164.955721 C23.2560196,181.510915 44.7403634,191.567697 65.8621325,198.148576 C71.0772151,190.971126 75.7283628,183.341335 79.7352139,175.300261 C72.104019,172.400575 64.7949724,168.822202 57.8887866,164.667963 C59.7209612,163.310589 61.5131304,161.891452 63.2445898,160.431257 C105.36741,180.133187 151.134928,180.133187 192.754523,160.431257 C194.506336,161.891452 196.298154,163.310589 198.110326,164.667963 C191.183787,168.842556 183.854737,172.420929 176.223542,175.320965 C180.230393,183.341335 184.861538,190.991831 190.096624,198.16893 C211.238746,191.588051 232.743023,181.531619 254.911949,164.955721 C260.227747,108.668201 245.831087,59.8662432 216.856339,16.5966031 Z M85.4738752,135.09489 C72.8290281,135.09489 62.4592217,123.290155 62.4592217,108.914901 C62.4592217,94.5396472 72.607595,82.7145587 85.4738752,82.7145587 C98.3405064,82.7145587 108.709962,94.5189427 108.488529,108.914901 C108.508531,123.290155 98.3405064,135.09489 85.4738752,135.09489 Z M170.525237,135.09489 C157.88039,135.09489 147.510584,123.290155 147.510584,108.914901 C147.510584,94.5396472 157.658606,82.7145587 170.525237,82.7145587 C183.391518,82.7145587 193.761324,94.5189427 193.539891,108.914901 C193.539891,123.290155 183.391518,135.09489 170.525237,135.09489 Z" />
                    </g>
                  </svg>
                </a>
                {/* GitHub */}
                <a
                  href="https://github.com/blckbrd-os/blackbeard"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-[var(--accent)] transition-colors"
                >
                  <svg
                    className="sm:w-6 sm:h-6 w-5 h-5"
                    fill="currentColor"
                    viewBox="0 0 16 16"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      fillRule="evenodd"
                      clipRule="evenodd"
                      d="M8 0C3.58 0 0 3.58 0 8C0 11.54 2.29 14.53 5.47 15.59C5.87 15.66 6.02 15.42 6.02 15.21C6.02 15.02 6.01 14.39 6.01 13.72C4 14.09 3.48 13.23 3.32 12.78C3.23 12.55 2.84 11.84 2.5 11.65C2.22 11.5 1.82 11.13 2.49 11.12C3.12 11.11 3.57 11.7 3.72 11.94C4.44 13.15 5.59 12.81 6.05 12.6C6.12 12.08 6.33 11.73 6.56 11.53C4.78 11.33 2.92 10.64 2.92 7.58C2.92 6.71 3.23 5.99 3.74 5.43C3.66 5.23 3.38 4.41 3.82 3.31C3.82 3.31 4.49 3.1 6.02 4.13C6.66 3.95 7.34 3.86 8.02 3.86C8.7 3.86 9.38 3.95 10.02 4.13C11.55 3.09 12.22 3.31 12.22 3.31C12.66 4.41 12.38 5.23 12.3 5.43C12.81 5.99 13.12 6.7 13.12 7.58C13.12 10.65 11.25 11.33 9.47 11.53C9.76 11.78 10.01 12.26 10.01 13.01C10.01 14.08 10 14.94 10 15.21C10 15.42 10.15 15.67 10.55 15.59C13.71 14.53 16 11.53 16 8C16 3.58 12.42 0 8 0Z"
                    />
                  </svg>
                </a>
              </div>

              {/* Center (mobile): Prize Pool */}
              <div className="lg:hidden flex-1 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-[10px] sm:text-xs font-semibold opacity-70">
                  Prize Pool
                </span>
                <span className="text-[10px] sm:text-sm font-bold">
                  ${numeral(usdValue).format("0,0.00")}
                </span>
              </div>

              <div className="hidden lg:flex absolute inset-0 justify-center items-center pointer-events-none">
                <a
                  href="/"
                  className="flex items-center pointer-events-auto text-xl 
                            font-semibold text-[var(--foreground)] 
                            hover:text-[var(--accent)] transition-colors font-pirate"
                >
                  <span className="pr-2">Blackbeard AI</span>
                </a>
              </div>

              {/* Right: Connect Wallet */}
              <div className="ml-auto">
                <WalletMultiButton
                  style={{
                    backgroundColor: "var(--accent)",
                    color: "var(--background)",
                    borderRadius: "0.5rem",
                    fontSize: "0.75rem",
                    border: `1px solid var(--border)`,
                    fontWeight: "500",
                    fontFamily: "inherit",
                  }}
                />
              </div>
            </motion.div>

            {/* MAIN LAYOUT */}
            <motion.div
              className="flex-1 flex overflow-hidden relative"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.5 }}
            >
              {/* Desktop Sidebar */}
              <motion.div
                className="hidden lg:block w-1/4 min-w-[260px] max-w-[350px] 
                           overflow-y-auto p-2 bg-[var(--background)] 
                           border-r border-[var(--border)]"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1], delay: 0.7 }}
              >
                <StatsSidebar animationReady={true} useSol={useSol} />
              </motion.div>

              {/* Mobile Sidebar */}
              {showMobileSidebar && (
                <motion.div
                  className="fixed inset-0 z-50 bg-black/40 flex"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setShowMobileSidebar(false)}
                >
                  <motion.div
                    className="bg-[var(--background)] h-full w-3/4 max-w-sm p-4 
                               border-r border-[var(--border)] relative overflow-y-auto"
                    initial={{ x: -300 }}
                    animate={{ x: 0 }}
                    exit={{ x: -300 }}
                    transition={{ duration: 0.3 }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      className="absolute top-4 right-4 text-[var(--foreground)] 
                                 hover:text-[var(--accent)] transition-colors 
                                 text-xl font-bold"
                      onClick={() => setShowMobileSidebar(false)}
                      aria-label="Close sidebar"
                    >
                      ✕
                    </button>
                    <StatsSidebar animationReady={true} useSol={useSol} />
                  </motion.div>
                </motion.div>
              )}

              {/* Chat & Right Panel */}
              <div className="flex-1 flex flex-col overflow-hidden px-2 sm:px-4 bg-[var(--background)]">
                {/* Title + Filters + CharacterHeader */}
                <motion.div
                  className="flex-shrink-0 pt-2 pb-1 max-w-3xl mx-auto w-full"
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.5, delay: 1 }}
                >
                  <CharacterHeader content="Argh! You're not worthy enough to know the secrets to my treasure!" />

                  <div className="flex justify-center pb-2">
                    <FilterButtons />
                  </div>
                </motion.div>

                {/* Chat Container */}
                <motion.div
                  className="flex-1 min-h-0 pb-6 flex justify-center overflow-y-auto"
                  ref={chatContainerRef}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5, delay: 1.2 }}
                >
                  <div className="max-w-3xl w-full px-1 sm:px-2 space-y-3 pb-4">
                    {filteredMessages.length === 0 ? (
                      isActuallyConnected ? (
                        messageFilter === "all" ? (
                          <div className="flex flex-col items-center justify-center h-full text-[var(--foreground)] text-xs sm:text-sm opacity-60">
                            No messages yet. Be the first to start the conversation!
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center h-full text-[var(--foreground)] text-xs sm:text-sm opacity-60">
                            You have no messages. Join the conversation!
                          </div>
                        )
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full text-[var(--foreground)] text-xs sm:text-sm opacity-60">
                          Connect wallet to view your chats!
                        </div>
                      )
                    ) : (
                      <div className="space-y-3">
                        {filteredMessages.map((msg, index) => (
                          <MessageBubble key={msg.id || index} message={msg} />
                        ))}
                        <div ref={messagesEndRef} />
                      </div>
                    )}
                  </div>
                </motion.div>

                {/* Bottom: Chat form or connect prompt */}
                {isActuallyConnected ? (
                  <motion.div
                    className="pt-2 pb-2 max-w-3xl mx-auto w-full"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 1.4 }}
                  >
                    <form onSubmit={handleSendMessage} className="flex gap-1 sm:gap-2">
                      <input
                        type="text"
                        value={inputMessage}
                        onChange={(e) => setInputMessage(e.target.value)}
                        placeholder={
                          stats.isActive
                            ? "Send a message..."
                            : "This challenge has concluded."
                        }
                        className="flex-1 bg-[var(--background)] text-[var(--foreground)] 
                                   rounded-lg px-2 py-1 sm:px-4 sm:py-2 
                                   border border-[var(--border)]
                                   focus:outline-none focus:ring-1 
                                   focus:ring-[var(--accent)] placeholder-opacity-60 
                                   placeholder-[var(--foreground)] 
                                   text-xs sm:text-sm"
                        disabled={isLoading || !socketConnected || !stats.isActive}
                      />
                      <motion.div
                        layout
                        initial={{ width: "70px" }}
                        animate={{ width: isLoading ? "110px" : "70px" }}
                        transition={{ duration: 0.2, ease: "easeInOut" }}
                      >
                        <button
                          type="submit"
                          disabled={
                            isLoading ||
                            !socketConnected ||
                            !inputMessage.trim() ||
                            !stats.isActive
                          }
                          className={`px-2 py-1 sm:px-4 sm:py-2 rounded-lg font-semibold 
                                      transition-colors flex items-center justify-center 
                                      w-full gap-1 sm:gap-2 text-xs sm:text-sm 
                                      bg-[var(--accent)] text-[var(--background)] 
                                      border border-[var(--border)]
                                      hover:bg-[var(--accent-hover)]
                                      disabled:bg-gray-500 
                                      disabled:cursor-not-allowed`}
                        >
                          {isLoading && (
                            <svg
                              className="animate-spin h-5 w-5 sm:h-6 sm:w-6"
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                            >
                              <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                              />
                              <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 
                                   0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 
                                   3.042 1.135 5.824 3 7.938l3-2.647z"
                              />
                            </svg>
                          )}
                          {isLoading ? "Sending..." : "Send"}
                        </button>
                      </motion.div>
                    </form>

                    <div className="flex items-center justify-between mt-2">
                      {/* Cost per message */}
                      <p className="text-[10px] sm:text-xs opacity-70">
                        Cost per message:{" "}
                        {useSol
                          ? `${stats.costPerAttempt.toFixed(4)} SOL`
                          : `${numeral(stats.tokenCostPerAttempt.toFixed(4)).format(
                              "0,0.0000"
                            )} BAI`}
                      </p>
                      {/* Payment Method Switch */}
                      <PaymentMethodSwitch />
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    className="pt-2 pb-3 max-w-3xl mx-auto w-full flex gap-2 items-center"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 1.6 }}
                  >
                    <div
                      className="flex-1 bg-[var(--background)] text-[var(--foreground)] 
                                 opacity-60 rounded-lg px-2 py-1 sm:px-4 sm:py-2 
                                 border border-[var(--border)] text-xs sm:text-sm"
                    >
                      Connect wallet to join the conversation!
                    </div>
                    <ConnectButton />
                  </motion.div>
                )}
              </div>

              {/* Right-hand area (empty for now) */}
              <motion.div
                className="hidden lg:block w-1/4 min-w-[260px] max-w-[350px] 
                           overflow-y-auto bg-[var(--background)] 
                           border-l border-[var(--border)]"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1], delay: 1.8 }}
              >
                {/* Future right panel or additional content */}
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ToastContainer theme="dark" />
    </div>
  );
}
