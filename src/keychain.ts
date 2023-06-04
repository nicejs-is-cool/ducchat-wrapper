import * as crypto from 'node:crypto';
import { AuthenticationError } from './auth.js';
export default class Keychain {
	constructor(private pub: string, private priv: string) {}
	DecryptAuthSecret(auth: string) {
		//return crypto.privateDecrypt(this.priv, Buffer.from(auth)).toString('utf-8');
		return crypto.privateDecrypt({
			key: this.priv,
			padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
			oaepHash: 'sha256'
		}, Buffer.from(auth, 'base64')).toString('utf-8')
	}
	async GetIEncryptedSecret(server: string) {
		const response = await fetch(`${server}/imagination/getEncryptedSecret?pubkey=${encodeURIComponent(this.pub)}`);
		if (!response.ok) {
			throw new AuthenticationError(await response.text());
		}
		return await response.text();
	}
	DecryptMessage(msg: string) {
		return crypto.privateDecrypt({
			key: this.priv,
			padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
			oaepHash: 'sha256'
		}, Buffer.from(msg, 'base64')).toString('utf-8');
	}
	EncryptMessage(msg: string) {
		return crypto.publicEncrypt({
			key: this.pub,
			padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
			oaepHash: 'sha256'
		}, Buffer.from(msg)).toString('base64');
	}
	static async LoadFromFile(secret_path: string, public_path: string) {
		const fs = await import("fs/promises");
		const secret = await fs.readFile(secret_path, "utf-8");
		const publick = await fs.readFile(public_path, "utf-8");
		return new Keychain(publick, secret);
	}
}