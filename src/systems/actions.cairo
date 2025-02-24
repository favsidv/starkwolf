use starkwolf::models::{Player, Role, Phase, GameState, Vote, WitchPotions};
use starknet::{ContractAddress};

#[starknet::interface]
pub trait IActions<T> {
    fn start_game(ref self: T, game_id: u32, players: Span<ContractAddress>);
    fn vote(ref self: T, game_id: u32, target: ContractAddress);
    fn night_action(ref self: T, game_id: u32, target: ContractAddress);
    fn cupid_action(ref self: T, game_id: u32, lover1: ContractAddress, lover2: ContractAddress);
    fn end_voting(ref self: T, game_id: u32);
}

#[dojo::contract]
pub mod actions {
    use super::{IActions, Player, Role, Phase, GameState, Vote, WitchPotions};
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
        fn start_game(ref self: ContractState, game_id: u32, players: Span<ContractAddress>) {
            let mut world = self.world_default();
            let game: GameState = world.read_model(game_id);
            assert(game.phase == Phase::Lobby, 'E01');

            let player_count = players.len();
            assert(player_count >= 6, 'E02');

            let mut i = 0;
            let mut werewolves = 0;
            let mut player_addresses = array![];
            loop {
                if i >= player_count {
                    break;
                }
                let player_addr = *players[i];
                player_addresses.append(player_addr);
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
                };
                world.write_model(@player);
                i += 1;
            };

            let witch_potions = WitchPotions {
                game_id,
                has_life_potion: true,
                has_death_potion: true,
            };
            world.write_model(@witch_potions);

            let new_game = GameState {
                game_id,
                phase: Phase::Night,
                players_alive: player_count.try_into().unwrap(),
                werewolves_alive: werewolves,
                day_count: 0,
                phase_start_timestamp: starknet::get_block_timestamp(),
                day_duration: 120,
                night_action_duration: 35,
                players: player_addresses,
            };
            world.write_model(@new_game);

            world.emit_event(@GameStarted { game_id, player_count: player_count.try_into().unwrap() });
        }

        fn vote(ref self: ContractState, game_id: u32, target: ContractAddress) {
            let mut world = self.world_default();
            let caller = get_caller_address();
            let game: GameState = world.read_model(game_id);
            assert(game.phase == Phase::Day, 'E03');
            assert(self.is_phase_time_valid(@game), 'E04');
        
            let mut voter: Player = world.read_model((game_id, caller));
            let target_player: Player = world.read_model((game_id, target));
            assert(voter.is_alive, 'E05');
            assert(target_player.is_alive, 'E06');
        
            if voter.has_voted {
                let mut current_vote: Vote = world.read_model((game_id, caller));
                if current_vote.target == target {
                    // Unvote if the same target is voted again
                    voter.has_voted = false;
                    world.write_model(@voter);
                } else {
                    // Change vote if a different target is voted
                    current_vote.target = target;
                    world.write_model(@current_vote);
                }
            } else {
                // New vote if no previous vote exists
                let vote = Vote { game_id, voter: caller, target };
                world.write_model(@vote);
                voter.has_voted = true;
                world.write_model(@voter);
            }
        }                        

        fn night_action(ref self: ContractState, game_id: u32, target: ContractAddress) {
            let mut world = self.world_default();
            let caller = get_caller_address();
            let game: GameState = world.read_model(game_id);
            assert(game.phase == Phase::Night, 'E08');
            assert(self.is_phase_time_valid(@game), 'E09');

            let mut player: Player = world.read_model((game_id, caller));
            assert(player.is_alive, 'E10');

            match player.role {
                Role::Werewolf => {
                    let target_player: Player = world.read_model((game_id, target));
                    if !target_player.is_protected && target_player.is_alive {
                        self.kill_player(game_id, target, false);
                    }
                },
                Role::Witch => {
                    let mut potions: WitchPotions = world.read_model(game_id);
                    let mut target_player: Player = world.read_model((game_id, target));
                    if target_player.is_alive && potions.has_death_potion {
                        potions.has_death_potion = false;
                        world.write_model(@potions);
                        self.kill_player(game_id, target, false);
                    } else if !target_player.is_alive && potions.has_life_potion {
                        potions.has_life_potion = false;
                        world.write_model(@potions);
                        target_player.is_alive = true;
                        world.write_model(@target_player);
                    }
                },
                Role::Guard => {
                    let mut target_player: Player = world.read_model((game_id, target));
                    assert(target_player.is_alive, 'E11');
                    let mut i = 0;
                    loop {
                        if i >= game.players.len() {
                            break;
                        }
                        let mut p: Player = world.read_model((game_id, *game.players[i]));
                        p.is_protected = false;
                        world.write_model(@p);
                        i += 1;
                    };
                    target_player.is_protected = true;
                    world.write_model(@target_player);
                },
                Role::Hunter => {
                    assert(!player.is_alive, 'E12');
                    self.kill_player(game_id, target, false);
                },
                _ => assert(false, 'E13'),
            };

            let updated_game: GameState = world.read_model(game_id);
            let mut new_game = GameState {
                game_id: game.game_id,
                phase: if player.role == Role::Werewolf { Phase::Day } else { Phase::Night },
                players_alive: updated_game.players_alive,
                werewolves_alive: updated_game.werewolves_alive,
                day_count: if player.role == Role::Werewolf { game.day_count + 1 } else { game.day_count },
                phase_start_timestamp: starknet::get_block_timestamp(),
                day_duration: game.day_duration,
                night_action_duration: game.night_action_duration,
                players: game.players.clone(),
            };
            if player.role == Role::Werewolf {
                let mut i = 0;
                loop {
                    if i >= game.players.len() {
                        break;
                    }
                    let mut p: Player = world.read_model((game_id, *game.players[i]));
                    p.is_protected = false;
                    world.write_model(@p);
                    i += 1;
                };
            }
            world.write_model(@new_game);
        }

        fn cupid_action(ref self: ContractState, game_id: u32, lover1: ContractAddress, lover2: ContractAddress) {
            let mut world = self.world_default();
            let caller = get_caller_address();
            let game: GameState = world.read_model(game_id);
            assert(game.phase == Phase::Night, 'E19');
            assert(self.is_phase_time_valid(@game), 'E20');

            let cupid: Player = world.read_model((game_id, caller));
            assert(cupid.role == Role::Cupid, 'E21');
            assert(cupid.is_alive, 'E22');

            let mut player1: Player = world.read_model((game_id, lover1));
            let mut player2: Player = world.read_model((game_id, lover2));
            assert(player1.is_alive && player2.is_alive, 'E23');
            assert((player1.lover_target == Option::None) && (player2.lover_target == Option::None), 'E24');

            player1.lover_target = Option::Some(lover2);
            player2.lover_target = Option::Some(lover1);
            world.write_model(@player1);
            world.write_model(@player2);

            let mut new_game = GameState {
                game_id: game.game_id,
                phase: game.phase,
                players_alive: game.players_alive,
                werewolves_alive: game.werewolves_alive,
                day_count: game.day_count,
                phase_start_timestamp: starknet::get_block_timestamp(),
                day_duration: game.day_duration,
                night_action_duration: game.night_action_duration,
                players: game.players.clone(),
            };
            world.write_model(@new_game);

            world.emit_event(@LoversPaired { game_id, lover1, lover2 });
        }

        fn end_voting(ref self: ContractState, game_id: u32) {
            let mut world = self.world_default();
            let game: GameState = world.read_model(game_id);
            assert(game.phase == Phase::Day, 'E25');

            let mut target_to_kill = self.tally_votes(game_id, game.players.span());
            if target_to_kill != starknet::contract_address_const::<0x0>() {
                self.kill_player(game_id, target_to_kill, true);
            }

            let updated_game: GameState = world.read_model(game_id);
            let mut i = 0;
            loop {
                if i >= game.players.len() {
                    break;
                }
                let mut voter: Player = world.read_model((game_id, *game.players[i]));
                if voter.is_alive {
                    voter.has_voted = false;
                    world.write_model(@voter);
                }
                i += 1;
            };

            let mut new_game = GameState {
                game_id: game.game_id,
                phase: if updated_game.werewolves_alive == 0 || updated_game.werewolves_alive >= updated_game.players_alive {
                    Phase::Ended
                } else {
                    Phase::Night
                },
                players_alive: updated_game.players_alive,
                werewolves_alive: updated_game.werewolves_alive,
                day_count: game.day_count,
                phase_start_timestamp: starknet::get_block_timestamp(),
                day_duration: game.day_duration,
                night_action_duration: game.night_action_duration,
                players: game.players.clone(),
            };
            world.write_model(@new_game);
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

        fn is_phase_time_valid(self: @ContractState, game: @GameState) -> bool {
            let current_time = self.get_current_timestamp();
            let duration = if *game.phase == Phase::Day { *game.day_duration } else { *game.night_action_duration };
            current_time <= *game.phase_start_timestamp + duration
        }

        fn kill_player(ref self: ContractState, game_id: u32, target: ContractAddress, from_voting: bool) {
            let mut world = self.world_default();
            let mut target_player: Player = world.read_model((game_id, target));
            assert(target_player.is_alive, 'E26');
            if !from_voting {
                assert(!target_player.is_protected, 'E27');
            }

            target_player.is_alive = false;
            world.write_model(@target_player);
            world.emit_event(@PlayerEliminated { game_id, player: target });

            let mut game: GameState = world.read_model(game_id);
            game.players_alive -= 1;

            if let Option::Some(lover_addr) = target_player.lover_target {
                let mut lover: Player = world.read_model((game_id, lover_addr));
                if lover.is_alive {
                    lover.is_alive = false;
                    world.write_model(@lover);
                    world.emit_event(@PlayerEliminated { game_id, player: lover_addr });
                    game.players_alive -= 1;
                }
            }

            if target_player.role == Role::Werewolf {
                game.werewolves_alive -= 1;
            }
            world.write_model(@game);
        }

        fn tally_votes(self: @ContractState, game_id: u32, players: Span<ContractAddress>) -> ContractAddress {
            let mut world = self.world_default();
            let mut vote_targets: Array<ContractAddress> = array![];
            let mut vote_counts: Array<u8> = array![];
            let mut i = 0;

            loop {
                if i >= players.len() {
                    break;
                }
                let voter_addr = *players[i];
                let voter: Player = world.read_model((game_id, voter_addr));
                if voter.is_alive && voter.has_voted {
                    let vote: Vote = world.read_model((game_id, voter_addr));
                    let mut j = 0;
                    let mut found = false;
                    loop {
                        if j >= vote_targets.len() {
                            break;
                        }
                        if *vote_targets[j] == vote.target {
                            let mut new_counts = array![];
                            let mut k = 0;
                            loop {
                                if k >= vote_counts.len() {
                                    break;
                                }
                                if k == j {
                                    new_counts.append(*vote_counts[k] + 1);
                                } else {
                                    new_counts.append(*vote_counts[k]);
                                }
                                k += 1;
                            };
                            vote_counts = new_counts;
                            found = true;
                            break;
                        }
                        j += 1;
                    };
                    if !found {
                        vote_targets.append(vote.target);
                        vote_counts.append(1);
                    }
                }
                i += 1;
            };

            let mut max_votes = 0;
            let mut target_to_kill = starknet::contract_address_const::<0x0>();
            i = 0;
            loop {
                if i >= vote_counts.len() {
                    break;
                }
                if *vote_counts[i] > max_votes {
                    max_votes = *vote_counts[i];
                    target_to_kill = *vote_targets[i];
                }
                i += 1;
            };
            target_to_kill
        }
    }
}