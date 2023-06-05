import type Client from "./client.js";
import type Keychain from "./keychain.js";
import * as crypto from 'node:crypto';
export class AuthenticationError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "AuthenticationError";
	}
}
export default class Authenticator {
	constructor(public client: Client, public keychain: Keychain) {}
	GetEncryptedSecret() {
		if (!this.keychain) throw new AuthenticationError("Missing keychain");
		return this.keychain.GetIEncryptedSecret(this.client.server)
			.then(response => this.keychain.DecryptAuthSecret(response));
	}
	UserEncryptMessage(pubk: string, msg: string): string {
		return crypto.publicEncrypt({
			key: pubk,
			padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
			oaepHash: 'sha256'
		}, Buffer.from(msg)).toString('base64');
	}
}