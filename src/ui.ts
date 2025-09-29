import { CpuEvent, CpuEventHandler, UiCpuSignalHandler, UiEventHandler } from "./events";
import { $ } from "./etc";
import UiComponent, { UiComponentConstructor } from "./ui/uiComponent";
// Components
import StateManager from "./ui/components/stateManager";
import MemoryView from "./ui/components/memoryView";
import frequencyIndicator from "./ui/components/frequencyIndicator";
import RegisterView from "./ui/components/registerView";
import ButtonBox from "./ui/components/buttonBox";
import SaveLoad from "./ui/components/saveLoad";
import TitleBox from "./ui/components/titleBox";
import StatusIndicator from "./ui/components/statusIndicator";
// Window Components
import InstructionExplainer from "./ui/components/instructionExplainer";
import Screen from "./ui/components/screen";
import PresetPrograms from "./ui/components/presetPrograms";

export default class UI {
	ui_events: UiEventHandler = new UiEventHandler();
	cpu_signaler: UiCpuSignalHandler = new UiCpuSignalHandler();
	private components: Array<UiComponent> = [];

	constructor() {
		this.register_component(StateManager, "ui");
		this.register_component(MemoryView, "memory");
		this.register_component(InstructionExplainer, "instruction_explainer");
		this.register_component(RegisterView, "registers");
		this.register_component(Screen, "tv");
		this.register_component(ButtonBox, "controls_buttons");
		this.register_component(SaveLoad, "save_load_buttons");
		this.register_component(TitleBox, "title_box");
		this.register_component(frequencyIndicator, "cycles");
		this.register_component(StatusIndicator, "status_indicator");
		this.register_component(PresetPrograms, "preset_programs");
	}

	private register_component(ctor: UiComponentConstructor, el_id: string): void {
		const e = $(el_id);
		if (!e) {
			console.log(ctor);
			throw new Error("Could not find HTML element while registering UI component");
		}
		const component = new ctor(e, this.ui_events, this.cpu_signaler);
		this.components.push(component);
	}

	initEvents(cpu_events: CpuEventHandler): void {
		cpu_events.listen(CpuEvent.Reset, () => this.reset());
		cpu_events.listen(CpuEvent.SoftReset, () => this.softReset());

		for (const c of this.components) if (c.initCpuEvents) c.initCpuEvents(cpu_events);
		for (const c of this.components) if (c.initUiEvents) c.initUiEvents(this.ui_events);
	}

	reset(): void {
		for (const c of this.components) if (c.reset) c.reset();
	}

	softReset(): void {
		for (const c of this.components) if (c.softReset) c.softReset();
	}
}
