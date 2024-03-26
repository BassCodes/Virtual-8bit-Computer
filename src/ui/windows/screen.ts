import { DEFAULT_VRAM_BANK } from "../../constants";
import { el } from "../../etc";
import { UiEventHandler, CpuEventHandler, CpuEvent, UiCpuSignalHandler, UiCpuSignal } from "../../events";
import { u2, u4, u8 } from "../../num";
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
	current_vram_bank: u2 = DEFAULT_VRAM_BANK;

	constructor(element: HTMLElement, event: UiEventHandler, cpu_signals: UiCpuSignalHandler) {
		super(element, "TV", { collapsed: true, fit_content: true });
		this.cpu_signals = cpu_signals;
		this.events = event;

		this.scale = CANVAS_SIZE / WIDTH;
		this.screen = el("canvas").id("screen").fin();
		this.screen.width = CANVAS_SIZE;
		this.screen.height = CANVAS_SIZE;
		const ctx = this.screen.getContext("2d");

		if (ctx === null) throw new Error("could not load screen");

		this.ctx = ctx;
		this.container.appendChild(this.screen);

		this.renderTestPattern();
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
		c.listen(CpuEvent.MemoryChanged, ({ address, bank, value }) => {
			if (bank !== 1) return;

			this.setPixel(address, value);
		});
		c.listen(CpuEvent.SetVramBank, ({ bank }) => {
			this.current_vram_bank = bank;
			this.cpu_signals.dispatch(UiCpuSignal.RequestMemoryDump, (memory) => {
				const vram = memory[this.current_vram_bank];
				for (const [i, pixel] of vram.entries()) {
					this.setPixel(i as u8, pixel as u8);
				}
			});
		});
	}

	setPixel(address: u8, value: u8): void {
		const x = (address % 16) as u4;
		const y = Math.floor(address / 16) as u4;
		const point: [number, number] = [x * this.scale, y * this.scale];

		// TODO, come up with better color scheme.
		// Probable a lookup table
		const RED_SCALE = 255 / 2 ** 3;
		const GREEN_SCALE = 255 / 2 ** 3;
		const BLUE_SCALE = 255 / 2 ** 2;
		const red = ((value >> 5) & 0b111) * RED_SCALE;
		const green = ((value >> 2) & 0b111) * GREEN_SCALE;
		const blue = (value & 0b11) * BLUE_SCALE;

		const color = `rgb(${red},${green},${blue})`;
		this.ctx.fillStyle = color;
		this.ctx.fillRect(...point, this.scale, this.scale);
	}
}
