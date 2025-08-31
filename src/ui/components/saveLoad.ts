import { el } from "../../etc";
import { UiEventHandler, UiCpuSignalHandler, UiCpuSignal } from "../../events";
import { u8, m256, isU2 } from "../../num";
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
		this.cpu_signals.dispatch(UiCpuSignal.RequestMemoryDump, (memory) => {
			const flattened = new Uint8Array(memory.length);
			for (let y = 0; y < 256; y++) {
				flattened[y] = memory[y];
			}
			const blob = new Blob([flattened], { type: "application/octet-stream" });
			const url = URL.createObjectURL(blob);

			const link = document.createElement("a");
			link.href = url;
			link.download = "bin.bin";
			link.click();
			link.remove();
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
			if (target === null) return;
			const data = target.result;
			if (!(data instanceof ArrayBuffer)) {
				console.error("Data is not arraybuffer");
				return;
			}

			const view = new Uint8Array(data);
			const array = [...view] as Array<u8>;
			this.cpu_signals.dispatch(UiCpuSignal.RequestCpuReset);
			for (const [i, v] of array.entries()) {
				const address = m256(i);

				this.cpu_signals.dispatch(UiCpuSignal.RequestMemoryChange, { address, value: v });
			}
		});
		reader.readAsArrayBuffer(file);
	}
}
