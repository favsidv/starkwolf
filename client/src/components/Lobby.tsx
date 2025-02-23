import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Moon, Users, Plus, ArrowRight, X, Clock, Check, Wallet, Play, ChevronDown } from 'lucide-react';
import defaultAvatar from '../assets/default-avatar.png';
import { connect, disconnect } from "starknetkit";
import { StarknetWindowObject } from "get-starknet-core";

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

// Header Component with Wallet Connection
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

    return () => {
      connection?.off("accountsChanged", handleAccountsChange);
    };
  }, [connection]);

  return (
    <div className="absolute top-0 left-0 right-0 z-50">
      <div className="container mx-auto max-w-7xl py-6 px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Moon className="text-amber-400" size={48} />
            <h1 className="text-6xl font-serif text-amber-400 tracking-wide">StarkWolf</h1>
          </div>
          <button
            onClick={address ? disconnectWallet : connectWallet}
            className="bg-gradient-to-r from-amber-600 to-amber-400 hover:from-amber-500 hover:to-amber-300 text-gray-900 font-semibold rounded-lg px-6 py-2 flex items-center gap-2 transition-all shadow-lg shadow-amber-800/50"
          >
            <Wallet size={20} />
            {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'Connect Wallet'}
          </button>
        </div>
      </div>
    </div>
  );
};

// Hero Section Component with Scroll Chevron
const HeroSection = ({ onPlayClick }: { onPlayClick: () => void }) => (
  <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
    <div className="absolute inset-0 bg-[url('/dark-forest.jpg')] bg-cover bg-center" />
    <div className="absolute inset-0 bg-gradient-to-b from-gray-950/90 via-gray-950/70 to-gray-950/95" />
    <div className="absolute inset-0">
      <div className="h-full w-full bg-[url('/fog-overlay.png')] bg-repeat-x animate-fog opacity-20" />
    </div>
    <div className="relative z-10 container mx-auto px-4 py-32 text-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="max-w-3xl mx-auto space-y-8"
      >
        <h2 className="text-7xl font-serif text-amber-400 mb-6 drop-shadow-[0_0_15px_rgba(251,191,36,0.3)]">
          Welcome to StarkWolf
        </h2>
        <p className="text-xl text-gray-200 mb-8 leading-relaxed font-medium">
          In a cursed village shrouded in mist, roles are cast and loyalties tested. Will you uncover the wolves, or weave your own web of deception?
        </p>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onPlayClick}
          className="inline-flex items-center gap-3 bg-gradient-to-r from-amber-600 to-amber-400 text-gray-900 px-8 py-4 rounded-lg text-xl font-semibold shadow-lg shadow-amber-800/50 hover:shadow-amber-800/70 transition-all"
        >
          <Play className="w-6 h-6" />
          Join the Hunt
        </motion.button>
      </motion.div>
      <motion.div
        animate={{ y: [0, 10, 0] }}
        transition={{ duration: 1.5, repeat: Infinity }}
        className="absolute bottom-10 left-1/2 transform -translate-x-1/2"
      >
        <ChevronDown size={36} className="text-amber-400" />
      </motion.div>
    </div>
  </div>
);

// GameCard Component
const GameCard = ({ title, players, maxPlayers, onClick }: { title: string; players: number; maxPlayers: number; onClick: () => void }) => (
  <motion.div
    whileHover={{ scale: 1.02 }}
    onClick={onClick}
    className="bg-gray-950/70 rounded-lg p-6 hover:bg-gray-950/80 transition-all cursor-pointer border border-amber-800/30 hover:border-amber-600/50 group relative overflow-hidden backdrop-blur-sm"
  >
    <div className="absolute inset-0 bg-gradient-to-r from-amber-800/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
    <h3 className="text-xl font-serif mb-2 text-amber-300 group-hover:text-amber-200 transition-colors relative z-10">{title}</h3>
    <div className="flex items-center text-gray-300 relative z-10">
      <Users size={16} className="mr-2" />
      <span>{players}/{maxPlayers} Players</span>
    </div>
  </motion.div>
);

// CreateGamePopup Component
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
      setTimeLeft((prev) => {
        if (prev <= 0) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
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
      className="fixed inset-0 bg-gray-950/95 backdrop-blur-sm flex items-center justify-center p-4 z-50"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-gradient-to-b from-gray-950 to-gray-950/90 border border-amber-800/30 rounded-lg p-8 w-full max-w-lg shadow-xl shadow-amber-800/20"
      >
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-3xl font-serif text-amber-400">Create Game</h2>
          <button
            onClick={onClose}
            className="text-gray-300 hover:text-gray-200 transition-colors"
          >
            <X size={24} />
          </button>
        </div>
        <div className="space-y-6">
          <div className="bg-gray-900/50 rounded-lg p-4 border border-amber-800/20">
            <div className="flex items-center justify-between mb-4">
              <span className="text-gray-300">Game Code:</span>
              <span className="text-xl font-mono font-bold text-amber-400">{gameCode}</span>
            </div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-gray-300">Players:</span>
              <div className="flex items-center gap-4 text-amber-400">
                <button onClick={() => setMaxPlayers(prev => Math.max(6, prev - 1))}>-</button>
                <span className="text-xl font-bold w-8 text-center">{maxPlayers}</span>
                <button onClick={() => setMaxPlayers(prev => Math.min(10, prev + 1))}>+</button>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-amber-400" />
              <span className="text-gray-300 text-sm">{`${minutes}:${seconds.toString().padStart(2, '0')}`}</span>
            </div>
          </div>
          <div className="space-y-4">
            <h3 className="text-lg font-serif text-amber-300">Players ({players.length}/{maxPlayers})</h3>
            <div className="grid grid-cols-2 gap-3">
              {[...players, ...Array(maxPlayers - players.length)].map((player, index) => (
                <div
                  key={player?.id || `empty-${index}`}
                  className="bg-gray-900/30 rounded-lg p-3 border border-amber-800/20 flex items-center gap-3"
                >
                  {player ? (
                    <>
                      <img
                        src={player.avatar || defaultAvatar}
                        alt={player.name}
                        className="w-10 h-10 rounded-full border border-amber-800/30"
                      />
                      <div className="flex-1">
                        <p className="text-gray-200 font-medium truncate">{player.name}</p>
                        <p className="text-gray-400 text-sm">{player.isReady ? 'Ready' : 'Waiting...'}</p>
                      </div>
                      {player.isReady && <Check size={16} className="text-green-400 shrink-0" />}
                    </>
                  ) : (
                    <div className="flex items-center justify-center w-full text-gray-500">
                      Waiting for player...
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
          <button
            onClick={() => onStartGame(gameCode, maxPlayers)}
            className="w-full bg-gradient-to-r from-amber-600 to-amber-400 hover:from-amber-500 hover:to-amber-300 text-gray-900 font-bold rounded-lg px-6 py-3 transition-all duration-300 shadow-lg shadow-amber-800/20"
          >
            Start Game
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

// RoleCard Component
const RoleCard = ({ image, name, description }: { image: string; name: string; description: string }) => (
  <motion.div
    whileHover={{ scale: 1.05 }}
    className="bg-gray-950/70 rounded-lg p-4 border border-amber-800/30 flex flex-col items-center text-center"
  >
    <img src={image} alt={name} className="w-32 h-48 object-cover rounded-md mb-4" />
    <h3 className="text-lg font-serif text-amber-300 mb-2">{name}</h3>
    <p className="text-gray-300 text-sm">{description}</p>
  </motion.div>
);

// Main Lobby Component
export default function Lobby({ onJoinGame }: LobbyProps) {
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

  const roles = [
    { image: villagerCard, name: "Villager", description: "A simple townsfolk trying to survive and root out the werewolves." },
    { image: werewolfCard, name: "Werewolf", description: "A cunning predator who hunts villagers under the cover of night." },
    { image: seerCard, name: "Seer", description: "A mystic who can peek into a player’s soul each night to see their true role." },
    { image: hunterCard, name: "Hunter", description: "A brave soul who can take one enemy down with them if they perish." },
    { image: cupidCard, name: "Cupid", description: "A matchmaker who binds two players in love, tying their fates together." },
    { image: witchCard, name: "Witch", description: "A crafty spellcaster with a potion to heal and a poison to kill, used once each." },
    { image: guardCard, name: "Guard", description: "A protector who can shield one player from death each night." },
  ];

  const handleStartGame = (code: string, maxPlayers: number) => {
    setShowCreatePopup(false);
    onJoinGame(code);
  };

  return (
    <div className="min-h-screen bg-gray-950 font-[Crimson Text]">
      <Header />
      <HeroSection onPlayClick={() => document.getElementById('game-section')?.scrollIntoView({ behavior: 'smooth' })} />
      
      <div id="game-section" className="relative bg-gradient-to-b from-gray-950 via-gray-950 to-gray-950 min-h-screen">
        <div className="absolute inset-0">
          <div className="h-full w-full bg-[url('/fog-overlay.png')] bg-repeat-x animate-fog opacity-10" />
        </div>
        <div className="container mx-auto max-w-6xl py-24 px-4 relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 max-w-5xl mx-auto">
            <div className="space-y-8">
              <div>
                <h2 className="text-3xl font-serif font-bold mb-6 text-amber-300">Join the Hunt</h2>
                <div className="flex gap-3">
                  <input
                    type="text"
                    placeholder="Enter game code"
                    value={joinGameCode}
                    onChange={(e) => setJoinGameCode(e.target.value)}
                    className="flex-1 bg-gray-900/50 rounded-lg px-4 py-3 text-lg text-gray-200 placeholder-gray-400 border border-amber-800/30 focus:border-amber-600 focus:outline-none transition-colors"
                  />
                  <button
                    onClick={() => joinGameCode && onJoinGame(joinGameCode)}
                    className="bg-amber-800/20 hover:bg-amber-800/30 px-6 rounded-lg flex items-center text-amber-300 border border-amber-800/30 transition-colors"
                  >
                    <ArrowRight size={24} />
                  </button>
                </div>
              </div>
              <div>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  onClick={() => setShowCreatePopup(true)}
                  className="w-full bg-gradient-to-r from-amber-600 to-amber-400 hover:from-amber-500 hover:to-amber-300 text-gray-900 font-bold rounded-lg px-6 py-4 flex items-center justify-center gap-3 transition-all text-lg group shadow-lg shadow-amber-800/30"
                >
                  <Plus size={24} className="group-hover:rotate-90 transition-transform duration-300" />
                  Create New Game
                </motion.button>
              </div>
              
              <div className="bg-gray-900/30 rounded-lg p-6 border border-amber-800/20 backdrop-blur-sm">
                <h3 className="text-xl font-serif text-amber-300 mb-4">Rules of the Night</h3>
                <ul className="space-y-4 text-gray-200">
                  <li className="flex items-start gap-3">
                    <Moon size={20} className="text-amber-400 shrink-0 mt-1" />
                    <p>Night falls, and roles awaken: Werewolves hunt, special roles act, and villagers sleep.</p>
                  </li>
                  <li className="flex items-start gap-3">
                    <Users size={20} className="text-amber-400 shrink-0 mt-1" />
                    <p>6-10 players are assigned secret roles with unique abilities.</p>
                  </li>
                  <li className="flex items-start gap-3">
                    <Moon size={20} className="text-amber-400 shrink-0 mt-1" />
                    <p>Daybreak brings debate: accuse, defend, and vote to banish suspected wolves.</p>
                  </li>
                  <li className="flex items-start gap-3">
                    <Play size={20} className="text-amber-400 shrink-0 mt-1" />
                    <p>Victory belongs to the villagers if all wolves are gone, or to the wolves if they outnumber.</p>
                  </li>
                </ul>
              </div>
            </div>
            
            <div>
              <h2 className="text-3xl font-serif font-bold mb-6 text-amber-300">Active Hunts</h2>
              <div className="space-y-4">
                {mockGames.map((game) => (
                  <GameCard
                    key={game.id}
                    title={game.title}
                    players={game.players}
                    maxPlayers={game.maxPlayers}
                    onClick={() => onJoinGame(game.id)}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="mt-16">
            <h2 className="text-3xl font-serif font-bold mb-8 text-amber-300 text-center">Roles of the Night</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {roles.map((role) => (
                <RoleCard key={role.name} image={role.image} name={role.name} description={role.description} />
              ))}
            </div>
          </div>
        </div>
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

      <style>{`
        @keyframes fog-movement {
          0% {
            background-position: 0% 0%;
          }
          100% {
            background-position: 100% 0%;
          }
        }
        .animate-fog {
          animation: fog-movement 60s linear infinite;
        }
      `}</style>
    </div>
  );
}