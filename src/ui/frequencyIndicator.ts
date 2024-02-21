import { CpuEvent, CpuEventHandler, UiEventHandler } from "../events";
import { UiComponent } from "./uiComponent";

export class frequencyIndicator implements UiComponent {
	element: HTMLElement;
	private running: number | null = null;
	private count: number = 0;
	private last_value: number = 0;
	private last_time: number = 0;
	constructor(element: HTMLElement) {
		this.element = element;
		this.start();
	}

	start(): void {
		if (this.running !== null) {
			throw new Error("Tried starting frequencyIndicator twice!");
		}
		setInterval(this.update_indicator.bind(this), 1000);
	}

	stop(): void {
		if (this.running === null) return;
		clearInterval(this.running);
		this.running = null;
	}

	update_indicator(): void {
		if (this.last_value !== this.count) {
			this.element.textContent = `${this.count}hz`;
			this.last_value = this.count;
		}
		this.count = 0;
	}

	init_events(eh: UiEventHandler): void {
		this;
	}
	clock_cycle(): void {
		this.count += 1;
	}
	reset(): void {
		this.stop();
		this.count = 0;
		this.last_value = 0;
	}
	init_cpu_events(c: CpuEventHandler) {
		c.listen(CpuEvent.ClockCycle, () => {
			this.count += 1;
		});
	}
}
