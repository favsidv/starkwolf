#[cfg(test)]
mod tests {
    use dojo_cairo_test::WorldStorageTestTrait;
    use dojo::model::{ModelStorage}; // ModelStorageTest
    use dojo::world::WorldStorageTrait;
    use dojo_cairo_test::{
        spawn_test_world, NamespaceDef, TestResource, ContractDefTrait, ContractDef,
    };

    use starkwolf::systems::actions::{actions, IActionsDispatcher, IActionsDispatcherTrait};
    use starkwolf::models::{Player, m_Player, GameState, m_GameState, Role, Phase};

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

    #[test]
    #[available_gas(90000000)]
    fn test_game_flow() {
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

        let players = array![werewolf, witch, guard, seer, hunter, cupid, villager];
        actions_system.start_game(1, players);

        let werewolf_state: Player = world.read_model(werewolf);
        assert(werewolf_state.role == Role::Werewolf, 'werewolf role incorrect');

        let game: GameState = world.read_model(1);
        assert(game.phase == Phase::Night, 'wrong initial phase');
        assert(game.players_alive == 7, 'wrong player count');
        assert(game.werewolves_alive == 1, 'wrong werewolf count');

        starknet::testing::set_contract_address(cupid);
        actions_system.cupid_pair(1, villager, hunter);
        let villager_state: Player = world.read_model(villager);
        let hunter_state: Player = world.read_model(hunter);
        assert(villager_state.is_lover, 'not lover');
        assert(villager_state.lover_target == Option::Some(hunter_state.address), 'not the correct lover');

        starknet::testing::set_contract_address(werewolf);
        assert(hunter_state.is_alive, 'is dead');
        actions_system.kill(1, villager);
        let hunter_state: Player = world.read_model(hunter);
        assert(!hunter_state.is_alive, 'is alive');

        // let game: GameState = world.read_model(1);
        // let victim: Player = world.read_model(villager);
        // assert(game.phase == Phase::Day, 'should be day');
        // assert(game.players_alive == 5, 'wrong alive count');
        // assert(!victim.is_alive, 'victim should be dead');

        // starknet::testing::set_caller_address(seer);
        // actions_system.vote(1, werewolf);
        // let game: GameState = world.read_model(1);
        // let wolf: Player = world.read_model(werewolf);
        // assert(game.phase == Phase::Ended, 'game should end');
        // assert(game.werewolves_alive == 0, 'werewolf should be dead');
        // assert(!wolf.is_alive, 'wolf should be dead');
    }
}