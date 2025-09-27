import { el } from "../../etc";
import { UiEventHandler, CpuEventHandler, CpuEvent, UiCpuSignalHandler, UiCpuSignal } from "../../events";
import { u1, u4, u8 } from "../../num";
import UiComponent from "../uiComponent";

const CANVAS_SIZE = 512;
const WIDTH = 16;

export default class Screen implements UiComponent {
	events: UiEventHandler;
	screen: HTMLCanvasElement;
	container: HTMLElement;
	cpu_signals: UiCpuSignalHandler;
	ctx: CanvasRenderingContext2D;
	palette_id: u1 = 0;
	// actual VRAM buffer stored in computer.
	// This one is here to reduce computations
	vram_copy: Uint8Array = new Uint8Array(256);
	scale: number;

	constructor(element: HTMLElement, event: UiEventHandler, cpu_signals: UiCpuSignalHandler) {
		this.cpu_signals = cpu_signals;
		this.events = event;

		this.container = element;
		this.container.classList.add("window");

		el("div").cl("window_title").ch(el("div").id("text").tx("TV")).appendTo(this.container);

		this.scale = CANVAS_SIZE / WIDTH;
		this.screen = el("canvas").id("screen").fin();
		this.screen.width = CANVAS_SIZE;
		this.screen.height = CANVAS_SIZE;
		const ctx = this.screen.getContext("2d");

		if (ctx === null) throw new Error("could not load TV");

		this.ctx = ctx;
		const canvas_container = el("div").id("canvas_container").ch(this.screen).appendTo(this.container);
		const resize = (): void => {
			this.screen.style.width = "initial";
			this.screen.style.height = "initial";
			const rect = canvas_container.getBoundingClientRect();
			const h = rect.height;
			this.screen.style.width = `${h}px`;
			this.screen.style.height = `${h}px`;
		};
		resize();
		window.addEventListener("resize", resize);
	}

	private renderTestPattern(): void {
		for (let x = 0; x < 256; x++) {
			this.setPixel(x as u8, x as u8);
		}
	}

	private clearScreen(): void {
		for (let x = 0; x < 256; x++) {
			this.setPixel(x as u8, 0);
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
		c.listen(CpuEvent.ColorPaletteChanged, (p) => {
			this.palette_id = (p % 2) as u1;
			// re-draw all pixels under new palette
			this.cpu_signals.dispatch(UiCpuSignal.RequestVramDump, (vram) => {
				for (const [idx, v] of vram.entries()) {
					this.setPixel(idx as u8, v as u8);
				}
			});
		});
	}

	setPixel(address: u8, value: u8): void {
		const previous_value = this.vram_copy[address];
		if (previous_value === value) {
			return;
		}
		this.vram_copy[address] = value;

		const x = (address % 16) as u4;
		const y = Math.floor(address / 16) as u4;
		const point: [number, number] = [x * this.scale, y * this.scale];

		let color: string;
		if (this.palette_id === 0) {
			color = monochrome(value);
		} else {
			color = arbitrary_colors(value);
		}

		this.ctx.fillStyle = color;
		this.ctx.fillRect(...point, this.scale, this.scale);
	}
}

function monochrome(value: u8): string {
	value = (value & 1) === 1 ? 255 : 0;
	return `rgb(${value},${value},${value})`;
}

function arbitrary_colors(value: u8): string {
	const RED_SCALE = 255 / 2 ** 3;
	const GREEN_SCALE = 255 / 2 ** 3;
	const BLUE_SCALE = 255 / 2 ** 2;
	const red = ((value >> 5) & 0b111) * RED_SCALE;
	const green = ((value >> 2) & 0b111) * GREEN_SCALE;
	const blue = (value & 0b11) * BLUE_SCALE;
	return `rgb(${red},${green},${blue})`;
}
