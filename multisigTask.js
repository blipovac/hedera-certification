const { TransferTransaction, Hbar, HbarUnit, Client, AccountAllowanceApproveTransaction, PrivateKey, AccountId, TransactionId, AccountBalanceQuery } = require("@hashgraph/sdk")
require('dotenv').config({ path: '.env' })

const account1PrivateKey = PrivateKey.fromString(process.env.ACCOUNT1_PRIVATE_KEY)
const account1Id = process.env.ACCOUNT1_ACCOUNT_ID
const account2PrivateKey = PrivateKey.fromString(process.env.ACCOUNT2_PRIVATE_KEY)
const account2Id = process.env.ACCOUNT2_ACCOUNT_ID
const account3PrivateKey = PrivateKey.fromString(process.env.ACCOUNT3_PRIVATE_KEY)
const account3Id = process.env.ACCOUNT3_ACCOUNT_ID

async function createAllowance({ fromAccountId, toAccountId, fromAccountPrivateKey, amount, client }) {
    const tx = await new AccountAllowanceApproveTransaction()
        .approveHbarAllowance(fromAccountId, toAccountId, new Hbar(amount))
        .freezeWith(client)
        .sign(fromAccountPrivateKey)

    const allowanceSubmit = await tx.execute(client)
    return await allowanceSubmit.getReceipt(client)
}

async function spendAllowance({ treasuryAccountId, toAccountId, operatorAccountId, operatorPrivateKey, amount, client }) {
    const approvedSendTx = await new TransferTransaction()
        .addApprovedHbarTransfer(account1Id, new Hbar(-(amount)))
        .addHbarTransfer(account3Id, new Hbar(amount))
        .setTransactionId(TransactionId.generate(operatorAccountId))
        .freezeWith(client)
        .sign(operatorPrivateKey)

    const approvedSendSubmit = await approvedSendTx.execute(client)
    return await approvedSendSubmit.getReceipt(client)
}

async function getAccountBalance(accountId, client) {
    let balanceCheckTx = await new AccountBalanceQuery().setAccountId(accountId).execute(client)

    return balanceCheckTx.hbars.toString()
}

async function main() {
    if ([
        account1PrivateKey,
        account1Id,
        account2PrivateKey,
        account2Id,
        account3PrivateKey,
        account3Id
    ].includes(undefined)) {
        throw new Error('Account ID or Private Key missing!')
    }
    const client = Client.forName('testnet')
    client.setOperator(account2Id, account2PrivateKey)
    client.setDefaultMaxTransactionFee(new Hbar(10))

    await createAllowance({ fromAccountId: account1Id, toAccountId: account2Id, client, fromAccountPrivateKey: account1PrivateKey, amount: 20 })
    await new Promise((resolve) => setTimeout(resolve, 5000))
    console.log(`Account ${account1Id}: ${await getAccountBalance(account1Id, client)}`)
    console.log(`Account ${account2Id}: ${await getAccountBalance(account2Id, client)}`)
    console.log(`Account ${account3Id}: ${await getAccountBalance(account3Id, client)}`)

    await spendAllowance({ treasuryAccountId: account1Id, operatorAccountId: account2Id, toAccountId: account3Id, client, operatorPrivateKey: account2PrivateKey, amount: 10, client })
    await new Promise((resolve) => setTimeout(resolve, 5000))
    console.log(`Account ${account1Id}: ${await getAccountBalance(account1Id, client)}`)
    console.log(`Account ${account2Id}: ${await getAccountBalance(account2Id, client)}`)
    console.log(`Account ${account3Id}: ${await getAccountBalance(account3Id, client)}`)

    process.exit()
}

main()