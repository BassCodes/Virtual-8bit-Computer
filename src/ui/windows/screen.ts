import { el } from "../../etc";
import { UiEventHandler, CpuEventHandler, CpuEvent, UiCpuSignalHandler, UiCpuSignal } from "../../events";
import { u4, u8 } from "../../num";
import UiComponent from "../uiComponent";
import WindowBox from "../windowBox";

const CANVAS_SIZE = 512;
const WIDTH = 16;

export default class Screen extends WindowBox implements UiComponent {
	events: UiEventHandler;
	screen: HTMLCanvasElement;
	cpu_signals: UiCpuSignalHandler;
	ctx: CanvasRenderingContext2D;
	scale: number;

	constructor(element: HTMLElement, event: UiEventHandler, cpu_signals: UiCpuSignalHandler) {
		super(element, "TV", { collapsed: false, fit_content: true });
		this.cpu_signals = cpu_signals;
		this.events = event;

		this.scale = CANVAS_SIZE / WIDTH;
		this.screen = el("canvas").id("screen").fin();
		this.screen.width = CANVAS_SIZE;
		this.screen.height = CANVAS_SIZE;
		const ctx = this.screen.getContext("2d");

		if (ctx === null) throw new Error("could not load TV");

		this.ctx = ctx;
		this.container.appendChild(this.screen);
	}

	private renderTestPattern(): void {
		for (let x = 0; x < 256; x++) {
			this.setPixel(x as u8, x as u8);
		}
	}

	reset(): void {
		for (let i = 0; i < 256; i++) {
			this.setPixel(i as u8, 0);
		}
	}

	softReset(): void {
		this.reset();
	}

	initCpuEvents(c: CpuEventHandler): void {
		c.listen(CpuEvent.VramChanged, ({ address, value }) => {
			this.setPixel(address, value);
		});
	}

	setPixel(address: u8, value: u8): void {
		const x = (address % 16) as u4;
		const y = Math.floor(address / 16) as u4;
		const point: [number, number] = [x * this.scale, y * this.scale];

		value = (value & 1) === 1 ? 255 : 0;
		// TODO, come up with better color scheme.
		// Probably a lookup table
		const RED_SCALE = 255 / 2 ** 3;
		const GREEN_SCALE = 255 / 2 ** 3;
		const BLUE_SCALE = 255 / 2 ** 2;
		// const red = ((value >> 5) & 0b111) * RED_SCALE;
		// const green = ((value >> 2) & 0b111) * GREEN_SCALE;
		// const blue = (value & 0b11) * BLUE_SCALE;

		const red = value;
		const green = value;
		const blue = value;
		const color = `rgb(${red},${green},${blue})`;
		this.ctx.fillStyle = color;
		this.ctx.fillRect(...point, this.scale, this.scale);
	}
}
