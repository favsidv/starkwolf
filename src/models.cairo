use starknet::{ContractAddress};

#[derive(Copy, Drop, Serde, Debug)]
#[dojo::model]
pub struct Player {
    #[key]
    pub game_id: u32,
    #[key]
    pub address: ContractAddress,
    pub role: Role,
    pub is_alive: bool,
    pub has_voted: bool,
    pub is_protected: bool,
    pub is_lover: bool,
    pub lover_target: Option<ContractAddress>,
    pub witch_life_potion: bool,
    pub witch_death_potion: bool,
}

#[derive(Copy, Drop, Serde, Debug)]
#[dojo::model]
pub struct GameState {
    #[key]
    pub game_id: u32,
    pub phase: Phase,
    pub players_alive: u8,
    pub werewolves_alive: u8,
    pub day_count: u8,
}

#[derive(Serde, Copy, Drop, Introspect, PartialEq, Debug)]
pub enum Role {
    Villager,
    Werewolf,
    Witch,
    Guard,
    Seer,
    Hunter,
    Cupid,
}

#[derive(Serde, Copy, Drop, Introspect, PartialEq, Debug)]
pub enum Phase {
    Lobby,
    Night,
    Day,
    Ended,
}

impl RoleIntoFelt252 of Into<Role, felt252> {
    fn into(self: Role) -> felt252 {
        match self {
            Role::Villager => 0,
            Role::Werewolf => 1,
            Role::Witch => 2,
            Role::Guard => 3,
            Role::Seer => 4,
            Role::Hunter => 5,
            Role::Cupid => 6,
        }
    }
}

impl PhaseIntoFelt252 of Into<Phase, felt252> {
    fn into(self: Phase) -> felt252 {
        match self {
            Phase::Lobby => 0,
            Phase::Night => 1,
            Phase::Day => 2,
            Phase::Ended => 3,
        }
    }
}

// #[cfg(test)]
// mod tests {
//     use super::{Player, GameState, Role, Phase};

//     #[test]
//     fn test_initial_player() {
//         let player = Player {
//             game_id: 1,
//             address: starknet::contract_address_const::<0x0>(),
//             role: Role::Villager,
//             is_alive: true,
//             has_voted: false,
//             is_protected: false,
//             is_lover: false,
//             lover_target: Option::None,
//             witch_life_potion: true,
//             witch_death_potion: true,
//         };
//         assert(player.is_alive, 'player should be alive');
//         assert(!player.has_voted, 'player should not have voted');
//     }

//     #[test]
//     fn test_initial_game_state() {
//         let game = GameState {
//             game_id: 1,
//             phase: Phase::Lobby,
//             players_alive: 0,
//             werewolves_alive: 0,
//             day_count: 0,
//         };
//         assert(game.phase == Phase::Lobby, 'wrong initial phase');
//     }
// }