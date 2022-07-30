const { ApiPromise, WsProvider, Keyring } = require('@polkadot/api');
const WEB_SOCKET = "ws://localhost:9944";
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

const connectSubstrate = async () => {
    const wsProvider = new WsProvider(WEB_SOCKET);
    const api = await ApiPromise.create({ provider: wsProvider });
    await api.isReady;
    console.log("successfully connect to substrate");
    return api;
}

const getFreeBalance = async (api, address) => {
    const account = await api.query.system.account(address);
    return account["data"]["free"].toHuman();
}

const printAliceBobBalance = async (api) => {
    const keyring = new Keyring({type: 'sr25519'});
    const alice = keyring.addFromUri("//Alice");
    const bob = keyring.addFromUri("//Bob");
    console.log("alice balance is:", await getFreeBalance(api, alice.address));
    console.log("bob balance is:", await getFreeBalance(api, bob.address));
}

const main = async () => {
    const api = await connectSubstrate();
    const keyring = new Keyring({type: 'sr25519'});
    const alice = keyring.addFromUri("//Alice");
    const bob = keyring.addFromUri("//Bob");
    console.log(alice.address)
    console.log(bob.address)
    await printAliceBobBalance(api);
    const unsub = await api.tx.balances
        .transfer(bob.address, 10 ** 15)
        .signAndSend(alice, ({ events = [], status, txHash }) => {
            console.log(`Current status is ${status.type}`);

            if (status.isFinalized) {
                console.log(`Transaction included at blockHash ${status.asFinalized}`);
                console.log(`Transaction hash ${txHash.toHex()}`);

                // Loop through Vec<EventRecord> to display all events
                events.forEach(({ phase, event: { data, method, section } }) => {
                    console.log(`\t' ${phase}: ${section}.${method}:: ${data}`);
                });

                unsub();
            }
        });
    await sleep(20000);
    await printAliceBobBalance(api);
}

main().then(() => {
    console.log("exit normally");
    process.exit(0);
}).catch((err) => {
    console.log("exit error", err);
    process.exit(1);
});