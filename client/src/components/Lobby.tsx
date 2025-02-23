import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Users, Plus, ArrowRight, X, Clock, Check, Wallet, Play } from 'lucide-react';
import defaultAvatar from '../assets/default-avatar.png';
import logo from '../assets/logo.webp';
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

// Header Component with Wallet Connection and Logo
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
            <img 
              src={logo} 
              alt="StarkWolf Logo" 
              className="h-12 w-auto object-contain" 
            />
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
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black font-[Crimson Text] overflow-x-hidden">
      {/* Immersive Background */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-[url('/dark-forest.jpg')] bg-cover bg-center opacity-70 animate-subtle-zoom" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80" />
        <div className="absolute inset-0 animate-fog" style={{ background: 'url(/fog-overlay.png) repeat-x', backgroundSize: '200% 100%' }} />
        <div className="absolute inset-0 animate-moonlight" style={{ background: 'radial-gradient(circle at 80% 20%, rgba(251, 191, 36, 0.1) 0%, transparent 50%)' }} />
      </div>

      {/* Content Wrapper */}
      <div className="relative z-10">
        <Header />

        {/* Main Lobby Section */}
        <div className="container mx-auto max-w-6xl py-24 px-4 min-h-screen flex flex-col justify-center">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.5 }}
            className="text-center mb-16"
          >
            <h1 className="text-8xl font-serif text-amber-400 tracking-tight drop-shadow-[0_0_20px_rgba(251,191,36,0.5)] animate-pulse-slow">
              Enter the Hunt
            </h1>
            <p className="text-2xl text-gray-200 mt-4 font-medium animate-fade-in">
              The moon rises. Will you survive the night or become the predator?
            </p>
          </motion.div>

          <div className="grid lg:grid-cols-2 gap-12 max-w-5xl mx-auto">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.8 }}
              className="space-y-8"
            >
              <div>
                <h2 className="text-4xl font-serif font-bold mb-6 text-amber-300 drop-shadow-md">Join a Game</h2>
                <div className="flex gap-3">
                  <input
                    type="text"
                    placeholder="Enter game code"
                    value={joinGameCode}
                    onChange={(e) => setJoinGameCode(e.target.value)}
                    className="flex-1 bg-gray-900/60 rounded-lg px-4 py-3 text-lg text-gray-200 placeholder-gray-500 border border-amber-800/40 focus:border-amber-600 focus:outline-none transition-all duration-300 backdrop-blur-sm"
                  />
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => joinGameCode && onJoinGame(joinGameCode)}
                    className="bg-amber-800/30 hover:bg-amber-800/50 px-6 rounded-lg flex items-center text-amber-300 border border-amber-800/40 transition-all duration-300"
                  >
                    <ArrowRight size={24} />
                  </motion.button>
                </div>
              </div>
              <div>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowCreatePopup(true)}
                  className="w-full bg-gradient-to-r from-amber-600 to-amber-400 hover:from-amber-500 hover:to-amber-300 text-gray-900 font-bold rounded-lg px-6 py-4 flex items-center justify-center gap-3 transition-all duration-300 text-lg group shadow-lg shadow-amber-800/40"
                >
                  <Plus size={24} className="group-hover:rotate-90 transition-transform duration-300" />
                  Create New Game
                </motion.button>
              </div>
              <div className="bg-gray-900/40 rounded-lg p-6 border border-amber-800/30 backdrop-blur-sm">
                <h3 className="text-2xl font-serif text-amber-300 mb-4 drop-shadow-sm">Rules of the Night</h3>
                <ul className="space-y-4 text-gray-200">
                  <li className="flex items-start gap-3">
                    <Users size={20} className="text-amber-400 shrink-0 mt-1" />
                    <p>Night falls, and roles awaken: Werewolves hunt, special roles act, and villagers sleep.</p>
                  </li>
                  <li className="flex items-start gap-3">
                    <Users size={20} className="text-amber-400 shrink-0 mt-1" />
                    <p>6-10 players are assigned secret roles with unique abilities.</p>
                  </li>
                  <li className="flex items-start gap-3">
                    <Users size={20} className="text-amber-400 shrink-0 mt-1" />
                    <p>Daybreak brings debate: accuse, defend, and vote to banish suspected wolves.</p>
                  </li>
                  <li className="flex items-start gap-3">
                    <Play size={20} className="text-amber-400 shrink-0 mt-1" />
                    <p>Victory belongs to the villagers if all wolves are gone, or to the wolves if they outnumber.</p>
                  </li>
                </ul>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.8 }}
            >
              <h2 className="text-4xl font-serif font-bold mb-6 text-amber-300 drop-shadow-md">Active Hunts</h2>
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
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 1 }}
            className="mt-16"
          >
            <h2 className="text-4xl font-serif font-bold mb-8 text-amber-300 text-center drop-shadow-md">Roles of the Night</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {roles.map((role) => (
                <RoleCard key={role.name} image={role.image} name={role.name} description={role.description} />
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
      </div>

      {/* Enhanced Styles */}
      <style>{`
        @keyframes subtle-zoom {
          0% { transform: scale(1); }
          50% { transform: scale(1.05); }
          100% { transform: scale(1); }
        }
        .animate-subtle-zoom {
          animation: subtle-zoom 20s ease-in-out infinite;
        }

        @keyframes fog-movement {
          0% { background-position: 0% 0%; }
          100% { background-position: 100% 0%; }
        }
        .animate-fog {
          animation: fog-movement 30s linear infinite;
          opacity: 0.4;
        }

        @keyframes moonlight {
          0% { opacity: 0.1; transform: translateY(-10%); }
          50% { opacity: 0.2; transform: translateY(0); }
          100% { opacity: 0.1; transform: translateY(-10%); }
        }
        .animate-moonlight {
          animation: moonlight 15s ease-in-out infinite;
        }

        @keyframes pulse-slow {
          0% { text-shadow: 0 0 20px rgba(251, 191, 36, 0.5); }
          50% { text-shadow: 0 0 30px rgba(251, 191, 36, 0.7); }
          100% { text-shadow: 0 0 20px rgba(251, 191, 36, 0.5); }
        }
        .animate-pulse-slow {
          animation: pulse-slow 5s ease-in-out infinite;
        }

        @keyframes fade-in {
          0% { opacity: 0; }
          100% { opacity: 1; }
        }
        .animate-fade-in {
          animation: fade-in 2s ease-in-out forwards;
        }
      `}</style>
    </div>
  );
}