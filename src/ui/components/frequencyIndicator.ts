/**
 * @file Virtual 8-Bit Computer
 * @copyright Alexander Bass 2025
 * @license GPL-3.0
 */
import { CpuEvent, CpuEventHandler, UiEventHandler } from "../../events";
import UiComponent from "../uiComponent";

function formatRate(r: number): string {
	if (r > 999) {
		return `${Math.round(r / 100) / 10}kHz`;
	}
	return `${r}Hz`;
}

export default class frequencyIndicator implements UiComponent {
	container: HTMLElement;
	running: number | null = null;
	count: number = 0;
	last_value: number = 0;
	last_time: number = 0;
	events: UiEventHandler;
	constructor(element: HTMLElement, events: UiEventHandler) {
		this.container = element;
		this.events = events;
		this.start();
	}

	start(): void {
		this.last_time = performance.now();
		if (this.running === null) {
			this.running = window.setInterval(this.updateIndicator.bind(this), 1000);
		}
	}

	stop(): void {
		if (this.running !== null) {
			window.clearInterval(this.running);
			this.running = null;
		}
	}

	updateIndicator(): void {
		const new_time = performance.now();
		const dt = (new_time - this.last_time) / 1000 || 1;
		const value = Math.round(this.count / dt);

		if (this.last_value !== value) {
			this.container.textContent = formatRate(value);
			this.last_value = value;
		}
		if (value === 0) {
			this.container.textContent = "";
		}
		this.last_time = new_time;
		this.count = 0;
	}

	reset(): void {
		this.stop();
		this.count = 0;
		this.last_value = 0;
		this.start();
	}

	softReset(): void {
		this.reset();
	}

	initCpuEvents(c: CpuEventHandler): void {
		c.listen(CpuEvent.ClockCycle, (c) => {
			this.count += c;
		});
	}
}
