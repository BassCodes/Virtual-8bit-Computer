import { CpuEvent, CpuEventHandler, UiEventHandler } from "../events";
import { UiComponent } from "./uiComponent";

export class frequencyIndicator implements UiComponent {
	element: HTMLElement;
	private running: number | null = null;
	private count: number = 0;
	private last_value: number = 0;
	private last_time: number = 0;
	events: UiEventHandler;
	constructor(element: HTMLElement, events: UiEventHandler) {
		this.element = element;
		this.events = events;
		this.start();
	}

	start(): void {
		this.last_time = performance.now();
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
		const new_time = performance.now();
		const dt = (new_time - this.last_time) / 1000 || 1;
		const value = Math.round(this.count / dt);

		if (this.last_value !== value) {
			this.element.textContent = `${value}hz`;
			this.last_value = value;
		}
		if (value === 0) {
			this.element.textContent = "";
		}
		this.last_time = new_time;
		this.count = 0;
	}

	clock_cycle(): void {
		this.count += 1;
	}
	reset(): void {
		this.stop();
		this.count = 0;
		this.last_value = 0;
	}
	init_cpu_events(c: CpuEventHandler): void {
		c.listen(CpuEvent.Cycle, () => {
			this.count += 1;
		});
	}
}
