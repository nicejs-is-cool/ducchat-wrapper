import io, { Socket } from 'socket.io-client';
import * as crypto from 'crypto';
import Authenticator from './auth';
import EventEmitter from 'events';

export interface RawMessage {
	username: string;
	message: string;
	sentBy: string;
	senderID: string;
	locale: 'en' | 'ru';
}

export interface Message {
	username: string;
	message: string;
	sentBy: string;
	senderID: string;
	locale: 'en' | 'ru';
}

export default class Client extends EventEmitter {
	private token: string;
	private io: Socket;
	private auth: Authenticator;
	public contacts: string[] = [];
	public publicKeyStore = new Map<string, string>();
	constructor(public server: string) { super() }
	LoginWithToken(token: string) {
		this.token = token;
	}
	UseAuthenticator(auth: Authenticator) {
		this.auth = auth;
	}
	Connect() {
		this.io = io(this.server, {
			extraHeaders: {
				"Cookie": `token=${this.token}`
			}
		})
		this.io.on('contacts', (a: any) => {
			this.contacts = a;
			this.emit("contacts", a);
		})
		this.io.on('newMessage', (msg: Message) => {
			//console.log(msg);
			console.log(msg);
			this.emit("message", {
				username: msg.username,
				message: this.auth.keychain.DecryptMessage(msg.message),
				sentBy: msg.sentBy,
				senderID: msg.senderID,
				locale: msg.locale
			});
		})
		this.io.on('sendFail', (err: string) => {
			this.emit("error", "failed to send a message: " + err);
		})
	}
	// LL standing for low level
	LL_GetUserPublicKey(username: string) {
		return fetch(`${this.server}/api/userPublicKey?username=${encodeURIComponent(username)}`, {
			headers: {
				Cookie: `token=${this.token}`
			}
		}).then(resp => resp.text());
	}
	async GetUserPublicKey(username: string): Promise<string> {
		if (!this.contacts.includes(username)) throw 'this should never happen';
		if (this.publicKeyStore.has(username)) return this.publicKeyStore.get(username)!;
		const lol = await this.LL_GetUserPublicKey(username);
		this.publicKeyStore.set(username, lol);
		return lol;
	}
	LL_SendMessage(myhist: string, userhist: string, username: string) {
		this.io.emit('sendMessage', {
			"message-myhist": myhist,
			"message-userhist": userhist,
			username
		});
	}
	async SendMessage(username: string, message: string): Promise<boolean> {
		console.log(username, message);
		const myhist = this.auth.keychain.EncryptMessage(message);
		const userhist = this.auth.UserEncryptMessage(await this.GetUserPublicKey(username), message);
		if (!(await this.IsFriend(username))) return false;
		this.LL_SendMessage(myhist, userhist, username);
		return true;
	}
	IsFriend(username: string) {
		return fetch(`${this.server}/api/isFriend?username=${encodeURIComponent(username)}`, {
			headers: {
				Cookie: `token=${this.token}`
			}
		}).then(resp => resp.json());
	}
}