const { Hbar, TransferTransaction, Client, ScheduleCreateTransaction, PrivateKey, Transaction } = require('@hashgraph/sdk')
require('dotenv').config({ path: '.env' })

const account1PrivateKey = PrivateKey.fromString(process.env.ACCOUNT1_PRIVATE_KEY)
const account1Id = process.env.ACCOUNT1_ACCOUNT_ID
const account2Id = process.env.ACCOUNT2_ACCOUNT_ID

async function createScheduledTransaction() {
    if ([
        account1PrivateKey,
        account1Id,
        account2Id
    ].includes(undefined)) {
        throw new Error('Account ID or Private Key missing!')
    }
    const client = Client.forName('testnet')
    client.setOperator(account1Id, account1PrivateKey)

    const trx = new TransferTransaction()
        .addHbarTransfer(account1Id, new Hbar(-10))
        .addHbarTransfer(account2Id, new Hbar(10))

    const scheduleTransaction = new ScheduleCreateTransaction()
        .setScheduledTransaction(trx)
        .setScheduleMemo('This is a really cool scheduled transaction ei')
        .setAdminKey(account1PrivateKey)
        .freezeWith(client)

    const serialized = Buffer.from(scheduleTransaction.toBytes()).toString('hex')

    console.log('Serialized transaction: ', serialized)

    return serialized
}

async function executeScheduled(serializedTx) {
    const client = Client.forName('testnet')
    client.setOperator(account1Id, account1PrivateKey)

    const txn = Transaction.fromBytes(Buffer.from(serializedTx, 'hex'))

    await txn.sign(account1PrivateKey)

    const executed = await txn.execute(client)

    return executed.getReceipt(client)
}

async function main() {
    const serializedTx = await createScheduledTransaction()
    const receipt = await executeScheduled(serializedTx)
    console.log('Scheduled transaction successfully executed', receipt.status)
}

main()