import React, { useState, useEffect, cloneElement, forwardRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Users, Plus, ArrowRight, X, Clock, Check, Wallet, ChevronLeft, ChevronRight } from 'lucide-react';
import defaultAvatar from '../assets/default-avatar.png';
import logo from '../assets/logo.webp';
import { connect, disconnect } from "starknetkit";
import { StarknetWindowObject } from "get-starknet-core";
import Background from '../assets/background.svg';
import BackgroundNoSky from '../assets/backgroundnosky.webp';
import { BackgroundStars } from './Background.tsx';

// Role card imports
import villagerCard from '../assets/cards/villager.webp';
import werewolfCard from '../assets/cards/werewolf.webp';
import seerCard from '../assets/cards/seer.webp';
import hunterCard from '../assets/cards/hunter.webp';
import cupidCard from '../assets/cards/cupid.webp';
import witchCard from '../assets/cards/witch.webp';
import guardCard from '../assets/cards/guard.webp';

interface LobbyProps {
  onJoinGame: (gameId: string) => void;
}

interface Player {
  id: string;
  name: string;
  avatar: string;
  isReady: boolean;
}

interface Role {
  image: string;
  name: string;
  description: string;
}

// Header Component
const Header = () => {
  const [connection, setConnection] = useState<StarknetWindowObject>();
  const [address, setAddress] = useState<string>();

  useEffect(() => {
    const connectToStarknet = async () => {
      const { wallet } = await connect({ modalMode: "neverAsk" });
      if (wallet && wallet.isConnected) {
        setConnection(wallet);
        setAddress(wallet.selectedAddress);
      }
    };
    connectToStarknet();
  }, []);

  const connectWallet = async () => {
    const { wallet } = await connect();
    if (wallet) {
      setConnection(wallet);
      setAddress(wallet.selectedAddress);
    }
  };

  const disconnectWallet = async () => {
    await disconnect();
    setConnection(undefined);
    setAddress(undefined);
  };

  useEffect(() => {
    const handleAccountsChange = (accounts?: string[]) => {
      if (accounts && accounts.length > 0) {
        setAddress(accounts[0]);
      } else {
        setAddress(undefined);
      }
    };
    connection?.on("accountsChanged", handleAccountsChange);
    return () => connection?.off("accountsChanged", handleAccountsChange);
  }, [connection]);

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-gray-900/20 backdrop-blur-md border-b border-gray-700/30">
      <div className="container mx-auto max-w-7xl py-4 px-4 flex items-center justify-between">
        <img src={logo} alt="StarkWolf Logo" className="h-10 w-auto object-contain" />
        <button
          onClick={address ? disconnectWallet : connectWallet}
          className="bg-gradient-to-r from-red-900 to-red-800 hover:from-red-800 hover:to-red-700 text-gray-100 font-semibold rounded-lg px-6 py-2 flex items-center gap-2 transition-all shadow-lg shadow-red-900/50"
        >
          <Wallet size={20} />
          {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'Connect Wallet'}
        </button>
      </div>
    </div>
  );
};

// GameCard Component
const GameCard = ({ title, players, maxPlayers, onClick }: { title: string; players: number; maxPlayers: number; onClick: () => void }) => (
  <motion.div
    whileHover={{ scale: 1.03, boxShadow: '0 0 15px rgba(153, 27, 27, 0.3)' }}
    onClick={onClick}
    className="bg-gray-950/80 rounded-xl p-6 transition-all cursor-pointer border border-red-900/40 hover:border-red-800/60 group relative overflow-hidden backdrop-blur-md"
  >
    <div className="absolute inset-0 bg-gradient-to-br from-red-950/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
    <h3 className="text-2xl font-serif font-bold text-red-300 group-hover:text-red-800 transition-colors relative z-10">{title}</h3>
    <div className="flex items-center text-gray-300 mt-2 relative z-10">
      <Users size={18} className="mr-2 text-red-400" />
      <span className="text-lg">{players}/{maxPlayers} Souls</span>
    </div>
  </motion.div>
);

const CreateGamePopup = ({
  onClose,
  gameCode,
  players,
  onStartGame,
}: {
  onClose: () => void;
  gameCode: string;
  players: Player[];
  onStartGame: (code: string, maxPlayers: number) => void;
}) => {
  const [timeLeft, setTimeLeft] = useState(300);
  const [maxPlayers, setMaxPlayers] = useState(8);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev <= 0 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 backdrop-blur-xl flex items-center justify-center p-4 z-[60]"
      style={{ top: '1.5rem' }}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-gradient-to-b from-gray-950 to-gray-900 border border-red-900/30 rounded-xl p-6 w-full max-w-sm shadow-xl shadow-red-900/20"
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-serif text-red-400">Summon a Hunt</h2>
          <button 
            onClick={onClose} 
            className="text-gray-300 hover:text-gray-200 transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        <div className="space-y-4">
          <div className="bg-gray-900/50 rounded-lg p-3 border border-red-900/20">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-300">Hunt Code:</span>
              <span className="text-lg font-mono font-bold text-red-400">{gameCode}</span>
            </div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-300">Souls:</span>
              <div className="flex items-center gap-3 text-red-400">
                <button 
                  onClick={() => setMaxPlayers(prev => Math.max(6, prev - 1))}
                  className="p-1 hover:bg-gray-800/20 rounded transition-colors"
                >
                  -
                </button>
                <span className="text-lg font-bold w-6 text-center">{maxPlayers}</span>
                <button 
                  onClick={() => setMaxPlayers(prev => Math.min(10, prev + 1))}
                  className="p-1 hover:bg-gray-800/20 rounded transition-colors"
                >
                  +
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Clock size={14} className="text-red-400" />
              <span className="text-gray-300 text-sm">{`${minutes}:${seconds.toString().padStart(2, '0')}`}</span>
            </div>
          </div>
          <div className="space-y-3">
            <h3 className="text-md font-serif text-red-300">Hunters ({players.length}/{maxPlayers})</h3>
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {[...players, ...Array(maxPlayers - players.length)].map((player, index) => (
                <div
                  key={player?.id || `empty-${index}`}
                  className="bg-gray-900/30 rounded-md p-2 border border-red-900/20 flex items-center gap-2"
                >
                  {player ? (
                    <>
                      <img 
                        src={player.avatar || defaultAvatar} 
                        alt={player.name} 
                        className="w-6 h-6 rounded-full border border-red-900/30" 
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-200 truncate">{player.name}</p>
                        <p className="text-xs text-gray-400">{player.isReady ? 'Prepared' : 'Awaiting...'}</p>
                      </div>
                      {player.isReady && <Check size={14} className="text-green-400 shrink-0" />}
                    </>
                  ) : (
                    <div className="flex items-center justify-center w-full text-xs text-gray-500">
                      Awaiting a hunter...
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
          <button
            onClick={() => onStartGame(gameCode, maxPlayers)}
            className="w-full bg-gradient-to-r from-red-900 to-red-800 hover:from-red-800 hover:to-red-700 text-gray-100 font-bold rounded-lg px-4 py-2 text-sm transition-all duration-300 shadow-lg shadow-red-900/20"
          >
            Begin the Hunt
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

// RoleCard Component
interface RoleCardProps {
  role: Role;
  isActive?: boolean;
  isAdjacent?: boolean;
}
const RoleCard: React.FC<RoleCardProps> = ({ role, isActive = false, isAdjacent = false }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div
      className="relative w-68 h-96 rounded-3xl overflow-hidden bg-gray-900/50 border border-red-900/30 shadow-lg"
      initial={{ opacity: 0, scale: 0.9, rotate: 5 }}
      animate={{ opacity: 1, scale: isActive ? 1 : 0.9, rotate: 0 }}
      transition={{ duration: 0.5, ease: 'easeInOut' }}
      onHoverStart={() => isActive && setIsHovered(true)}
      onHoverEnd={() => isActive && setIsHovered(false)}
    >
      <motion.img
        src={role.image}
        alt={role.name}
        className="w-full h-full object-contain"
        initial={{ scale: 1.1 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.5, ease: 'easeInOut' }}
      />
      {isActive && (
        <>
          <motion.div
            className="absolute inset-0 bg-gradient-to-t from-red-950/60 to-transparent"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          />
          <motion.div
            className="absolute inset-0 bg-red-900/20 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            transition={{ duration: 0.5, ease: 'easeInOut' }}
          />
        </>
      )}
      <motion.div
        className="absolute bottom-0 left-0 right-0 p-4 z-10"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: isHovered && isActive ? -50 : 0, opacity: 1 }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
      >
        <h3 className="text-xl md:text-2xl font-serif font-bold text-red-500 drop-shadow-md">{role.name}</h3>
        {isActive && (
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: isHovered ? 1 : 0, y: isHovered ? 0 : 20 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="text-sm md:text-base text-red-100 mt-2 drop-shadow-md"
          >
            {role.description}
          </motion.p>
        )}
      </motion.div>
    </motion.div>
  );
};

// InfiniteLinearCarousel Component
const InfiniteLinearCarousel = ({ roles }: { roles: Role[] }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState<'left'|'right'>('right');
  const totalItems = roles.length;

  const getVisibleItems = () => {
    const items = [];
    for (let i = -3; i <= 3; i++) {
      const index = (currentIndex + i + totalItems) % totalItems;
      items.push({
        element: <RoleCard role={roles[index]} isAdjacent={Math.abs(i) === 1} />,
        position: i,
      });
    }
    return items;
  };

  const next = () => {
    setDirection('right');
    setCurrentIndex((current) => (current + 1) % totalItems);
  };

  const prev = () => {
    setDirection('left');
    setCurrentIndex((current) => (current - 1 + totalItems) % totalItems);
  };

  const handleItemClick = (position: number) => {
    setDirection(position > 0 ? 'right' : 'left');
    setCurrentIndex((current) => (current + position + totalItems) % totalItems);
  };

  return (
    <div className="relative w-full max-w-[2400px] mx-auto py-8 h-96 overflow-hidden px-8">
      <div className="relative flex justify-center items-center h-full">
        <div className="absolute inset-0 bg-gradient-to-r from-gray-950/50 via-red-950/10 to-gray-950/50 rounded-xl" />
        <button
          onClick={prev}
          className="absolute left-0 md:left-4 z-20 p-3 bg-gray-900/70 hover:bg-gray-900/90 rounded-full border border-red-900/50 transition-all duration-300 shadow-lg"
        >
          <ChevronLeft className="text-red-400 w-8 h-8" />
        </button>
        <div className="flex items-center justify-center w-full h-full">
          <AnimatePresence initial={false} custom={direction}>
            {getVisibleItems().map(({ element, position }, idx) => (
              <motion.div
                key={`${currentIndex}-${position}`}
                onClick={() => handleItemClick(position)}
                className="cursor-pointer absolute"
                custom={direction}
                initial={{ 
                  x: direction === 'right' ? (position + 1) * 304 : (position - 1) * 304,
                  opacity: 0 
                }}
                animate={{
                  x: position * 304,
                  scale: position === 0 ? 1 : 0.8 - Math.abs(position) * 0.1,
                  zIndex: 10 - Math.abs(position),
                  opacity: 1 - Math.abs(position) * 0.2,
                }}
                exit={{ 
                  x: direction === 'right' ? (position - 1) * 304 : (position + 1) * 304,
                  opacity: 0 
                }}
                transition={{ duration: 0.5, ease: 'easeInOut' }}
              >
                {cloneElement(element as React.ReactElement, { isActive: position === 0 })}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
        <button
          onClick={next}
          className="absolute right-0 md:right-4 z-20 p-3 bg-gray-900/70 hover:bg-gray-900/90 rounded-full border border-red-900/50 transition-all duration-300 shadow-lg"
        >
          <ChevronRight className="text-red-400 w-8 h-8" />
        </button>
      </div>
      <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2">
        {roles.map((_, index) => (
          <motion.div
            key={index}
            className={`w-2 h-2 rounded-full ${currentIndex === index ? 'bg-red-400' : 'bg-gray-600/50'}`}
            animate={{ scale: currentIndex === index ? 1.2 : 1 }}
            transition={{ duration: 0.3 }}
          />
        ))}
      </div>
    </div>
  );
};

// JoinGameSection Component with forwardRef
const JoinGameSection = forwardRef<HTMLDivElement, LobbyProps>((props, ref) => {
  const [joinGameCode, setJoinGameCode] = useState('');
  const [showCreatePopup, setShowCreatePopup] = useState(false);

  const mockGameCode = 'WOLF-7829';
  const mockPlayers: Player[] = [
    { id: '1', name: 'Emma Thompson', avatar: '../assets/default-avatar.png', isReady: true },
    { id: '2', name: 'Marcus Chen', avatar: '../assets/default-avatar.png', isReady: true },
    { id: '3', name: 'Luna Black', avatar: '../assets/default-avatar.png', isReady: false },
    { id: '4', name: 'Alex Hunt', avatar: '../assets/default-avatar.png', isReady: false },
  ];

  const mockGames = [
    { id: '1', title: "Moonlit Hunt", players: 5, maxPlayers: 8 },
    { id: '2', title: "Shadow Pack", players: 8, maxPlayers: 10 },
    { id: '3', title: "Blood Moon", players: 3, maxPlayers: 6 },
  ];

  const handleStartGame = (code: string, maxPlayers: number) => {
    setShowCreatePopup(false);
    props.onJoinGame(code);
  };

  return (
    <section ref={ref} className="min-h-screen snap-start flex items-center justify-center px-8">
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1 }}
        className="w-full max-w-5xl space-y-12"
      >
        <h2 className="text-5xl font-serif font-bold text-red-800 text-center drop-shadow-md">Join the Night's Hunt</h2>
        <div className="grid md:grid-cols-2 gap-12">
          {/* Join Game */}
          <motion.div
            className="space-y-6 bg-gray-950/40 p-8 rounded-xl border border-red-900/30 backdrop-blur-md shadow-lg"
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <h3 className="text-3xl font-serif text-red-400">Enter the Fray</h3>
            <div className="flex gap-4">
              <input
                type="text"
                placeholder="Enter hunt code"
                value={joinGameCode}
                onChange={(e) => setJoinGameCode(e.target.value)}
                className="flex-1 bg-gray-900/60 rounded-lg px-4 py-3 text-lg text-gray-200 placeholder-gray-500 border border-red-900/40 focus:border-red-800 focus:outline-none transition-all duration-300"
              />
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => joinGameCode && props.onJoinGame(joinGameCode)}
                className="bg-gradient-to-r from-red-900 to-red-800 hover:from-red-800 hover:to-red-700 text-gray-100 font-bold px-6 py-3 rounded-lg flex items-center transition-all duration-300 shadow-md"
              >
                <ArrowRight size={24} />
              </motion.button>
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowCreatePopup(true)}
              className="w-full bg-gray-900/50 hover:bg-gray-900/70 text-red-300 font-serif font-bold rounded-lg px-6 py-4 flex items-center justify-center gap-3 transition-all duration-300 border border-red-900/40 shadow-lg"
            >
              <Plus size={24} />
              Summon a New Hunt
            </motion.button>
          </motion.div>

          {/* Active Games */}
          <motion.div
            className="space-y-6"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            <h3 className="text-3xl font-serif text-red-400">Active Hunts</h3>
            <div className="space-y-4">
              {mockGames.map((game) => (
                <GameCard
                  key={game.id}
                  title={game.title}
                  players={game.players}
                  maxPlayers={game.maxPlayers}
                  onClick={() => props.onJoinGame(game.id)}
                />
              ))}
            </div>
          </motion.div>
        </div>

        <AnimatePresence>
          {showCreatePopup && (
            <CreateGamePopup
              onClose={() => setShowCreatePopup(false)}
              gameCode={mockGameCode}
              players={mockPlayers}
              onStartGame={handleStartGame}
            />
          )}
        </AnimatePresence>
      </motion.div>
    </section>
  );
});

// Footer Component Corrigé
const Footer = forwardRef<HTMLDivElement>((props, ref) => (
  <footer ref={ref} className="bg-gray-950/90 border-t border-red-900/30 py-6 w-full snap-stop mt-auto">
    <div className="mx-auto px-4 w-full">
      <div className="flex flex-col md:flex-row justify-between items-center text-gray-400 max-w-7xl mx-auto">
        <p>© 2025 StarkWolf. All rights reserved.</p>
        <div className="flex gap-6 mt-4 md:mt-0">
          <a href="#" className="hover:text-red-400 transition-colors">Terms</a>
          <a href="#" className="hover:text-red-400 transition-colors">Privacy</a>
          <a href="#" className="hover:text-red-400 transition-colors">Contact</a>
        </div>
      </div>
    </div>
  </footer>
));

// Main Lobby Component
export default function Lobby({ onJoinGame }: LobbyProps) {
  const roles: Role[] = [
    { image: villagerCard, name: "Villager", description: "A simple townsfolk trying to survive and root out the werewolves." },
    { image: werewolfCard, name: "Werewolf", description: "A cunning predator who hunts villagers under the cover of night." },
    { image: seerCard, name: "Seer", description: "A mystic who can peek into a player's soul each night to see their true role." },
    { image: hunterCard, name: "Hunter", description: "A brave soul who can take one enemy down with them if they perish." },
    { image: cupidCard, name: "Cupid", description: "A matchmaker who binds two players in love, tying their fates together." },
    { image: witchCard, name: "Witch", description: "A crafty spellcaster with a potion to heal and a poison to kill, used once each." },
    { image: guardCard, name: "Guard", description: "A protector who can shield one player from death each night." },
  ];

  const rolesSectionRef = React.useRef<HTMLDivElement>(null);
  const footerRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.target === footerRef.current && entry.isIntersecting) {
            document.documentElement.style.scrollSnapType = 'none';
          } else if (entry.target === rolesSectionRef.current && entry.isIntersecting) {
            document.documentElement.style.scrollSnapType = 'y mandatory';
          }
        });
      },
      { threshold: 0.1 }
    );

    if (rolesSectionRef.current) observer.observe(rolesSectionRef.current);
    if (footerRef.current) observer.observe(footerRef.current);

    return () => {
      if (rolesSectionRef.current) observer.unobserve(rolesSectionRef.current);
      if (footerRef.current) observer.unobserve(footerRef.current);
    };
  }, []);

  return (
    <div className="font-[Crimson Text] overflow-x-hidden relative min-h-screen snap-y snap-mandatory">
      {/* Background Layers */}
      <div className="fixed inset-0 z-0">
        <img src={Background} alt="Background" className="w-full h-full object-cover" />
      </div>
      <div className="fixed inset-0 z-1">
        <BackgroundStars />
      </div>
      <div className="fixed inset-0 z-2">
        <img src={BackgroundNoSky} alt="BackgroundNoSky" className="w-full h-full object-cover" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col min-h-screen">
        <Header />

        {/* Welcome Section */}
        <section className="min-h-screen flex items-center justify-center snap-start">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.5 }}
            className="text-center"
          >
            <h1 className="text-6xl md:text-8xl font-serif font-bold text-red-800 drop-shadow-lg animate-pulse-slow font-clash-display">
              StarkWolf
            </h1>
            <p className="text-xl md:text-2xl text-red-300 mt-4 drop-shadow-md">
              Unleash the Hunt Beneath the Stars
            </p>
          </motion.div>
        </section>

        {/* Join Game Section */}
        <JoinGameSection onJoinGame={onJoinGame} />

        {/* Roles Section */}
        <section ref={rolesSectionRef} className="min-h-screen flex flex-col items-center justify-center snap-start py-16">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1 }}
            className="text-center mb-8"
          >
            <h2 className="text-4xl font-serif font-bold text-red-800 drop-shadow-md">
              Roles of the Night
            </h2>
          </motion.div>
          <InfiniteLinearCarousel roles={roles} />
        </section>

        <Footer ref={footerRef} />
      </div>

      <style>{`
        @font-face {
          font-family: 'Clash Display';
          src: url('/fonts/ClashDisplay-Semibold.woff2') format('woff2'),
              url('/fonts/ClashDisplay-Semibold.woff') format('woff');
          font-weight: 600;
          font-style: normal;
          font-display: swap;
        }

        .font-clash-display {
          font-family: 'Clash Display', sans-serif;
        }

        html, body {
          height: 100%;
          margin: 0;
          padding: 0;
          overscroll-behavior-y: none;
          scroll-snap-type: y mandatory;
        }

        .snap-y {
          height: 100vh;
          overflow-y: scroll;
          -webkit-overflow-scrolling: touch;
        }

        .snap-start {
          scroll-snap-align: start;
          height: 100vh;
          display: flex;
          flex-direction: column;
          justify-content: center;
          position: relative;
        }

        .snap-stop {
          scroll-snap-align: start;
          scroll-snap-stop: always;
        }

        @keyframes pulse-slow {
          0% { text-shadow: 0 0 20px rgba(153, 27, 27, 0.5); }
          50% { text-shadow: 0 0 30px rgba(153, 27, 27, 0.7); }
          100% { text-shadow: 0 0 20px rgba(153, 27, 27, 0.5); }
        }

        .animate-pulse-slow {
          animation: pulse-slow 5s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}