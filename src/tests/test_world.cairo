#[cfg(test)]
mod tests {
    use core::fmt::{Display, Formatter, Error};

    use dojo_cairo_test::WorldStorageTestTrait;
    use dojo::model::{ModelStorage};
    use dojo::world::WorldStorageTrait;
    use dojo_cairo_test::{
        spawn_test_world, NamespaceDef, TestResource, ContractDefTrait, ContractDef,
    };

    use starkwolf::systems::actions::{actions, IActionsDispatcher, IActionsDispatcherTrait};
    use starkwolf::models::{Player, m_Player, GameState, m_GameState, m_Vote, WitchPotions, m_WitchPotions, Role, Phase};

    impl RoleDisplay of Display<Role> {
        fn fmt(self: @Role, ref f: Formatter) -> Result<(), Error> {
            let mut str: ByteArray = "Error";
            match self {
                Role::Villager => str = "Villager",
                Role::Werewolf => str = "Werewolf",
                Role::Witch => str = "Witch",
                Role::Guard => str = "Guard",
                Role::Seer => str = "Seer",
                Role::Hunter => str = "Hunter",
                Role::Cupid => str = "Cupid",
            }
            f.buffer.append(@str);
            Result::Ok(())
        }
    }

    fn namespace_def() -> NamespaceDef {
        let ndef = NamespaceDef {
            namespace: "starkwolf",
            resources: [
                TestResource::Model(m_Player::TEST_CLASS_HASH),
                TestResource::Model(m_GameState::TEST_CLASS_HASH),
                TestResource::Model(m_Vote::TEST_CLASS_HASH),
                TestResource::Model(m_WitchPotions::TEST_CLASS_HASH),
                TestResource::Event(actions::e_PlayerEliminated::TEST_CLASS_HASH),
                TestResource::Event(actions::e_GameStarted::TEST_CLASS_HASH),
                TestResource::Event(actions::e_LoversPaired::TEST_CLASS_HASH),
                TestResource::Event(actions::e_HunterShot::TEST_CLASS_HASH),
                TestResource::Contract(actions::TEST_CLASS_HASH),
            ].span(),
        };
        ndef
    }

    fn contract_defs() -> Span<ContractDef> {
        [
            ContractDefTrait::new(@"starkwolf", @"actions")
                .with_writer_of([dojo::utils::bytearray_hash(@"starkwolf")].span())
        ].span()
    }

    #[test]
    #[ignore]
    fn test_full_game_flow() {
        let werewolf = starknet::contract_address_const::<0x1>();
        let witch = starknet::contract_address_const::<0x2>();
        let guard = starknet::contract_address_const::<0x3>();
        let seer = starknet::contract_address_const::<0x4>();
        let hunter = starknet::contract_address_const::<0x5>();
        let cupid = starknet::contract_address_const::<0x6>();
        let villager = starknet::contract_address_const::<0x7>();

        let ndef = namespace_def();
        let mut world = spawn_test_world([ndef].span());
        world.sync_perms_and_inits(contract_defs());

        let (contract_address, _) = world.dns(@"actions").unwrap();
        let actions_system = IActionsDispatcher { contract_address };

        let players_array = array![werewolf, witch, guard, seer, hunter, cupid, villager];
        let players = players_array.span();
        actions_system.start_game(1, players);

        let game: GameState = world.read_model(1);
        assert(game.phase == Phase::Night, 'should start at night');
        assert(game.players_alive == 7, 'wrong initial player count');
        assert(game.werewolves_alive == 1, 'wrong werewolf count');
        let potions: WitchPotions = world.read_model(1);
        assert(potions.has_life_potion, 'witch should have life potion');
        assert(potions.has_death_potion, 'witch should have death potion');

        starknet::testing::set_contract_address(cupid);
        actions_system.cupid_action(1, villager, guard);
        let villager_state: Player = world.read_model((1, villager));
        let guard_state: Player = world.read_model((1, guard));
        assert(villager_state.lover_target == Option::Some(guard), 'villager not linked to guard');
        assert(guard_state.lover_target == Option::Some(villager), 'guard not linked to villager');

        starknet::testing::set_contract_address(guard);
        actions_system.night_action(1, seer);
        let seer_state: Player = world.read_model((1, seer));
        assert(seer_state.is_protected, 'seer should be protected');

        starknet::testing::set_contract_address(werewolf);
        actions_system.night_action(1, seer);
        let seer_state: Player = world.read_model((1, seer));
        assert(seer_state.is_alive, 'seer should still be alive');
        let game: GameState = world.read_model(1);
        assert(game.players_alive == 7, 'no one should be dead yet');

        starknet::testing::set_contract_address(witch);
        actions_system.witch_action(1, villager, false, true);
        let villager_state: Player = world.read_model((1, villager));
        let guard_state: Player = world.read_model((1, guard));
        assert(!villager_state.is_alive, 'villager should be dead');
        assert(!guard_state.is_alive, 'guard should be dead');
        let game: GameState = world.read_model(1);
        assert(game.players_alive == 5, 'v and g should be dead');

        actions_system.pass_night(1);
        let game: GameState = world.read_model(1);
        assert(game.phase == Phase::Day, 'should be day after pass_night');
        let seer_state: Player = world.read_model((1, seer));
        assert(!seer_state.is_protected, 'seer shouldn\'t be protected');

        starknet::testing::set_contract_address(werewolf);
        actions_system.vote(1, hunter);
        starknet::testing::set_contract_address(witch);
        actions_system.vote(1, hunter);
        starknet::testing::set_contract_address(seer);
        actions_system.vote(1, hunter);
        starknet::testing::set_contract_address(cupid);
        actions_system.vote(1, werewolf);
        actions_system.end_voting(1);
        let hunter_state: Player = world.read_model((1, hunter));
        let werewolf_state: Player = world.read_model((1, werewolf));
        assert(hunter_state.is_alive, 'hunter shouldn\'t be dead yet');
        assert(werewolf_state.is_alive, 'werewolf shouldn\'t be dead');
        let game: GameState = world.read_model(1);
        assert(game.phase == Phase::Day, 'should be day while hunter acts');
        assert(game.day_duration == 30, 'hunter phase should be 30s');

        starknet::testing::set_contract_address(hunter);
        actions_system.hunter_action(1, cupid);
        let hunter_state: Player = world.read_model((1, hunter));
        let cupid_state: Player = world.read_model((1, cupid));
        assert(!hunter_state.is_alive, 'hunter should be dead');
        assert(!cupid_state.is_alive, 'cupid should be dead');
        let game: GameState = world.read_model(1);
        assert(game.players_alive == 3, 'hunter and cupid should be dead');
        assert(game.phase == Phase::Day, 'still day until pass_day');

        actions_system.pass_day(1);
        let game: GameState = world.read_model(1);
        assert(game.phase == Phase::Night, 'should be night after pass_day');

        starknet::testing::set_contract_address(werewolf);
        actions_system.night_action(1, seer);
        let seer_state: Player = world.read_model((1, seer));
        assert(!seer_state.is_alive, 'seer should be dead');
        let game: GameState = world.read_model(1);
        assert(game.players_alive == 2, 'seer should be dead');

        actions_system.pass_night(1);
        let game: GameState = world.read_model(1);
        assert(game.phase == Phase::Day, 'should be day after pass_night');

        starknet::testing::set_contract_address(werewolf);
        actions_system.night_action(1, witch); // Cette action échoue car on est en jour
        actions_system.pass_day(1); // Retourne à la nuit
        actions_system.night_action(1, witch); // Maintenant possible
        let witch_state: Player = world.read_model((1, witch));
        assert(!witch_state.is_alive, 'witch should be dead');
        let game: GameState = world.read_model(1);
        assert(game.players_alive == 1, 'only werewolf should be alive');

        actions_system.pass_night(1);
        actions_system.end_voting(1); // Aucun vote, rien ne change
        actions_system.pass_day(1);
        let game: GameState = world.read_model(1);
        assert(game.phase == Phase::Ended, 'game should end with wolf win');
        assert(game.players_alive == 1, 'wolf should be the last alive');
    }

    #[test]
    fn test() {
        let werewolf = starknet::contract_address_const::<0x1>();
        let witch = starknet::contract_address_const::<0x2>();
        let guard = starknet::contract_address_const::<0x3>();
        let seer = starknet::contract_address_const::<0x4>();
        let hunter = starknet::contract_address_const::<0x5>();
        let cupid = starknet::contract_address_const::<0x6>();
        let villager = starknet::contract_address_const::<0x7>();
    
        let ndef = namespace_def();
        let mut world = spawn_test_world([ndef].span());
        world.sync_perms_and_inits(contract_defs());
    
        let (contract_address, _) = world.dns(@"actions").unwrap();
        let actions_system = IActionsDispatcher { contract_address };
    
        let players_array = array![werewolf, witch, guard, seer, hunter, cupid, villager];
        let players = players_array.span();
        actions_system.start_game(1, players);
    
        let game: GameState = world.read_model(1);
        assert(game.phase == Phase::Night, 'should start at night');
        assert(game.players_alive == 7, 'wrong initial player count');
        assert(game.werewolves_alive == 1, 'wrong werewolf count');
        let potions: WitchPotions = world.read_model(1);
        assert(potions.has_life_potion, 'witch should have life potion');
        assert(potions.has_death_potion, 'witch should have death potion');
    
        starknet::testing::set_contract_address(cupid);
        actions_system.cupid_action(1, villager, guard);
        let villager_state: Player = world.read_model((1, villager));
        let guard_state: Player = world.read_model((1, guard));
        assert(villager_state.lover_target == Option::Some(guard), 'villager not linked to guard');
        assert(guard_state.lover_target == Option::Some(villager), 'guard not linked to villager');
    
        starknet::testing::set_contract_address(guard);
        actions_system.night_action(1, seer);
        let seer_state: Player = world.read_model((1, seer));
        assert(seer_state.is_protected, 'seer should be protected');
    
        starknet::testing::set_contract_address(werewolf);
        actions_system.night_action(1, seer);
        let seer_state: Player = world.read_model((1, seer));
        assert(seer_state.is_alive, 'seer should still be alive');
        let game: GameState = world.read_model(1);
        assert(game.players_alive == 7, 'no one should be dead yet');
    
        // starknet::testing::set_contract_address(witch);
        // actions_system.witch_action(1, villager, false, true);
        // let villager_state: Player = world.read_model((1, villager));
        // let guard_state: Player = world.read_model((1, guard));
        // assert(!villager_state.is_alive, 'villager should be dead');
        // assert(!guard_state.is_alive, 'guard should be dead');
        // let game: GameState = world.read_model(1);
        // assert(game.players_alive == 5, 'v and g should be dead');
    
        // actions_system.pass_night(1);
        // let game: GameState = world.read_model(1);
        // assert(game.phase == Phase::Day, 'should be day after pass_night');
        // let seer_state: Player = world.read_model((1, seer));
        // assert(!seer_state.is_protected, 'seer shouldn\'t be protected');
    
        // starknet::testing::set_contract_address(werewolf);
        // actions_system.vote(1, hunter);
        // starknet::testing::set_contract_address(witch);
        // actions_system.vote(1, hunter);
        // starknet::testing::set_contract_address(seer);
        // actions_system.vote(1, hunter);
        // starknet::testing::set_contract_address(cupid);
        // actions_system.vote(1, werewolf);
        // actions_system.end_voting(1);
        // let hunter_state: Player = world.read_model((1, hunter));
        // let werewolf_state: Player = world.read_model((1, werewolf));
        // assert(hunter_state.is_alive, 'hunter shouldn\'t be dead yet');
        // assert(werewolf_state.is_alive, 'werewolf shouldn\'t be dead');
        // let game: GameState = world.read_model(1);
        // assert(game.phase == Phase::Day, 'should be day while hunter acts');
        // assert(game.day_duration == 30, 'hunter phase should be 30s');
    
        // starknet::testing::set_contract_address(hunter);
        // actions_system.hunter_action(1, cupid);
        // let hunter_state: Player = world.read_model((1, hunter));
        // let cupid_state: Player = world.read_model((1, cupid));
        // assert(!hunter_state.is_alive, 'hunter should be dead');
        // assert(!cupid_state.is_alive, 'cupid should be dead');
        // let game: GameState = world.read_model(1);
        // assert(game.players_alive == 3, 'hunter and cupid should be dead');
        // assert(game.phase == Phase::Day, 'still day until pass_day');
    
        // actions_system.pass_day(1);
        // let game: GameState = world.read_model(1);
        // assert(game.phase == Phase::Night, 'should be night after pass_day');
    
        // starknet::testing::set_contract_address(werewolf);
        // actions_system.night_action(1, seer);
        // let seer_state: Player = world.read_model((1, seer));
        // assert(!seer_state.is_alive, 'seer should be dead');
        // let game: GameState = world.read_model(1);
        // assert(game.players_alive == 2, 'seer should be dead');
    
        // actions_system.pass_night(1);
        // let game: GameState = world.read_model(1);
        // assert(game.phase == Phase::Day, 'should be day after pass_night');
    
        // actions_system.pass_day(1);
        // starknet::testing::set_contract_address(werewolf);
        // actions_system.night_action(1, witch);
        // let witch_state: Player = world.read_model((1, witch));
        // assert(!witch_state.is_alive, 'witch should be dead');
        // let game: GameState = world.read_model(1);
        // assert(game.players_alive == 1, 'only werewolf should be alive');
    
        // actions_system.pass_night(1);
        // actions_system.end_voting(1);
        // actions_system.pass_day(1);
        // let game: GameState = world.read_model(1);
        // assert(game.phase == Phase::Ended, 'game should end with wolf win');
        // assert(game.players_alive == 1, 'wolf should be the last alive');
    }
}