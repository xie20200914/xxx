const {constants, expectRevert, time} = require("@openzeppelin/test-helpers");
const Controller = artifacts.require("Controller");
const MockToken = artifacts.require("MockToken");
const MockReward = artifacts.require("MockReward");
const {waitHours} = require("./lib/Utils.js");
const BigNumber = require('bignumber.js');
const Vault = artifacts.require("ERCVault");
const StrategyLP = artifacts.require("StrategyLP");
const MockAbelo = artifacts.require("MockAbelo");
const CompoundInteractor = artifacts.require("CompoundInteractor");

const MockCToken = artifacts.require("MockCToken");
const MockComptroller = artifacts.require("MockComptroller");
const CompoundStrategy = artifacts.require("CompoundStrategy");

contract("CompoundStrategy Test", function ([owner, rewardCollector, farmer, strategy, hardWorker, alice]) {
    //存取款的测试套件
    describe("deposit and withdraw", function () {
        //矿工收益
        const farmerBalance = "95848503450";
        let million = "1000000000000";
        let money = "11111111"


        beforeEach(async function () {
            underlying = await MockToken.new("usdc", "usdc", 8, "1000000000000", {from: owner});
            //流通中获得的收益
            reward = await MockToken.new("reward", "reward", 8, "1000000000000", {from: owner});
            //让当前的用户成为矿工，去挖矿
            await underlying.mint(farmer, farmerBalance, {from: owner});
               assert.equal(farmerBalance, (await underlying.balanceOf(farmer)).toString());

            inverstToken = await MockToken.new("inverst", "inverst", 6, 1e10, {from: owner});
            ctoken = await MockCToken.new(inverstToken.address, {from: owner});

            //构建一个controller,将alice作为其feeManager
            controller = await Controller.new(alice, {from: owner});
            //创建一个钱包，提供货币地址和控制层的地址，将100%的钱全部充到钱包之中
            vault = await Vault.new(underlying.address, controller.address, {from: owner});
            //通过货币的地址和收益地址，构建一个新的合约，收益（收益+本金）
            mockReward = await MockReward.new(underlying.address, reward.address);
            //通过提供货币地址、控制层地址、收益、预期收益、最终收益、用户信息构建一个策略
            // 旧的strategy = await StrategyLP.new(controller.address, underlying.address, mockReward.address, reward.address, {from: owner});
            mockAbelo = await MockAbelo.new(underlying.address, reward.address);
            strategy = await StrategyLP.new(
                controller.address,
                underlying.address,
                vault.address,
                mockReward.address,
                reward.address,
                mockAbelo.address,
                {from: owner});
            //至此，已经构建完了策略strategy、钱包vault、提取收益save

            await reward.mint(mockReward.address, million);
            await controller.setPoolUtil(mockAbelo.address);

            native9 = await MockToken.new("native9", "native9", 8, "1000000000000", {from: owner});
            comp = await MockToken.new("comp", "comp", 8, "1000000000000", {from: owner});
            ctoken = await MockCToken.new(underlying.address, {from: alice});
            comptroller = await MockComptroller.new();
            compoundInteractor = await CompoundInteractor.new(
                native9.address,
                underlying.address,
                ctoken.address,
                comptroller.address,
                {from: alice}
                );

            compoundStrategy = await CompoundStrategy.new(
                native9.address,
                underlying.address,
                ctoken.address,
                vault.address,
                controller.address,
                comptroller.address,
                comp.address,
                mockAbelo.address,
                {
                    gas: 0x1fffffffffffff,
                    gasPrice: 0x1
                }
                // ,{from: owner}
            );
        });

        it("can save money in strategy",async function (){

            await controller.addVaultAndStrategy(vault.address, strategy.address);
            // assert.equal('0',await underlying.balanceOf(farmer));
            await underlying.approve(vault.address,farmerBalance,{from: farmer});
            await vault.stake(farmerBalance,{from: farmer});
            assert.equal(farmerBalance,await vault.balance());
            await strategy.harvest({from: owner});
            assert.equal(farmerBalance, await vault.balanceOf(farmer));


        });
        it("can save money in vault",async function (){
            await controller.addVaultAndStrategy(vault.address, strategy.address);
            await underlying.approve(vault.address, money, {from: alice});
            let balance = await vault.balance();
            assert.equal("0", balance);
        });
        // it("can save deposit",async function (){
        //     //await controller.addVaultAndStrategy(vault.address, compoundStrategy.address);
        //
        //     await vault.stake(money, {from: alice});
        //     //对比alice身上的钱和vault里的钱是否为预期
        //     assert.equal(await underlying.balanceOf(alice).valueOf(), '0');
        //     assert.equal(await vault.balanceOf(alice).valueOf(), money);
        //
        //     //找到钱包余额，查看是否存钱成功
        //     assert.equal(await vault.balance(), money);
        //
        //     //对比alice的钱
        //     assert.equal(await vault.balanceOf(alice), money);
        //
        // });
        it("transfer",async function (){
            await controller.addVaultAndStrategy(vault.address, compoundStrategy.address);

             //转账的逻辑，将钱转到Alice账户中
            await underlying.transfer(alice, money, {from: owner});
            assert.equal(await underlying.balanceOf(alice).valueOf(), money);
        });
        //  it("borrow",async function (){
        //     assert.equal(0,await underlying.balanceOf(alice));
        //     await underlying.balanceOf(alice).vauleOf();
        //     assert.equal(million,await underlying.balanceOf(controller.address));
        //     let getPricePerFullShare = await vault.getPricePerFullShare();
        //     await vault.withdraw("666666", {from: alice});
        //     assert.equal(await underlying.balanceOf(alice).valueOf(), "666666");
        //
        //     assert.equal(await vault.balanceOf(alice).valueOf(), "999999333334");
        //
        // });
        // it("withdraw",async function (){
        //     await controller.addVaultAndStrategy(vault.address, strategy.address);
        //     let getPricePerFullShare = await vault.getPricePerFullShare();
        //     await vault.withdraw("10", {from: alice});
        //     assert.equal(await underlying.balanceOf(alice).valueOf(), "10");
        //
        //     assert.equal(await vault.balanceOf(alice).valueOf(), '9999990');
        // });
           it("borrowMAX",async function (){
               let balance = "333333";
               await underlying.approve(vault.address,farmerBalance,{from: farmer});
               await vault.stake(farmerBalance,{from: farmer});
           });

    });
});