import { UiEventHandler, CpuEventHandler, CpuEvent } from "../events";
import { u4, u8 } from "../num";
import { UiComponent } from "./uiComponent";
export class Screen implements UiComponent {
	element: HTMLCanvasElement;
	events: UiEventHandler;
	ctx: CanvasRenderingContext2D;
	scale: [number, number];
	constructor(element: HTMLElement, event: UiEventHandler) {
		this.element = element as HTMLCanvasElement;
		this.events = event;
		const canvas_size = [512, 512];
		const data_size = [16, 16];
		this.scale = [canvas_size[0] / data_size[0], canvas_size[1] / data_size[1]];
		[this.element.width, this.element.height] = canvas_size;
		const ctx = this.element.getContext("2d");
		if (ctx === null) {
			throw new Error("todo");
		}
		this.ctx = ctx;
		// for (let x = 0; x < 16; x++) {
		// 	for (let y = 0; y < 16; y++) {
		// 		this.setPixel(x as u4, y as u4, (x + 16 * y) as u8);
		// 	}
		// }
	}

	reset(): void {
		const ctx = this.element.getContext("2d");
		if (ctx === null) {
			throw new Error("todo");
		}
	}

	init_cpu_events(c: CpuEventHandler): void {
		c.listen(CpuEvent.MemoryChanged, ({ address, bank, value }) => {
			if (bank !== 1) return;
			const x = (address % 16) as u4;
			const y = Math.floor(address / 16) as u4;
			this.setPixel(x, y, value);
		});
	}

	setPixel(x: u4, y: u4, value: u8): void {
		const point: [number, number] = [x * this.scale[0], y * this.scale[1]];

		const RED_SCALE = 255 / 2 ** 3;
		const GREEN_SCALE = 255 / 2 ** 3;
		const BLUE_SCALE = 255 / 2 ** 2;
		const red = ((value >> 5) & 0b111) * RED_SCALE;
		const green = ((value >> 2) & 0b111) * GREEN_SCALE;
		const blue = (value & 0b11) * BLUE_SCALE;

		const color = `rgb(${red},${green},${blue})`;
		this.ctx.fillStyle = color;
		this.ctx.fillRect(...point, ...this.scale);
	}
}
