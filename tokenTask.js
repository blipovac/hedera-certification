const { TransferTransaction, Wallet, Client, TokenCreateTransaction, AccountBalanceQuery, TokenUnpauseTransaction, TokenPauseTransaction, TokenType, TokenSupplyType, TokenAssociateTransaction, PrivateKey } = require('@hashgraph/sdk')
require('dotenv').config({ path: '.env' })

const account1PrivateKey = PrivateKey.fromString(process.env.ACCOUNT1_PRIVATE_KEY)
const account1Id = process.env.ACCOUNT1_ACCOUNT_ID
const account2PrivateKey = PrivateKey.fromString(process.env.ACCOUNT2_PRIVATE_KEY)
const account2Id = process.env.ACCOUNT2_ACCOUNT_ID
const account3PrivateKey = PrivateKey.fromString(process.env.ACCOUNT3_PRIVATE_KEY)
const account3Id = process.env.ACCOUNT3_ACCOUNT_ID
const account4PrivateKey = PrivateKey.fromString(process.env.ACCOUNT4_PRIVATE_KEY)
const account4Id = process.env.ACCOUNT4_ACCOUNT_ID

async function createToken({ name, symbol, initialSupply, maxSupply }, { treasuryAccountId, treasuryAccountPrivateKey }, { supplyAccountId, supplyAccountPrivateKey }) {
    const treasuryWallet = new Wallet(
        treasuryAccountId,
        treasuryAccountPrivateKey
    )
    const supplyUser = new Wallet(
        supplyAccountId,
        supplyAccountPrivateKey
    )
    const client = Client.forName('testnet')
    client.setOperator(treasuryAccountId, treasuryAccountPrivateKey)

    let tokenCreateTx = await new TokenCreateTransaction()
        .setTokenName(name)
        .setTokenSymbol(symbol)
        .setTokenType(TokenType.FungibleCommon)
        .setDecimals(2)
        .setInitialSupply(initialSupply)
        .setTreasuryAccountId(treasuryAccountId)
        .setSupplyType(TokenSupplyType.Finite)
        .setSupplyKey(supplyUser.publicKey)
        .setMaxSupply(maxSupply)
        .setPauseKey(treasuryWallet.publicKey)
        .freezeWith(client)

    let tokenCreateSign = await tokenCreateTx.sign(treasuryAccountPrivateKey)
    let tokenCreateSubmit = await tokenCreateSign.execute(client)
    let tokenCreateRx = await tokenCreateSubmit.getReceipt(client)
    let tokenId = tokenCreateRx.tokenId

    console.log(`Created Token ID: ${tokenId} \n`)

    return tokenId
}

async function associateTokenToAccount(tokenId, { accountId, privateKey }, { treasuryAccountId, treasuryAccountPrivateKey }) {
    const client = Client.forName('testnet')
    client.setOperator(treasuryAccountId, treasuryAccountPrivateKey)

    const transaction = await new TokenAssociateTransaction()
        .setAccountId(accountId)
        .setTokenIds([tokenId])
        .freezeWith(client)
        .sign(privateKey)

    const transactionSubmit = await transaction.execute(client)

    const transactionReceipt = await transactionSubmit.getReceipt(client)

    console.log(`- Token association with account ${accountId}: ${transactionReceipt.status} \n`)

    return transactionReceipt
}

async function sendTokens(tokenId, { fromId, fromPrivateKey }, { toId }, amount) {
    const client = Client.forName('testnet')
    console.log(fromPrivateKey)
    client.setOperator(fromId, fromPrivateKey)

    const senderBalance = await new AccountBalanceQuery().setAccountId(fromId).execute(client)
    console.log(`- Sender balance: ${senderBalance.tokens._map.get(tokenId.toString())} units of token ID ${tokenId}`)
    const receiverBalance = await new AccountBalanceQuery().setAccountId(toId).execute(client)
    console.log(`- Receiver balance: ${receiverBalance.tokens._map.get(tokenId.toString())} units of token ID ${tokenId}`)

    let tokenTransferTx
    let tokenTransferSubmit
    let tokenTransferRx
    try {
        tokenTransferTx = await new TransferTransaction()
            .addTokenTransferWithDecimals(tokenId, fromId, -amount, 2)
            .addTokenTransferWithDecimals(tokenId, toId, amount, 2)
            .setMaxTransactionFee(amount)
            .freezeWith(client)
            .sign(fromPrivateKey)

        tokenTransferSubmit = await tokenTransferTx.execute(client)

        tokenTransferRx = await tokenTransferSubmit.getReceipt(client)
    } catch (error) {
        console.log('Could not transfer tokens')
        return null
    }

    console.log(`Token transfer to ${toId}: ${tokenTransferRx.status} \n`)

    const senderBalance2 = await new AccountBalanceQuery().setAccountId(fromId).execute(client)
    console.log(`Sender balance: ${senderBalance2.tokens._map.get(tokenId.toString())} units of token ID ${tokenId}`)
    const receiverBalance2 = await new AccountBalanceQuery().setAccountId(toId).execute(client)
    console.log(`Receiver balance: ${receiverBalance2.tokens._map.get(tokenId.toString())} units of token ID ${tokenId}`)

    return tokenTransferRx
}

async function pauseToken(tokenId, { supplyAccountId, supplyAccountPrivateKey }) {
    const client = Client.forName('testnet')
    client.setOperator(supplyAccountId, supplyAccountPrivateKey)

    const transaction = await new TokenPauseTransaction()
        .setTokenId(tokenId)
        .freezeWith(client)

    const signTx = await transaction.sign(supplyAccountPrivateKey)
    const txResponse = await signTx.execute(client)
    const receipt = await txResponse.getReceipt(client)
    const transactionStatus = receipt.status

    console.log('The transaction consensus status ' + transactionStatus.toString())

    return receipt
}

async function unpauseToken(tokenId, { supplyUserId, supplyUserPrivateKey }) {
    const client = Client.forName('testnet')
    client.setOperator(supplyUserId, supplyUserPrivateKey)

    const transaction = new TokenUnpauseTransaction()
        .setTokenId(tokenId)
        .freezeWith(client)

    const signTx = await transaction.sign(supplyUserPrivateKey)

    const txResponse = await signTx.execute(client)

    const receipt = await txResponse.getReceipt(client)

    const transactionStatus = receipt.status

    console.log('The transaction consensus status ' + transactionStatus.toString())

    return receipt
}

async function main() {
    const tokenId = await createToken({
        name: 'Bony Cola Fresh Token',
        symbol: 'BCFT',
        initialSupply: 35050,
        maxSupply: 50000
    }, { treasuryAccountId: account1Id, treasuryAccountPrivateKey: account1PrivateKey }, { supplyAccountId: account2Id, supplyAccountPrivateKey: account2PrivateKey })

    await associateTokenToAccount(tokenId, { accountId: account3Id, privateKey: account3PrivateKey }, { treasuryAccountId: account1Id, treasuryAccountPrivateKey: account1PrivateKey })
    await associateTokenToAccount(tokenId, { accountId: account4Id, privateKey: account4PrivateKey }, { treasuryAccountId: account1Id, treasuryAccountPrivateKey: account1PrivateKey })

    await sendTokens(tokenId, { fromId: account1Id, fromPrivateKey: account1PrivateKey }, { toId: account3Id }, 2525)
    await sendTokens(tokenId, { fromId: account1Id, fromPrivateKey: account1PrivateKey }, { toId: account4Id }, 2525)

    await pauseToken(tokenId, { supplyAccountId: account1Id, supplyAccountPrivateKey: account1PrivateKey })
    await sendTokens(tokenId, { treasuryAccountId: account1Id, treasuryAccountPrivateKey: account1PrivateKey }, { toId: account4Id }, 135)

    await unpauseToken(tokenId, { supplyAccountId: account1Id, supplyAccountPrivateKey: account1PrivateKey })
    await sendTokens(tokenId, { treasuryAccountId: account1Id, treasuryAccountPrivateKey: account1PrivateKey }, { toId: account4Id }, 135)

    process.exit(0)
}

main()