use starkwolf::models::{Player, Role, Phase, GameState, Vote, WitchPotions};
use starknet::{ContractAddress};

#[starknet::interface]
pub trait IActions<T> {
    fn start_game(ref self: T, game_id: u32, players: Span<ContractAddress>);
    fn vote(ref self: T, game_id: u32, target: ContractAddress);
    fn night_action(ref self: T, game_id: u32, target: ContractAddress);
    fn cupid_action(ref self: T, game_id: u32, lover1: ContractAddress, lover2: ContractAddress);
    fn hunter_action(ref self: T, game_id: u32, target: ContractAddress);
    fn witch_action(ref self: T, game_id: u32, target: ContractAddress, heal_potion: bool, kill_potion: bool);
    fn pass_night(ref self: T, game_id: u32);
    fn end_voting(ref self: T, game_id: u32);
    fn pass_day(ref self: T, game_id: u32);
}

#[dojo::contract]
pub mod actions {
    use super::{IActions, Player, Role, Phase, GameState, Vote, WitchPotions, GuardProtection};
    use starknet::{ContractAddress, get_caller_address};
    use dojo::model::{ModelStorage};
    use dojo::event::EventStorage;

    #[derive(Copy, Drop, Serde)]
    #[dojo::event]
    pub struct PlayerEliminated {
        #[key]
        pub game_id: u32,
        pub player: ContractAddress,
        pub role: Role,
    }

    #[derive(Copy, Drop, Serde)]
    #[dojo::event]
    pub struct GameStarted {
        #[key]
        pub game_id: u32,
        pub player_count: u8,
        pub werewolf_count: u8,
    }

    #[derive(Copy, Drop, Serde)]
    #[dojo::event]
    pub struct LoversPaired {
        #[key]
        pub game_id: u32,
        pub lover1: ContractAddress,
        pub lover2: ContractAddress,
    }

    #[derive(Copy, Drop, Serde)]
    #[dojo::event]
    pub struct HunterShot {
        #[key]
        pub game_id: u32,
        pub hunter: ContractAddress,
        pub target: ContractAddress,
    }

    #[derive(Copy, Drop, Serde)]
    #[dojo::event]
    pub struct GameEnded {
        #[key]
        pub game_id: u32,
        pub winner: felt252,
    }

    #[abi(embed_v0)]
    impl ActionsImpl of IActions<ContractState> {
        fn start_game(ref self: ContractState, game_id: u32, players: Span<ContractAddress>) {
            let mut world = self.world_default();
            let game: GameState = world.read_model(game_id);
            assert(game.phase == Phase::Lobby, 'Game started');

            let player_count = players.len();
            assert(player_count >= 6, 'Min 6 players');
            assert(player_count <= 12, 'Max 12 players');

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
                night_action_duration: 30,
                players: player_addresses,
            };
            world.write_model(@new_game);

            world.emit_event(@GameStarted { game_id, player_count: player_count.try_into().unwrap() });
        }

        fn vote(ref self: ContractState, game_id: u32, target: ContractAddress) {
            let mut world = self.world_default();
            let caller = get_caller_address();
            let game: GameState = world.read_model(game_id);
            assert(game.phase == Phase::Day, 'Day only');
            assert(self.is_phase_time_valid(@game), 'Day expired');

            let mut voter: Player = world.read_model((game_id, caller));
            let target_player: Player = world.read_model((game_id, target));
            assert(voter.is_alive, 'Voter dead');
            assert(target_player.is_alive, 'Target dead');

            if voter.has_voted {
                let mut current_vote: Vote = world.read_model((game_id, caller));
                if current_vote.target == target {
                    voter.has_voted = false;
                    world.write_model(@voter);
                } else {
                    current_vote.target = target;
                    world.write_model(@current_vote);
                }
            } else {
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
            assert(game.phase == Phase::Night, 'Night only');
            assert(self.is_phase_time_valid(@game), 'Night expired');

            let mut player: Player = world.read_model((game_id, caller));
            assert(player.is_alive, 'Player dead');

            match player.role {
                Role::Werewolf => {
                    let target_player: Player = world.read_model((game_id, target));
                    assert(target_player.is_alive, 'Target dead');
                    assert(!target_player.is_protected, 'Target protected');
                    if target_player.is_alive && !target_player.is_protected {
                        self.kill_player(game_id, target, false);
                    }
                },
                Role::Guard => {
                    let mut target_player: Player = world.read_model((game_id, target));
                    assert(target_player.is_alive, 'Target dead');
                    
                    let guard_protection: GuardProtection = world.read_model(game_id);
                    assert(guard_protection.last_protected != target, 'Protected last night');
                    
                    target_player.is_protected = true;
                    world.write_model(@target_player);
                    
                    let new_guard_protection = GuardProtection {
                        game_id,
                        last_protected: target,
                    };
                    world.write_model(@new_guard_protection);
                },
                _ => assert(false, 'Invalid role'),
            };
        }

        fn cupid_action(ref self: ContractState, game_id: u32, lover1: ContractAddress, lover2: ContractAddress) {
            let mut world = self.world_default();
            let caller = get_caller_address();
            let game: GameState = world.read_model(game_id);
            assert(game.phase == Phase::Night, 'Night only');
            assert(game.day_count == 0, 'Cupid can only play night 0');
            assert(self.is_phase_time_valid(@game), 'Night expired');

            let cupid: Player = world.read_model((game_id, caller));
            assert(cupid.role == Role::Cupid, 'Not Cupid');
            assert(cupid.is_alive, 'Cupid dead');

            let mut player1: Player = world.read_model((game_id, lover1));
            let mut player2: Player = world.read_model((game_id, lover2));
            assert(player1.is_alive && player2.is_alive, 'Lovers dead');
            assert(player1.lover_target.is_none() && player2.lover_target.is_none(), 'Already paired');

            player1.lover_target = Option::Some(lover2);
            player2.lover_target = Option::Some(lover1);
            world.write_model(@player1);
            world.write_model(@player2);

            world.emit_event(@LoversPaired { game_id, lover1, lover2 });
        }

        fn hunter_action(ref self: ContractState, game_id: u32, target: ContractAddress) {
            let mut world = self.world_default();
            let caller = get_caller_address();
            let game: GameState = world.read_model(game_id);
            assert(game.phase == Phase::Day, 'Day only');
        
            let mut hunter: Player = world.read_model((game_id, caller));
            assert(hunter.role == Role::Hunter, 'Not Hunter');
            
            // Le chasseur doit être "actif" (tué récemment mais pas encore totalement mort)
            // ou bien il doit avoir été tué pendant le vote du jour
            let current_time = self.get_current_timestamp();
            assert(current_time <= game.phase_start_timestamp + 30, 'Hunter too late');
        
            let target_player: Player = world.read_model((game_id, target));
            assert(target_player.is_alive, 'Target dead');
        
            self.kill_player(game_id, target, false);
            world.emit_event(@HunterShot { game_id, hunter: caller, target });
        
            // Marquer le chasseur comme complètement mort
            hunter.is_alive = false;
            world.write_model(@hunter);
            
            // Vérifier si le jeu est terminé
            self.check_game_end(game_id);
        }

        fn witch_action(ref self: ContractState, game_id: u32, target: ContractAddress, heal_potion: bool, kill_potion: bool) {
            let mut world = self.world_default();
            let caller = get_caller_address();
            let game: GameState = world.read_model(game_id);
            assert(game.phase == Phase::Night, 'Night only');
            assert(self.is_phase_time_valid(@game), 'Night expired');

            let mut witch: Player = world.read_model((game_id, caller));
            assert(witch.role == Role::Witch, 'Not Witch');
            assert(witch.is_alive, 'Witch dead');
            assert(!(heal_potion && kill_potion), 'One potion only');

            let mut potions: WitchPotions = world.read_model(game_id);
            let mut target_player: Player = world.read_model((game_id, target));

            if kill_potion && target_player.is_alive && !target_player.is_protected && potions.has_death_potion {
                potions.has_death_potion = false;
                world.write_model(@potions);
                
                // Si la cible est le chasseur, il aura une chance de tirer
                let is_hunter = target_player.role == Role::Hunter;
                
                self.kill_player(game_id, target, false);
                
                // Si un chasseur a été tué, marquer qu'il a une opportunité de tirer
                if is_hunter {
                    let mut game: GameState = world.read_model(game_id);
                    // Activer le "mode chasseur" pour la prochaine phase jour
                    game.day_duration = 30; // Le chasseur aura 30 secondes
                    world.write_model(@game);
                }
            } else if heal_potion && !target_player.is_alive && potions.has_life_potion {
                potions.has_life_potion = false;
                world.write_model(@potions);
                target_player.is_alive = true;
                world.write_model(@target_player);
                
                // Mettre à jour le compteur de joueurs vivants
                let mut game: GameState = world.read_model(game_id);
                game.players_alive += 1;
                if target_player.role == Role::Werewolf {
                    game.werewolves_alive += 1;
                }
                world.write_model(@game);
            }
        }

        fn pass_night(ref self: ContractState, game_id: u32) {
            let mut world = self.world_default();
            let mut game: GameState = world.read_model(game_id);
            assert(game.phase == Phase::Night, 'Night only');

            // Réinitialiser les protections du garde
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

            // Vérifier si le jeu est terminé après les actions de nuit
            self.check_game_end(game_id);
            
            // Récupérer l'état du jeu potentiellement mis à jour
            game = world.read_model(game_id);
            if game.phase == Phase::Ended {
                return;
            }

            // Passer au jour
            game.phase = Phase::Day;
            game.day_count += 1;
            game.phase_start_timestamp = starknet::get_block_timestamp();
            game.day_duration = 120;
            world.write_model(@game);
        }

        fn end_voting(ref self: ContractState, game_id: u32) {
            let mut world = self.world_default();
            let mut game: GameState = world.read_model(game_id);
            assert(game.phase == Phase::Day, 'Day only');
        
            // Gérer le vote du jour
            let target_to_kill = self.tally_votes(game_id, game.players.span());
            if target_to_kill != starknet::contract_address_const::<0x0>() {
                let target_player: Player = world.read_model((game_id, target_to_kill));
                if target_player.role == Role::Hunter && target_player.is_alive {
                    // Phase spéciale pour le chasseur
                    game.day_duration = 30;
                    game.phase_start_timestamp = starknet::get_block_timestamp();
                    world.write_model(@game);
                    return; // Ne termine pas encore le vote, attend hunter_action ou timeout
                } else {
                    self.kill_player(game_id, target_to_kill, true);
                }
            }
        
            // Réinitialiser les votes
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
        
            // Gérer le timeout du chasseur s'il n'a pas agi
            let current_time = self.get_current_timestamp();
            if game.day_duration == 30 && current_time > game.phase_start_timestamp + 30 {
                let mut i = 0;
                loop {
                    if i >= game.players.len() {
                        break;
                    }
                    let player: Player = world.read_model((game_id, *game.players[i]));
                    if player.role == Role::Hunter && player.is_alive { 
                        self.kill_player(game_id, *game.players[i], false);
                        break;
                    }
                    i += 1;
                };
            }
            
            // Vérifier si le jeu est terminé
            self.check_game_end(game_id);
            
            // Récupérer l'état du jeu potentiellement mis à jour
            game = world.read_model(game_id);
            world.write_model(@game);
        }

        fn pass_day(ref self: ContractState, game_id: u32) {
            let mut world = self.world_default();
            let mut game: GameState = world.read_model(game_id);
            assert(game.phase == Phase::Day, 'Day only');

            // Vérifier si le jeu est terminé
            self.check_game_end(game_id);
            
            // Récupérer l'état du jeu potentiellement mis à jour
            game = world.read_model(game_id);
            if game.phase == Phase::Ended {
                return;
            }

            // Passer à la nuit
            game.phase = Phase::Night;
            game.phase_start_timestamp = starknet::get_block_timestamp();
            game.night_action_duration = 30;
            world.write_model(@game);
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
            assert(target_player.is_alive, 'Target dead');
            if !from_voting {
                assert(!target_player.is_protected, 'Target protected');
            }

            let mut game: GameState = world.read_model(game_id);
            target_player.is_alive = false;
            world.write_model(@target_player);
            world.emit_event(@PlayerEliminated { 
                game_id, 
                player: target,
                role: target_player.role,
            });
            game.players_alive -= 1;

            if let Option::Some(lover_addr) = target_player.lover_target {
                let mut lover: Player = world.read_model((game_id, lover_addr));
                if lover.is_alive {
                    lover.is_alive = false;
                    world.write_model(@lover);
                    world.emit_event(@PlayerEliminated { 
                        game_id, 
                        player: lover_addr,
                        role: lover.role,
                    });
                    game.players_alive -= 1;
                    if lover.role == Role::Werewolf {
                        game.werewolves_alive -= 1;
                    }
                }
            }

            if target_player.role == Role::Werewolf {
                game.werewolves_alive -= 1;
            }

            world.write_model(@game);
        }

        fn check_game_end(ref self: ContractState, game_id: u32) {
            let mut world = self.world_default();
            let mut game: GameState = world.read_model(game_id);
            
            // Vérifier les conditions de fin du jeu
            if game.werewolves_alive == 0 {
                // Les villageois gagnent
                game.phase = Phase::Ended;
                world.write_model(@game);
                world.emit_event(@GameEnded { game_id, winner: 'villagers' });
            } else if game.werewolves_alive >= (game.players_alive - game.werewolves_alive) {
                // Les loups-garous gagnent
                game.phase = Phase::Ended;
                world.write_model(@game);
                world.emit_event(@GameEnded { game_id, winner: 'werewolves' });
            }
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

            // Vérifier s'il y a un gagnant clair ou une égalité
            let mut max_votes = 0;
            let mut max_count = 0;
            let mut target_to_kill = starknet::contract_address_const::<0x0>();
            
            i = 0;
            loop {
                if i >= vote_counts.len() {
                    break;
                }
                if *vote_counts[i] > max_votes {
                    max_votes = *vote_counts[i];
                    target_to_kill = *vote_targets[i];
                    max_count = 1;
                } else if *vote_counts[i] == max_votes {
                    max_count += 1; // Il y a égalité
                }
                i += 1;
            };
            
            // En cas d'égalité, personne n'est éliminé
            if max_count > 1 {
                return starknet::contract_address_const::<0x0>();
            }
            
            target_to_kill
        }
    }
}