import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Users, Shield, Eye, Volume2, VolumeX, Clock, Star, Sun, Moon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import defaultAvatar from '../assets/default-avatar.png';
import backgroundNight from '../assets/background_night.webp';
import backgroundDay from '../assets/background_day.webp';

// Constants
const PHASE_DURATION = 10;
const MAP_SIZE = 2000;
const POSITION_X = 1565;
const POSITION_Y = 1215;
const PLAYER_SPEED = 5;

// Interfaces
interface GameProps {
  gameId: string;
  onLeaveGame: () => void;
}

interface PlayerCard {
  id: number;
  name: string;
  role?: 'villager' | 'werewolf' | 'seer' | 'witch' | 'hunter' | 'guard';
  status: 'alive' | 'dead';
  isRevealed: boolean;
  avatar: string;
  position: { x: number; y: number };
  lastKnownPosition?: { x: number; y: number };
  voteCount: number;
  isProtected: boolean;
  hasVoted: boolean;
  inventory: string[];
  abilities: {
    primary: { name: string; cooldown: number; isReady: boolean };
    secondary: { name: string; cooldown: number; isReady: boolean };
  };
}

interface GameState {
  phase: 'day' | 'night' | 'dusk' | 'dawn';
  day: number;
  timeLeft: number;
  aliveWerewolves: number;
  aliveVillagers: number;
  lastKilled?: PlayerCard;
  events: GameEvent[];
  votingOpen: boolean;
  potionsAvailable: { heal: boolean; kill: boolean };
  protectedPlayer?: number;
}

interface GameEvent {
  id: string;
  type: 'kill' | 'vote' | 'protect' | 'reveal' | 'system';
  message: string;
  timestamp: number;
  severity: 'info' | 'warning' | 'danger';
}

interface ChatMessage {
  id: string;
  playerId: number;
  playerName: string;
  avatar: string;
  content: string;
  timestamp: number;
  type: 'public' | 'werewolf' | 'dead' | 'system';
}

// Sample data for initial game state
const SAMPLE_PLAYERS: PlayerCard[] = [
  {
    id: 1,
    name: "Emma Thompson",
    role: "werewolf",
    status: "alive",
    isRevealed: false,
    avatar: defaultAvatar,
    position: { x: 0, y: 0 },
    voteCount: 0,
    isProtected: false,
    hasVoted: false,
    inventory: ["Wooden Dagger", "Night Vision Potion"],
    abilities: {
      primary: { name: "Nocturnal Strike", cooldown: 0, isReady: true },
      secondary: { name: "Wolf Sense", cooldown: 0, isReady: true }
    }
  },
  {
    id: 2,
    name: "Marcus Chen",
    role: "werewolf",
    status: "alive",
    isRevealed: false,
    avatar: defaultAvatar,
    position: { x: 0, y: 0 },
    voteCount: 0,
    isProtected: false,
    hasVoted: false,
    inventory: ["Shadow Cloak"],
    abilities: {
      primary: { name: "Nocturnal Strike", cooldown: 0, isReady: true },
      secondary: { name: "Wolf Sense", cooldown: 0, isReady: true }
    }
  },
  {
    id: 3,
    name: "Luna Blackwood",
    role: "seer",
    status: "alive",
    isRevealed: false,
    avatar: defaultAvatar,
    position: { x: 0, y: 0 },
    voteCount: 0,
    isProtected: false,
    hasVoted: false,
    inventory: ["Crystal Ball", "Vision Scroll"],
    abilities: {
      primary: { name: "Reveal Truth", cooldown: 0, isReady: true },
      secondary: { name: "Foresight", cooldown: 0, isReady: true }
    }
  },
  {
    id: 4,
    name: "Isabella Santos",
    role: "witch",
    status: "alive",
    isRevealed: false,
    avatar: defaultAvatar,
    position: { x: 0, y: 0 },
    voteCount: 0,
    isProtected: false,
    hasVoted: false,
    inventory: ["Healing Potion", "Death Potion"],
    abilities: {
      primary: { name: "Brew Potion", cooldown: 0, isReady: true },
      secondary: { name: "Antidote", cooldown: 0, isReady: true }
    }
  },
  {
    id: 5,
    name: "Alexander Hunt",
    role: "hunter",
    status: "alive",
    isRevealed: false,
    avatar: defaultAvatar,
    position: { x: 0, y: 0 },
    voteCount: 0,
    isProtected: false,
    hasVoted: false,
    inventory: ["Silver Bullets", "Tracking Compass"],
    abilities: {
      primary: { name: "Precise Shot", cooldown: 0, isReady: true },
      secondary: { name: "Track Beast", cooldown: 0, isReady: true }
    }
  },
  {
    id: 6,
    name: "Grace Shield",
    role: "guard",
    status: "alive",
    isRevealed: false,
    avatar: defaultAvatar,
    position: { x: 0, y: 0 },
    voteCount: 0,
    isProtected: false,
    hasVoted: false,
    inventory: ["Shield of Light", "Guardian's Horn"],
    abilities: {
      primary: { name: "Divine Protection", cooldown: 0, isReady: true },
      secondary: { name: "Vigilant Watch", cooldown: 0, isReady: true }
    }
  },
  {
    id: 7,
    name: "Olivia Bennett",
    role: "villager",
    status: "alive",
    isRevealed: false,
    avatar: defaultAvatar,
    position: { x: 0, y: 0 },
    voteCount: 0,
    isProtected: false,
    hasVoted: false,
    inventory: ["Torch", "Village Map"],
    abilities: {
      primary: { name: "Rally Villagers", cooldown: 0, isReady: true },
      secondary: { name: "Village Knowledge", cooldown: 0, isReady: true }
    }
  },
  {
    id: 8,
    name: "James Miller",
    role: "villager",
    status: "alive",
    isRevealed: false,
    avatar: defaultAvatar,
    position: { x: 0, y: 0 },
    voteCount: 0,
    isProtected: false,
    hasVoted: false,
    inventory: ["Lantern", "Lucky Charm"],
    abilities: {
      primary: { name: "Rally Villagers", cooldown: 0, isReady: true },
      secondary: { name: "Village Knowledge", cooldown: 0, isReady: true }
    }
  }
];

function calculateCirclePositions(
  numPlayers: number,
  radius: number,
  center: { x: number; y: number }
): { x: number; y: number }[] {
  const angleStep = (2 * Math.PI) / numPlayers;
  return Array.from({ length: numPlayers }, (_, i) => {
    const angle = i * angleStep;
    return {
      x: center.x + radius * Math.cos(angle),
      y: center.y + radius * Math.sin(angle),
    };
  });
}

function generateInitialPlayers(): PlayerCard[] {
  const center = { x: POSITION_X, y: POSITION_Y }; // Centre de la carte
  const radius = 195; // Ajustez ce rayon selon vos besoins

  const positions = calculateCirclePositions(SAMPLE_PLAYERS.length, radius, center);

  return SAMPLE_PLAYERS.map((player, index) => ({
    ...player,
    position: positions[index],
  }));
}

function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

// Main Game Component
export default function Game({ gameId, onLeaveGame }: GameProps) {
  // State
  const [gameState, setGameState] = useState<GameState>({
    phase: 'night',
    day: 1,
    timeLeft: PHASE_DURATION,
    aliveWerewolves: 2,
    aliveVillagers: 6,
    events: [],
    votingOpen: false,
    potionsAvailable: { heal: true, kill: true },
  });

  const [players, setPlayers] = useState<PlayerCard[]>(generateInitialPlayers());
  const [selectedPlayer, setSelectedPlayer] = useState<number | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [cameraPosition] = useState({ x: MAP_SIZE / 2, y: MAP_SIZE / 2 }); // Centrer la caméra

  // Refs
  const gameContainerRef = useRef<HTMLDivElement>(null);

  const audioRef = useRef<{ [key: string]: HTMLAudioElement }>({
    ambience: new Audio('/sounds/night-ambience.mp3'),
    wolf: new Audio('/sounds/wolf-howl.mp3'),
    bell: new Audio('/sounds/village-bell.mp3'),
    death: new Audio('/sounds/death-sound.mp3'),
    vote: new Audio('/sounds/vote-sound.mp3'),
  });

  // Fonction pour gérer le changement de phase
  function handlePhaseChange() {
    const audio = audioRef.current;
    if (gameState.phase === 'night') {
      audio.wolf.play();
      audio.ambience.play();
    } else {
      audio.bell.play();
      audio.ambience.pause();
    }
  }

  // Mettre à jour les positions des joueurs
  function updatePlayerPositions() {
    setPlayers((prevPlayers) =>
      prevPlayers.map((player) => ({
        ...player,
        lastKnownPosition: player.position,
      }))
    );
  }

  // Gérer les votes
  function handleVoting(playerId: number) {
    if (!gameState.votingOpen) return;

    setPlayers((prevPlayers) =>
      prevPlayers.map((player) =>
        player.id === playerId
          ? { ...player, voteCount: player.voteCount + 1 }
          : player
      )
    );

    audioRef.current.vote.play();
  }

  // Ajouter un événement au jeu
  function addGameEvent(event: GameEvent) {
    setGameState((prev) => ({
      ...prev,
      events: [...prev.events, event],
    }));
  }

  // Envoyer un message dans le chat
  function handleSendMessage(content: string) {
    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      playerId: 1, // Supposons que le joueur actuel est le joueur 1
      playerName: 'You',
      avatar: '/avatars/player-1.jpg',
      content,
      timestamp: Date.now(),
      type: 'public',
    };

    setChatMessages((prev) => [...prev, newMessage]);
  }

  // Effets
  useEffect(() => {
    const gameLoop = setInterval(() => {
      setGameState((prev) => ({
        ...prev,
        timeLeft: Math.max(0, prev.timeLeft - 1),
      }));

      // Changer de phase après la durée définie
      if (gameState.timeLeft === 0) {
        const newPhase = gameState.phase === 'night' ? 'day' : 'night';
        setGameState((prev) => ({
          ...prev,
          phase: newPhase,
          timeLeft: PHASE_DURATION,
        }));
      }
    }, 1000);

    return () => clearInterval(gameLoop);
  }, [gameState.timeLeft]);

  useEffect(() => {
    handlePhaseChange();
  }, [gameState.phase]);

  useEffect(() => {
    updatePlayerPositions();
  }, [players]);

  // Composant principal
  return (
    <div className="min-h-screen bg-[#120907] text-amber-200">
      {/* Header */}
      <GameHeader
        phase={gameState.phase}
        timeLeft={gameState.timeLeft}
        day={gameState.day}
        onLeaveGame={onLeaveGame}
        onToggleSound={() => setSoundEnabled(!soundEnabled)}
        soundEnabled={soundEnabled}
      />

      {/* Conteneur principal du jeu */}
      <div className="flex flex-1 h-[calc(100vh-4rem)]">
        {/* Vue principale du jeu */}
        <div
          className="relative flex-1"
          style={{
            width: '75vw', // Ajustez selon vos besoins
            height: '100%',
            position: 'relative',
            overflow: 'hidden',
            backgroundImage: `url(${backgroundDay})`, // Background jour toujours présent
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          {/* Background Night (superposé avec opacité variable) */}
          <div
            className="background night-background"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              backgroundImage: `url(${backgroundNight})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              opacity: gameState.phase === 'night' ? 1 : 0, // Opacité dynamique
              transition: 'opacity 1s ease-in-out', // Transition fluide
            }}
          ></div>

          {/* Contenu principal du jeu */}
          <MainGameView
            players={players}
            selectedPlayer={selectedPlayer}
            onPlayerSelect={(id) => setSelectedPlayer(id)}
            phase={gameState.phase}
            cameraPosition={cameraPosition}
          />
        </div>

        {/* Panneau latéral */}
        <SidePanel
          gameState={gameState}
          players={players}
          chatMessages={chatMessages}
          onSendMessage={handleSendMessage}
        />
      </div>
    </div>
  );
}

function GameHeader({ phase, timeLeft, day, onLeaveGame, onToggleSound, soundEnabled }: {
  phase: GameState['phase'];
  timeLeft: number;
  day: number;
  onLeaveGame: () => void;
  onToggleSound: () => void;
  soundEnabled: boolean;
}) {
  return (
    <header className="bg-gradient-to-r from-[#1a0f00] to-black border-b border-amber-500/30 h-16 flex items-center px-6">
      {/* Bouton pour quitter le jeu */}
      <button 
        onClick={onLeaveGame}
        className="text-amber-500 hover:text-amber-400 transition-colors mr-6"
      >
        <ArrowLeft size={24} />
      </button>

      {/* Contenu principal de l'en-tête */}
      <div className="flex items-center gap-6">
        {/* Titre du jeu */}
        <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-amber-500">
          StarkWolf
        </h1>

        {/* Timer */}
        <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-black/40 border border-amber-500/20">
          <Clock size={16} className="text-amber-500" />
          <span className="text-amber-200 font-medium">{formatTime(timeLeft)}</span>
        </div>

        {/* Numéro du jour */}
        <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-black/40 border border-amber-500/20">
          <Star size={16} className="text-amber-500" />
          <span className="text-amber-200 font-medium">Day {day}</span>
        </div>

        {/* Indicateur de phase (nouveau) */}
        <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-black/40 border border-amber-500/20">
          {phase === 'night' ? (
            <>
              <Moon size={16} className="text-amber-500" /> {/* Icône de lune pour la nuit */}
              <span className="text-amber-200 font-medium">Night</span>
            </>
          ) : (
            <>
              <Sun size={16} className="text-amber-500" /> {/* Icône de soleil pour le jour */}
              <span className="text-amber-200 font-medium">Day</span>
            </>
          )}
        </div>
      </div>

      {/* Bouton pour activer/désactiver le son */}
      <div className="ml-auto">
        <button 
          onClick={onToggleSound}
          className="text-amber-500 hover:text-amber-400 transition-colors"
        >
          {soundEnabled ? <Volume2 size={24} /> : <VolumeX size={24} />}
        </button>
      </div>
    </header>
  );
}

function MainGameView({ players, selectedPlayer, onPlayerSelect, phase, cameraPosition }: {
  players: PlayerCard[];
  selectedPlayer: number | null;
  onPlayerSelect: (id: number) => void;
  phase: GameState['phase'];
  cameraPosition: { x: number; y: number };
}) {
  return (
    <div
      className="absolute inset-0"
      style={{
        transform: `translate(-${cameraPosition.x}px, -${cameraPosition.y}px)`,
      }}
    >
      {players.map((player) => (
        <PlayerAvatar
          key={player.id}
          player={player}
          isSelected={selectedPlayer === player.id}
          onClick={() => onPlayerSelect(player.id)}
          phase={phase}
        />
      ))}
    </div>
  );
}

function PlayerAvatar({ player, isSelected, onClick, phase }: {
  player: PlayerCard;
  isSelected: boolean;
  onClick: () => void;
  phase: GameState['phase'];
}) {
  return (
    <motion.div
      className={`absolute cursor-pointer ${player.status === 'dead' ? 'grayscale opacity-50' : ''}`}
      style={{
        x: player.position.x,
        y: player.position.y,
      }}
      animate={{
        scale: isSelected ? 1.1 : 1,
      }}
      whileHover={{ scale: 1.05 }}
      onClick={onClick}
    >
      <div className="relative w-20 h-20">
        <img
          src={player.avatar}
          alt={player.name}
          className="w-full h-full rounded-full border-2 border-amber-500/30 shadow-lg shadow-amber-900/20"
        />
        {player.isProtected && (
          <div className="absolute -top-1 -right-1 bg-amber-500/20 rounded-full p-1 border border-amber-500/30">
            <Shield size={12} className="text-amber-200" />
          </div>
        )}
        <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
          <span className="text-amber-200 text-sm font-medium px-2 py-0.5 rounded-full bg-black/60 border border-amber-500/20">
            {player.name}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

function SidePanel({ gameState, players, chatMessages, onSendMessage }: {
  gameState: GameState;
  players: PlayerCard[];
  chatMessages: ChatMessage[];
  onSendMessage: (message: string) => void;
}) {
  return (
    <div className="w-80 bg-gradient-to-b from-[#1a0f00] to-black border-l border-amber-500/30 flex flex-col">
      <div className="p-4 border-b border-amber-500/30">
        <h2 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-amber-500 mb-4">Game Status</h2>
        <div className="space-y-3">
          <StatBar
            label="Werewolves"
            current={gameState.aliveWerewolves}
            total={2}
            color="amber"
          />
          <StatBar
            label="Villagers"
            current={gameState.aliveVillagers}
            total={6}
            color="amber"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <h2 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-amber-500 mb-4">Events</h2>
        <div className="space-y-2">
          {gameState.events.map(event => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      </div>

      <ChatSection
        messages={chatMessages}
        onSendMessage={onSendMessage}
      />
    </div>
  );
}

function StatBar({ label, current, total, color }: {
  label: string;
  current: number;
  total: number;
  color: string;
}) {
  const percentage = (current / total) * 100;
  return (
    <div className="space-y-1">
      <div className="flex justify-between">
        <span className="text-amber-200">{label}</span>
        <span className="text-amber-200">{current}/{total}</span>
      </div>
      <div className="h-2 bg-black/40 rounded-full overflow-hidden border border-amber-500/20">
        <div
          className="h-full bg-gradient-to-r from-amber-600 to-amber-500"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

function EventCard({ event }: { event: GameEvent }) {
  const severityStyles = {
    info: 'bg-black/40 border-amber-500/20 text-amber-200',
    warning: 'bg-black/40 border-amber-500/20 text-amber-200',
    danger: 'bg-black/40 border-amber-500/20 text-amber-200'
  };

  return (
    <div className={`p-3 rounded-lg border ${severityStyles[event.severity]}`}>
      <p className="text-sm">{event.message}</p>
      <span className="text-xs text-amber-200/50">
        {new Date(event.timestamp).toLocaleTimeString()}
      </span>
    </div>
  );
}

function ChatSection({ messages, onSendMessage }: {
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
}) {
  const [newMessage, setNewMessage] = useState('');
  const chatRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim()) {
      onSendMessage(newMessage);
      setNewMessage('');
    }
  };

  return (
    <div className="h-1/3 border-t border-amber-500/30 flex flex-col">
      <div 
        ref={chatRef}
        className="flex-1 overflow-y-auto p-4 space-y-2"
      >
        {messages.map(message => (
          <ChatMessage key={message.id} message={message} />
        ))}
      </div>

      <form 
        onSubmit={handleSubmit}
        className="p-4 border-t border-amber-500/30 flex gap-2"
      >
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 bg-black/30 rounded px-3 py-2 text-amber-200 placeholder-amber-200/50 border border-amber-500/30 focus:outline-none focus:border-amber-500"
        />
        <button
          type="submit"
          className="px-4 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 rounded border border-amber-500/30 transition-colors"
        >
          Send
        </button>
      </form>
    </div>
  );
}

function ChatMessage({ message }: { message: ChatMessage }) {
  const messageStyles = {
    public: 'bg-black/30 border-amber-500/20',
    werewolf: 'bg-black/30 border-amber-500/20',
    dead: 'bg-black/30 border-amber-500/20',
    system: 'bg-black/30 border-amber-500/20'
  };

  return (
    <div className={`p-2 rounded border ${messageStyles[message.type]}`}>
      <div className="flex items-center gap-2 mb-1">
        <img
          src={message.avatar}
          alt={message.playerName}
          className="w-6 h-6 rounded-full border border-amber-500/30"
        />
        <span className="text-amber-200 text-sm font-medium">
          {message.playerName}
        </span>
        <span className="text-amber-200/50 text-xs">
          {new Date(message.timestamp).toLocaleTimeString()}
        </span>
      </div>
      <p className="text-amber-200/80">{message.content}</p>
    </div>
  );
}