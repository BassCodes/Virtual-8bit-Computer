/**
 * @file Virtual 8-Bit Computer
 * @copyright Alexander Bass 2025
 * @license GPL-3.0
 */
import { el, formatHex } from "../../etc";
import { UiEventHandler, UiCpuSignalHandler, UiCpuSignal, UiEvent } from "../../events";
import { u8, m256, isU2, isU8 } from "../../num";
import { deserialize, serialize } from "../../serde";
import UiComponent from "../uiComponent";

export default class SaveLoad implements UiComponent {
	container: HTMLElement;
	events: UiEventHandler;
	save_button: HTMLButtonElement;
	binary_upload: HTMLInputElement;
	cpu_signals: UiCpuSignalHandler;
	constructor(element: HTMLElement, events: UiEventHandler, cpu_signals: UiCpuSignalHandler) {
		this.container = element;
		this.events = events;
		this.cpu_signals = cpu_signals;

		this.save_button = el("button").id("save_button").tx("⬇").fin();
		this.binary_upload = el("input")
			.id("binary_upload")
			.at("type", "file")
			.at("name", "binary_upload")
			.st("display", "none")
			.fin();
		const label = el("label").cl("button").at("for", "binary_upload").tx("⬆").fin();

		this.container.append(this.save_button, this.binary_upload, label);

		this.save_button.addEventListener("click", () => {
			this.download();
		});
		this.binary_upload.addEventListener("change", (e) => {
			this.uploadChanged(e);
		});
	}

	private download(): void {
		let memory: Uint8Array | undefined;
		let vram: Uint8Array | undefined;
		let filename: string | undefined;

		const check_finished = (): void => {
			if (memory && vram && filename) {
				const state = { memory, vram, filename };
				const [filename_ext, out_str] = serialize(state);

				const blob = new Blob([out_str], { type: "application/octet-stream" });
				const url = URL.createObjectURL(blob);
				const link = document.createElement("a");
				link.href = url;
				link.download = filename_ext;
				link.click();
				link.remove();
			}
		};

		this.cpu_signals.dispatch(UiCpuSignal.RequestMemoryDump, (m) => {
			memory = m;
			check_finished();
		});
		this.cpu_signals.dispatch(UiCpuSignal.RequestVramDump, (v) => {
			vram = v;
			check_finished();
		});
		this.events.dispatch(UiEvent.RequestFilename, (f) => {
			filename = f;
			check_finished();
		});
	}

	private uploadChanged(e: Event): void {
		const t = e.target;
		if (t === null) return;

		const file = (t as HTMLInputElement).files?.[0];
		if (file === undefined) {
			console.error("No files attribute on file input");
			return;
		}

		const reader = new FileReader();
		reader.addEventListener("load", (e) => {
			const target = e.target;
			if (target === null || target.result === null) {
				console.error("Could not load data file");
				return;
			}
			const data = target.result;

			if (!(typeof data === "string")) {
				console.error("Could not load data file");
				return;
			}
			const { filename, memory, vram } = deserialize(data);

			this.cpu_signals.dispatch(UiCpuSignal.RequestCpuReset);

			for (let i = 0; i < 256; i = i + 1) {
				const value = memory[i];
				if (!isU8(value) || !isU8(i)) {
					throw new Error("unreachable");
				}
				this.cpu_signals.dispatch(UiCpuSignal.RequestMemoryChange, { address: i, value });
			}
			if (vram) {
				for (let i = 0; i < 256; i = i + 1) {
					const value = vram[i];
					if (!isU8(value) || !isU8(i)) {
						throw new Error("unreachable");
					}
					this.cpu_signals.dispatch(UiCpuSignal.RequestVramChange, { address: i, value });
				}
			}

			if (filename) {
				this.events.dispatch(UiEvent.FileNameChange, filename);
			}
		});
		reader.readAsText(file);
	}
}
