use starkwolf::models::{Player, Role, Phase, GameState};
use starknet::{ContractAddress};

#[starknet::interface]
pub trait IActions<T> {
    fn start_game(ref self: T, game_id: u32, players: Array<ContractAddress>);
    fn vote(ref self: T, game_id: u32, target: ContractAddress);
    fn werewolf_action(ref self: T, game_id: u32, target: ContractAddress);
    fn witch_action(ref self: T, game_id: u32, heal_target: Option<ContractAddress>, kill_target: Option<ContractAddress>);
    fn guard_action(ref self: T, game_id: u32, target: ContractAddress);
    fn seer_action(ref self: T, game_id: u32, target: ContractAddress) -> Role;
    fn hunter_action(ref self: T, game_id: u32, target: ContractAddress);
    fn cupid_action(ref self: T, game_id: u32, lover1: ContractAddress, lover2: ContractAddress);
}

#[dojo::contract]
pub mod actions {
    use super::{IActions, Player, Role, Phase, GameState, Vote};
    use starknet::{ContractAddress, get_caller_address};
    use dojo::model::{ModelStorage};
    use dojo::event::EventStorage;

    #[derive(Copy, Drop, Serde)]
    #[dojo::event]
    pub struct PlayerEliminated {
        #[key]
        pub game_id: u32,
        pub player: ContractAddress,
    }

    #[derive(Copy, Drop, Serde)]
    #[dojo::event]
    pub struct GameStarted {
        #[key]
        pub game_id: u32,
        pub player_count: u8,
    }

    #[derive(Copy, Drop, Serde)]
    #[dojo::event]
    pub struct LoversPaired {
        #[key]
        pub game_id: u32,
        pub lover1: ContractAddress,
        pub lover2: ContractAddress,
    }

    #[abi(embed_v0)]
    impl ActionsImpl of IActions<ContractState> {
        fn start_game(ref self: ContractState, game_id: u32, players: Array<ContractAddress>) {
            let mut world = self.world_default();
            let game: GameState = world.read_model(game_id);
            assert(game.phase == Phase::Lobby, 'game already started');

            let player_count = players.len();
            assert(player_count >= 6, 'need at least 6 players');

            let mut i = 0;
            let mut werewolves = 0;
            loop {
                if i >= player_count {
                    break;
                }
                let player_addr = *players[i];
                let role = match i {
                    0 => Role::Werewolf,
                    1 => Role::Witch,
                    2 => Role::Guard,
                    3 => Role::Seer,
                    4 => Role::Hunter,
                    5 => Role::Cupid,
                    _ => Role::Villager,
                };
                if role == Role::Werewolf {
                    werewolves += 1;
                }
                let player = Player {
                    game_id,
                    address: player_addr,
                    role,
                    is_alive: true,
                    has_voted: false,
                    is_protected: false,
                    lover_target: Option::None,
                    witch_life_potion: if role == Role::Witch { true } else { false },
                    witch_death_potion: if role == Role::Witch { true } else { false },
                };
                world.write_model(@player);
                i += 1;
            };

            let new_game = GameState {
                game_id,
                phase: Phase::Night,
                players_alive: player_count.try_into().unwrap(),
                werewolves_alive: werewolves,
                day_count: 0,
                phase_start_timestamp: starknet::get_block_timestamp(),
                day_duration: 120,
                night_action_duration: 20,
            };
            world.write_model(@new_game);

            world.emit_event(@GameStarted { game_id, player_count: player_count.try_into().unwrap() });
        }

        fn vote(ref self: ContractState, game_id: u32, target: ContractAddress) {
            let mut world = self.world_default();
            let caller = get_caller_address();

            let game: GameState = world.read_model(game_id);
            assert(game.phase == Phase::Day, 'not day phase');
            assert(self.is_phase_time_valid(game), 'day phase expired');

            let mut voter: Player = world.read_model((game_id, caller));
            let mut target_player: Player = world.read_model((game_id, target));
            assert(voter.is_alive, 'voter is dead');
            assert(target_player.is_alive, 'target is dead');
            assert(!voter.has_voted, 'already voted');

            target_player.is_alive = false;
            voter.has_voted = true;
            world.write_model(@target_player);
            world.write_model(@voter);

            if target_player.lover_target != Option::None {
                if let Option::Some(lover_addr) = target_player.lover_target {
                    let mut lover: Player = world.read_model((game_id, lover_addr));
                    if lover.is_alive {
                        lover.is_alive = false;
                        world.write_model(@lover);
                    }
                }
            }

            let mut new_game = game;
            new_game.players_alive -= 1;
            if target_player.role == Role::Werewolf {
                new_game.werewolves_alive -= 1;
            }
            new_game.phase = if new_game.werewolves_alive == 0 || new_game.werewolves_alive >= new_game.players_alive {
                Phase::Ended
            } else {
                Phase::Night
            };
            new_game.phase_start_timestamp = starknet::get_block_timestamp();
            world.write_model(@new_game);

            world.emit_event(@PlayerEliminated { game_id, player: target });
        }

        fn werewolf_action(ref self: ContractState, game_id: u32, target: ContractAddress) {
            let mut world = self.world_default();
            let caller = get_caller_address();

            let game: GameState = world.read_model(game_id);
            assert(game.phase == Phase::Night, 'not night phase');
            assert(self.is_phase_time_valid(game), 'night action expired');

            let mut killer: Player = world.read_model((game_id, caller));
            let mut target_player: Player = world.read_model((game_id, target));
            assert(killer.role == Role::Werewolf, 'not a werewolf');
            assert(killer.is_alive, 'killer is dead');
            assert(target_player.is_alive, 'target is dead');
            assert(!target_player.is_protected, 'target is protected');

            target_player.is_alive = false;
            world.write_model(@target_player);

            if target_player.lover_target != Option::None {
                if let Option::Some(lover_addr) = target_player.lover_target {
                    let mut lover: Player = world.read_model((game_id, lover_addr));
                    if lover.is_alive {
                        lover.is_alive = false;
                        world.write_model(@lover);
                    }
                }
            }

            let mut new_game = game;
            new_game.players_alive -= 1;
            new_game.phase = Phase::Day;
            new_game.day_count += 1;
            new_game.phase_start_timestamp = starknet::get_block_timestamp();
            world.write_model(@new_game);

            world.emit_event(@PlayerEliminated { game_id, player: target });
        }

        fn witch_action(ref self: ContractState, game_id: u32, heal_target: Option<ContractAddress>, kill_target: Option<ContractAddress>) {
            let mut world = self.world_default();
            let caller = get_caller_address();
        
            let game: GameState = world.read_model(game_id);
            assert(game.phase == Phase::Night, 'not night phase');
            assert(self.is_phase_time_valid(game), 'night action expired');
        
            let mut witch: Player = world.read_model((game_id, caller));
            assert(witch.role == Role::Witch, 'not a witch');
            assert(witch.is_alive, 'witch is dead');
        
            if let Option::Some(target_addr) = heal_target {
                if witch.witch_life_potion {
                    let mut target: Player = world.read_model((game_id, target_addr));
                    if !target.is_alive {
                        target.is_alive = true;
                        witch.witch_life_potion = false;
                        world.write_model(@target);
                        world.write_model(@witch);
                    }
                }
            }
        
            if let Option::Some(target_addr) = kill_target {
                if witch.witch_death_potion {
                    let mut target: Player = world.read_model((game_id, target_addr));
                    if target.is_alive {
                        target.is_alive = false;
                        witch.witch_death_potion = false;
                        world.write_model(@target);
                        world.write_model(@witch);
                        world.emit_event(@PlayerEliminated { game_id, player: target_addr });
                    }
                }
            }
        
            let mut new_game = game;
            new_game.phase_start_timestamp = starknet::get_block_timestamp();
            world.write_model(@new_game);
        }

        fn guard_action(ref self: ContractState, game_id: u32, target: ContractAddress) {
            let mut world = self.world_default();
            let caller = get_caller_address();
        
            let game: GameState = world.read_model(game_id);
            assert(game.phase == Phase::Night, 'not night phase');
            assert(self.is_phase_time_valid(game), 'night action expired');
        
            let guard: Player = world.read_model((game_id, caller));
            assert(guard.role == Role::Guard, 'not a guard');
            assert(guard.is_alive, 'guard is dead');
        
            let mut target_player: Player = world.read_model((game_id, target));
            assert(target_player.is_alive, 'target is dead');
            target_player.is_protected = true;
            world.write_model(@target_player);
        
            let mut new_game = game;
            new_game.phase_start_timestamp = starknet::get_block_timestamp();
            world.write_model(@new_game);
        }

        fn seer_action(ref self: ContractState, game_id: u32, target: ContractAddress) -> Role {
            let mut world = self.world_default();
            let caller = get_caller_address();
        
            let game: GameState = world.read_model(game_id);
            assert(game.phase == Phase::Night, 'not night phase');
            assert(self.is_phase_time_valid(game), 'night action expired');
        
            let seer: Player = world.read_model((game_id, caller));
            assert(seer.role == Role::Seer, 'not a seer');
            assert(seer.is_alive, 'seer is dead');
        
            let target_player: Player = world.read_model((game_id, target));
            assert(target_player.is_alive, 'target is dead');
        
            let mut new_game = game;
            new_game.phase_start_timestamp = starknet::get_block_timestamp();
            world.write_model(@new_game);
        
            target_player.role
        }

        fn hunter_action(ref self: ContractState, game_id: u32, target: ContractAddress) {
            let mut world = self.world_default();
            let caller = get_caller_address();
        
            let mut hunter: Player = world.read_model((game_id, caller));
            assert(hunter.role == Role::Hunter, 'not a hunter');
            assert(!hunter.is_alive, 'hunter must be dead');
        
            let mut target_player: Player = world.read_model((game_id, target));
            assert(target_player.is_alive, 'target is dead');
        
            target_player.is_alive = false;
            world.write_model(@target_player);
        
            let game: GameState = world.read_model(game_id);
            let mut new_game = game;
            new_game.phase_start_timestamp = starknet::get_block_timestamp();
            world.write_model(@new_game);
        
            world.emit_event(@PlayerEliminated { game_id, player: target });
        }

        fn cupid_action(ref self: ContractState, game_id: u32, lover1: ContractAddress, lover2: ContractAddress) {
            let mut world = self.world_default();
            let caller = get_caller_address();
        
            let game: GameState = world.read_model(game_id);
            assert(game.phase == Phase::Night, 'not night phase');
            assert(self.is_phase_time_valid(game), 'night action expired');
        
            let cupid: Player = world.read_model((game_id, caller));
            assert(cupid.role == Role::Cupid, 'not cupid');
            assert(cupid.is_alive, 'cupid is dead');
        
            let mut player1: Player = world.read_model((game_id, lover1));
            let mut player2: Player = world.read_model((game_id, lover2));
            assert(player1.is_alive && player2.is_alive, 'lovers must be alive');
            assert((player1.lover_target == Option::None) && (player2.lover_target == Option::None), 'already lovers');
        
            player1.lover_target = Option::Some(lover2);
            player2.lover_target = Option::Some(lover1);
        
            world.write_model(@player1);
            world.write_model(@player2);
        
            let mut new_game = game;
            new_game.phase_start_timestamp = starknet::get_block_timestamp();
            world.write_model(@new_game);
        
            world.emit_event(@LoversPaired { game_id, lover1, lover2 });
        }
    }

    #[generate_trait]
    impl InternalImpl of InternalTrait {
        fn world_default(self: @ContractState) -> dojo::world::WorldStorage {
            self.world(@"starkwolf")
        }

        fn get_current_timestamp(self: @ContractState) -> u64 {
            starknet::get_block_timestamp()
        }
    
        fn is_phase_time_valid(self: @ContractState, game: GameState) -> bool {
            let current_time = self.get_current_timestamp();
            let duration = if game.phase == Phase::Day { game.day_duration } else { game.night_action_duration };
            current_time <= game.phase_start_timestamp + duration
        }
    }
}