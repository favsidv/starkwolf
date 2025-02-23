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
    use starkwolf::models::{Player, m_Player, GameState, m_GameState, Role, Phase};

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
                TestResource::Event(actions::e_PlayerEliminated::TEST_CLASS_HASH),
                TestResource::Event(actions::e_GameStarted::TEST_CLASS_HASH),
                TestResource::Event(actions::e_LoversPaired::TEST_CLASS_HASH),
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

    // #[test]
    // fn test_game_flow() {
    //     let werewolf = starknet::contract_address_const::<0x1>();
    //     let witch = starknet::contract_address_const::<0x2>();
    //     let guard = starknet::contract_address_const::<0x3>();
    //     let seer = starknet::contract_address_const::<0x4>();
    //     let hunter = starknet::contract_address_const::<0x5>();
    //     let cupid = starknet::contract_address_const::<0x6>();
    //     let villager = starknet::contract_address_const::<0x7>();

    //     let ndef = namespace_def();
    //     let mut world = spawn_test_world([ndef].span());
    //     world.sync_perms_and_inits(contract_defs());

    //     let (contract_address, _) = world.dns(@"actions").unwrap();
    //     let actions_system = IActionsDispatcher { contract_address };

    //     let players = array![werewolf, witch, guard, seer, hunter, cupid, villager];
    //     actions_system.start_game(1, players);

    //     let werewolf_state: Player = world.read_model((1, werewolf));
    //     assert(werewolf_state.role == Role::Werewolf, 'werewolf role incorrect');

    //     let game: GameState = world.read_model(1);
    //     assert(game.phase == Phase::Night, 'wrong initial phase');
    //     assert(game.players_alive == 7, 'wrong player count');
    //     assert(game.werewolves_alive == 1, 'wrong werewolf count');

    //     // starknet::testing::set_contract_address(cupid);
    //     // actions_system.cupid_action(1, villager, guard);
    //     // let villager_state: Player = world.read_model((1, villager));
    //     // let guard_state: Player = world.read_model((1, guard));
    //     // assert(villager_state.lover_target == Option::Some(guard_state.address), 'not the correct lover');

    //     // starknet::testing::set_contract_address(werewolf);
    //     // assert(guard_state.is_alive, 'is dead');
    //     // actions_system.werewolf_action(1, villager);
    //     // let guard_state: Player = world.read_model((1, guard));
    //     // assert(!guard_state.is_alive, 'is alive');

    //     // starknet::testing::set_contract_address(seer);
    //     // actions_system.vote(1, hunter);
    //     // let hunter_state: Player = world.read_model((1, hunter));
    //     // assert(!hunter_state.is_alive, 'is alive');

    //     // starknet::testing::set_contract_address(hunter);
    //     // let cupid_state: Player = world.read_model((1, cupid));
    //     // assert(cupid_state.is_alive, 'already dead');
    //     // actions_system.hunter_action(1, cupid);
    //     // let cupid_state: Player = world.read_model((1, cupid));
    //     // assert(!cupid_state.is_alive, 'stile alive');

    //     // starknet::testing::set_contract_address(seer);
    //     // let werewolf_state: Player = world.read_model((1, werewolf));
    //     // let test_seer_view = actions_system.seer_action(1, werewolf);
    //     // println!("{}", test_seer_view);
    //     // assert(werewolf_state.is_alive, 'already dead');

    //     // starknet::testing::set_contract_address(hunter);
    //     // let cupid_state: Player = world.read_model((1, cupid));
    //     // assert(cupid_state.is_alive, 'already dead');
    //     // actions_system.hunter_action(1, cupid);
    //     // let cupid_state: Player = world.read_model((1, cupid));
    //     // assert(!cupid_state.is_alive, 'stile alive');

    //     // starknet::testing::set_contract_address(guard);
    //     // actions_system.guard_action(1, villager);
    //     // let villager_state: Player = world.read_model((1, villager));
    //     // assert(villager_state.is_protected, 'not protected');
    
    //     // starknet::testing::set_contract_address(werewolf);
    //     // actions_system.werewolf_action(1, villager);
    //     // let villager_state: Player = world.read_model((1, villager));
    //     // assert(villager_state.is_alive, 'already dead');

    //     starknet::testing::set_contract_address(witch);
    //     actions_system.witch_action(1, Option::None, Option::Some(villager));
    //     let villager_state: Player = world.read_model((1, villager));
    //     assert(!villager_state.is_alive, 'still alive');

    // }

    #[test]
    fn test_voting() {
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

        let mut game: GameState = world.read_model(1);
        game.phase = Phase::Day;
        game.phase_start_timestamp = starknet::get_block_timestamp();
        world.write_model(@game);

        // starknet::testing::set_contract_address(werewolf);
        // actions_system.vote(1, hunter);

        // starknet::testing::set_contract_address(witch);
        // actions_system.vote(1, hunter);

        // starknet::testing::set_contract_address(guard);
        // actions_system.vote(1, seer);

        // actions_system.end_voting(1);

        // let hunter_state: Player = world.read_model((1, hunter));
        // assert(!hunter_state.is_alive, 'hunter should be dead');

        // let seer_state: Player = world.read_model((1, seer));
        // assert(seer_state.is_alive, 'seer should be alive');

        // let game: GameState = world.read_model(1);
        // assert(game.phase == Phase::Night, 'should be night phase');
        // assert(game.players_alive == 6, 'wrong player count');

        // let werewolf_state: Player = world.read_model((1, werewolf));
        // assert(!werewolf_state.has_voted, 'werewolf should not have voted');
    }
}