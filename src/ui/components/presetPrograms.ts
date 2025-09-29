import { el } from "../../etc";
import { UiCpuSignal, UiCpuSignalHandler, UiEvent, UiEventHandler } from "../../events";
import { u8 } from "../../num";
import UiComponent from "../uiComponent";

type Preset = { name: string; data_func: () => Array<u8> };

export default class PresetPrograms implements UiComponent {
	container: HTMLElement;
	events: UiEventHandler;
	ui_signals: UiCpuSignalHandler;
	presets: Array<Preset> = [];
	constructor(element: HTMLElement, u: UiEventHandler, c: UiCpuSignalHandler) {
		this.container = element;
		this.events = u;
		this.ui_signals = c;
		el("div").cl("presets_title").ch(el("div").tx("Presets")).appendTo(this.container);
	}

	loadPreset(num: number): void {
		const preset = this.presets[num];
		const data = preset.data_func();
		const name = preset.name;
		if (!confirm("Load preset? (Existing data will be deleted)")) {
			return;
		}
		this.ui_signals.dispatch(UiCpuSignal.RequestCpuReset);
		this.events.dispatch(UiEvent.FileNameChange, name);
		for (const [i, v] of data.entries()) {
			this.ui_signals.dispatch(UiCpuSignal.RequestMemoryChange, {
				address: i as u8,
				value: v,
			});
		}
	}

	addPreset(name: string, data_func: () => Array<u8>): void {
		this.presets.push({ name, data_func });
		el("button")
			.cl("preset_button")
			.tx(name)
			.ev("click", () => {
				const idx = this.presets.length - 1;
				this.loadPreset(idx);
			})
			.appendTo(this.container);
	}

	initUiEvents(u: UiEventHandler): void {
		u.listen(UiEvent.AddPresetProgram, ({ name, data_func }) => {
			this.addPreset(name, data_func);
		});
	}
}
