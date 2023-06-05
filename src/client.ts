import io, { Socket } from 'socket.io-client';
import * as crypto from 'crypto';
import Authenticator from './auth.js';
import EventEmitter from 'events';

export interface FriendSuggestions {
	[token: string]: { from: string; to: string };
}

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

export class RequestFailed extends Error {
	constructor(public status: number, public status_text: string, public additional?: string) {
		super(`Request failed with status ${status} ${status_text}${additional ? " "+additional : ""}`);
		this.name = "RequestFailed";
	}
}

export default class Client extends EventEmitter {
	private token: string = "";
	private io?: Socket;
	private auth?: Authenticator;
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
			// console.log(msg);
			if (!this.auth) throw 'You need to add a authenticator with <Client>.UseAuthenticator(...) first'
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
		if (!this.io) throw 'You need to call <Client>.Connect(); first.';
		this.io.emit('sendMessage', {
			"message-myhist": myhist,
			"message-userhist": userhist,
			username
		});
	}
	async SendMessage(username: string, message: string, skipEncryption: boolean = false): Promise<boolean> {
		//console.log(username, message);
		if (!this.auth) throw 'You need to add a authenticator with <Client>.UseAuthenticator(...) first'
		if (!(await this.IsFriend(username))) return false;
		if (skipEncryption) {
			this.LL_SendMessage(message, message, username);
			return true;
		}
		const myhist = this.auth.keychain.EncryptMessage(message);
		const userhist = this.auth.UserEncryptMessage(await this.GetUserPublicKey(username), message);
		
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
	FetchFriends() {
		return fetch(`${this.server}/api/friends`, {
			headers: {
				Cookie: `token=${this.token}`
			}
		});
	}
	RemoveFriend(username: string) {
		return fetch(`${this.server}/api/removeFromFriends?username=${encodeURIComponent(username)}`, {
			headers: {
				Cookie: `token=${this.token}`
			}
		});
	}
	private AddToFriends(usetoken: boolean, x: string) {
		return fetch(`${this.server}/api/addToFriends?${usetoken ? "friendToken" : "username"}=${encodeURIComponent(x)}`, {
			headers: {
				Cookie: `token=${this.token}`
			}
		});
	}
	AcceptFriendToken(token: string) {
		return this.AddToFriends(true, token);
	}
	SendFriendRequest(username: string) {
		return this.AddToFriends(false, username);
	}
	private FetchSuggestedFriends() {
		return fetch(`${this.server}/api/friendTokens`, {
			headers: {
				Cookie: `token=${this.token}`
			}
		})
	}
	GetSuggestedFriends(): Promise<FriendSuggestions> {
		return this.FetchSuggestedFriends()
			.then(async resp => {
				if (!resp.ok) throw new RequestFailed(resp.status, resp.statusText, await resp.text());
				return resp.json();
			})
	}
}