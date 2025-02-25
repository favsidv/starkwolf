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
    pub lover_target: Option<ContractAddress>,
}

#[derive(Copy, Drop, Serde, Debug)]
#[dojo::model]
pub struct WitchPotions {
    #[key]
    pub game_id: u32,
    pub has_life_potion: bool,
    pub has_death_potion: bool,
}

#[derive(Copy, Drop, Serde, Debug)]
#[dojo::model]
struct GuardProtection {
    #[key]
    pub game_id: u32,
    pub last_protected: ContractAddress,
}

#[derive(Drop, Serde, Debug)]
#[dojo::model]
pub struct GameState {
    #[key]
    pub game_id: u32,
    pub phase: Phase,
    pub players_alive: u8,
    pub werewolves_alive: u8,
    pub day_count: u8,
    pub phase_start_timestamp: u64,
    pub day_duration: u64,
    pub night_action_duration: u64,
    pub players: Array<ContractAddress>,
}

#[derive(Copy, Drop, Serde, Debug)]
#[dojo::model]
pub struct Vote {
    #[key]
    pub game_id: u32,
    #[key]
    pub voter: ContractAddress,
    pub target: ContractAddress,
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
