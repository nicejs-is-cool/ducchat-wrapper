/*import Client, { Message } from "./client.js";
import Authenticator from "./auth.js";
import Keychain from "./keychain.js";*/
import { Client, Message, Authenticator, Keychain, Util } from './index.js';
const client = new Client("https://ducchat.pcprojects.tk")
const auth = new Authenticator(client, await Keychain.LoadFromFile("./KEEP_SECRET.key", "./SEND_TO_SERVER.key"));

client.UseAuthenticator(auth);
client.LoginWithToken(await auth.GetEncryptedSecret())

client.once('contacts', () => {
	console.log('ready!');
	console.log(client.contacts);
	timer.Start();
})

client.on('message', async (msg: Message) => {
	if (msg.message === "hello") {
		await client.SendMessage(msg.sentBy, "Hello there!\nSend **amogus** for sus.");
	}
	if (msg.message === "amogus") {
		await client.SendMessage(msg.sentBy, "Sus.");
	}
})

const timer = new Util.AsyncTimer(async () => {
	//console.log('fetching')
	const suggestions = await client.GetSuggestedFriends()
	//console.log(suggestions);
	for (const token in suggestions) {
		const data = suggestions[token];
		await client.AcceptFriendToken(token);
	}
}, 5 * 1000)

client.Connect();