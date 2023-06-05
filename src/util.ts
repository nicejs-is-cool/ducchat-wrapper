export namespace Util {
	export class AsyncTimer {
		private fcwrapper;
		private running: boolean = false;
		private timeoutId: number = -1;
		constructor(public fc: () => Promise<any>, public ms: number) {
			this.fcwrapper = async () => {
				//console.log('running');
				await this.fc();
				//console.log('finished');
				if (!this.running) return;
				this.timeoutId = setTimeout(this.fcwrapper, this.ms) as unknown as number;
			}
		}
		Start() {
			if (this.running) return false;
			this.running = true;
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