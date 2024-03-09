import { el } from "../etc";
import { UiEventHandler, CpuEventHandler, CpuEvent, UiCpuSignalHandler, UiCpuSignal } from "../events";
import { u2, u8, m256 } from "../num";
import { UiComponent } from "./uiComponent";

export class SaveLoad implements UiComponent {
	element: HTMLElement;
	events: UiEventHandler;
	save_button: HTMLButtonElement;
	binary_upload: HTMLInputElement;
	cpu_signals: UiCpuSignalHandler;

	constructor(element: HTMLElement, events: UiEventHandler, cpu_signals: UiCpuSignalHandler) {
		this.element = element;
		this.events = events;
		this.cpu_signals = cpu_signals;
		this.save_button = el("button", "save_button");
		this.binary_upload = el("input", "binary_upload");
		this.binary_upload.type = "file";
		this.binary_upload.name = "binary_upload";
		this.binary_upload.style.display = "none";
		const label = el("label");
		this.save_button.textContent = "Save";
		label.textContent = "Load Binary";
		label.classList.add("button");
		label.setAttribute("for", "binary_upload");

		this.element.appendChild(this.binary_upload);
		this.element.appendChild(label);
		this.element.appendChild(this.save_button);
		this.save_button.addEventListener("click", () => {
			this.cpu_signals.dispatch(UiCpuSignal.RequestMemoryDump);
		});
		this.binary_upload.addEventListener("change", (e) => {
			this.upload_changed(e);
		});
	}

	private upload_changed(e: Event): void {
		const t = e.target;
		if (t === null) {
			return;
		}

		const file: File | undefined = (t as HTMLInputElement).files?.[0];
		if (file === undefined) {
			console.log("No files attribute on file input");
			return;
		}
		const reader = new FileReader();
		console.log(file);
		reader.addEventListener("load", (e) => {
			if (e.target !== null) {
				const data = e.target.result;
				if (data instanceof ArrayBuffer) {
					const view = new Uint8Array(data);
					const array = [...view] as Array<u8>;
					this.cpu_signals.dispatch(UiCpuSignal.RequestCpuReset);
					for (const [i, v] of array.entries()) {
						const address = m256(i);
						const bank = Math.floor(i / 256) as u2;
						this.cpu_signals.dispatch(UiCpuSignal.RequestMemoryChange, { address, bank, value: v });
					}
				} else {
					console.log("not array");
				}
			}
		});
		reader.readAsArrayBuffer(file);
	}

	// eslint-disable-next-line class-methods-use-this
	init_cpu_events(e: CpuEventHandler): void {
		e.listen(CpuEvent.MemoryDumped, ({ memory }) => {
			const flattened = new Uint8Array(256 * memory.length);
			for (let x = 0; x < 4; x++) {
				for (let y = 0; y < 256; x++) {
					flattened[256 * x + y] = memory[x][y];
				}
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
}
