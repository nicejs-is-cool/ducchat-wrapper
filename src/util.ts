export namespace Util {
	export class AsyncTimer {
		private fcwrapper;
		private running: boolean = false;
		private timeoutId: number = -1;
		constructor(public fc: () => Promise<any>, public ms: number) {
			this.fcwrapper = async () => {
				await this.fc();
				if (!this.running) return;
				this.timeoutId = setTimeout(this.fcwrapper, ms) as unknown as number;
			}
		}
		Start() {
			if (this.running) return false;
			setTimeout(this.fcwrapper.bind(this), this.ms);
			return true;
		}
		Stop() {
			clearTimeout(this.timeoutId);
			this.running = false;
			return true;
		}
	}
}