const { PrivateKey, AccountCreateTransaction, Client } = require('@hashgraph/sdk')
require('dotenv').config({ path: '.env' });

async function createAccount(client) {
    const newAccountPrivateKey = PrivateKey.generateED25519()
    const newAccountPublicKey = newAccountPrivateKey.publicKey
    const newAccount = await new AccountCreateTransaction()
        .setKey(newAccountPublicKey)
        .setInitialBalance(666)
        .execute(client)
    const getReceipt = await newAccount.getReceipt(client)
    const newAccountId = getReceipt.accountId
    const id = `${newAccountId.shard.low}.${newAccountId.realm.low}.${newAccountId.num.low}`
    const account = {
        id,
        privateKey: newAccountPrivateKey.toStringRaw(),
        publicKey: newAccountPublicKey.toStringRaw()
    }

    return account
}

async function main() {
    const accountId = process.env.MY_ACCOUNT_ID
    const privateKey = process.env.MY_PRIVATE_KEY

    if (!accountId || !privateKey) {
        throw new Error('Account ID or Private Key missing!')
    }

    const NUMBER_OF_ACCOUNTS_TO_CREATE = 5;
    const client = Client.forName('testnet')
    const accountList = [];
    
    client.setOperator(accountId, privateKey)

    for (let index = 0; index < NUMBER_OF_ACCOUNTS_TO_CREATE; index++) {
        accountList.push(await createAccount(client))
    }

    console.log(accountList)

    process.exit(0)
}

main()
