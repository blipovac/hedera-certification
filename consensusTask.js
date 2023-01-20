const {
  Client,
  PrivateKey,
  TopicCreateTransaction,
  TopicMessageSubmitTransaction,
  TopicMessageQuery
} = require("@hashgraph/sdk");
require('dotenv').config({ path: '.env' });

const account1Id = process.env.ACCOUNT1_ACCOUNT_ID;
const privateKey1 = PrivateKey.fromString(process.env.ACCOUNT1_PRIVATE_KEY);

async function main() {
  if (!account1Id || !privateKey1) {
    throw new Error('Account ID or Private Key missing!')
  }
  const client = Client.forName('testnet');
  client.setOperator(account1Id, privateKey1);

  let txResponse = await new TopicCreateTransaction().execute(client);
  let receipt = await txResponse.getReceipt(client);
  let topicId = receipt.topicId;

  console.log(`Your topic ID is: ${topicId}`);

  await new Promise((resolve) => setTimeout(resolve, 5000));

  const sendResponse = await new TopicMessageSubmitTransaction({
    topicId,
    message: new Date().toTimeString()
  })
    .execute(client);
  const getReceipt = await sendResponse.getReceipt(client);

  console.log('Message receipt:');
  console.log(JSON.stringify(getReceipt, null, 2));
  console.log(`The message transaction status is: ${getReceipt.status}`);
  console.log(`Link to topic: https://hashscan.io/testnet/topic/${topicId}`);

  new TopicMessageQuery()
    .setTopicId(topicId)
    .setStartTime(0)
    .subscribe(
      client,
      (message) => console.log(Buffer.from(message.contents, "utf8").toString())
    );
}

main();