/*import Client, { Message } from "./client.js";
import Authenticator from "./auth.js";
import Keychain from "./keychain.js";*/
import { Client, Message, Authenticator, Keychain } from './index.js';
const client = new Client("https://ducchat.pcprojects.tk")
const keychain = await Keychain.LoadFromFile("./KEEP_SECRET.key", "./SEND_TO_SERVER.key");
const auth = new Authenticator(client);
auth.ImportKeychain(keychain);
client.UseAuthenticator(auth);
client.LoginWithToken(await auth.GetEncryptedSecret())

client.once('contacts', () => {
	console.log('ready!');
	console.log(client.contacts);
})

client.on('message', async (msg: Message) => {
	if (msg.message === "hello") {
		console.log(await client.SendMessage(msg.sentBy, "Hello there!"));
	}
})

client.Connect();