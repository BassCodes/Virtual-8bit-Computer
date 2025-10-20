/**
 * @file Virtual 8-Bit Computer
 * @copyright Alexander Bass 2025
 * @license GPL-3.0
 */
import { el } from "../../etc";
import { UiEventHandler, UiCpuSignalHandler, UiCpuSignal, UiEvent } from "../../events";
import { isU8 } from "../../num";
import { deserailize_short, deserialize_long, serialize_long, serialize_short } from "../../serialize";
import { ISerializableState } from "../../types";
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

		this.save_button = el("button")
			.id("save_button")
			.ch(el("img").at("src", "icons/save.png").at("alt", "save program").at("title", "save program"))
			.appendTo(this.container);
		this.binary_upload = el("input")
			.id("binary_upload")
			.at("type", "file")
			.at("name", "binary_upload")
			.st("display", "none")
			.appendTo(this.container);
		const label = el("label")
			.cl("button")
			.at("for", "binary_upload")
			.ch(el("img").at("src", "icons/upload.png").at("alt", "Upload program").at("title", "upload program"))
			.appendTo(this.container);

		const link_button = el("button")
			.id("link_button")
			.ch(el("img").at("src", "icons/clipboard.png").at("alt", "link to program").at("title", "link to program"))
			.ev("click", () => this.copy_link())
			.appendTo(this.container);

		const trash_button = el("button")
			.ev("click", () => {
				if (confirm("Clear all code? Irreversible")) {
					this.cpu_signals.dispatch(UiCpuSignal.RequestCpuReset);
				}
			})
			.ti("Delete Code")
			.cl("trash_button")
			.ch(el("img").at("src", "icons/delete.png").at("alt", "delete program").at("title", "delete program"))
			.appendTo(this.container);

		this.save_button.addEventListener("click", () => {
			this.download();
		});
		this.binary_upload.addEventListener("change", (e) => {
			this.uploadChanged(e);
		});
	}

	/** Check page url and load data if available */
	private load_link(): void {
		const url = new URL(window.location.href);
		const sp = url.searchParams;
		const data = deserailize_short(sp);

		if (data) {
			// If data is defined, then it is safe to load. Otherwise link contains garbage
			console.info("Loading data from url");
			this.loadState(data);
		} else {
			console.info("Did not load from url");
		}
		// reset url search
		// {
		// 	const existing = new URL(window.location.href);
		// 	existing.search = "";
		// 	window.history.pushState({}, "", existing);
		// }
	}

	private copy_link(): void {
		let memory: Uint8Array | undefined;
		let filename: string | undefined;
		const check_finished = (): void => {
			if (memory !== undefined && filename !== undefined) {
				const state = { memory, filename };
				const encoded = serialize_short(state);
				const url = new URL(window.location.href);
				url.search = encoded.toString();
				url.hash = "";
				navigator.clipboard.writeText(url.toString()).then(() => {});
				memory = undefined;
				filename = undefined;
			}
		};

		this.cpu_signals.dispatch(UiCpuSignal.RequestMemoryDump, (m) => {
			memory = m;
			check_finished();
		});

		this.events.dispatch(UiEvent.RequestFilename, (f) => {
			filename = f;
			check_finished();
		});
	}

	private download(): void {
		let memory: Uint8Array | undefined;
		let vram: Uint8Array | undefined;
		let filename: string | undefined;

		const check_finished = (): void => {
			if (memory !== undefined && filename !== undefined && vram !== undefined) {
				const state = { memory, vram, filename };
				const [filename_ext, out_str] = serialize_long(state);

				const blob = new Blob([out_str], { type: "application/octet-stream" });
				const url = URL.createObjectURL(blob);
				const link = document.createElement("a");
				link.href = url;
				link.download = filename_ext;
				link.click();
				link.remove();
				memory = undefined;
				vram = undefined;
				filename = undefined;
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
			const state = deserialize_long(data);
			this.loadState(state);
		});
		reader.readAsText(file);
	}

	loadState(s: ISerializableState): void {
		console.log("loading ", s);
		const { filename, memory, vram } = s;

		this.cpu_signals.dispatch(UiCpuSignal.RequestCpuReset);

		for (let i = 0; i < 256; i = i + 1) {
			const value = memory[i] || 0;
			if (!isU8(value) || !isU8(i)) {
				throw new Error(`unreachable v=${value} i=${i}`);
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
	}

	initUiEvents(u: UiEventHandler): void {
		u.listen(UiEvent.AttemptLoadFromUrl, () => {
			this.load_link();
		});
	}
}
