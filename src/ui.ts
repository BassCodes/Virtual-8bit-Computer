import { CpuEvent, CpuEventHandler, UiCpuSignalHandler, UiEventHandler } from "./events";
import { $ } from "./etc";
import UiComponent, { UiComponentConstructor } from "./ui/uiComponent";
// Components
import MemoryView from "./ui/components/memoryView";
import frequencyIndicator from "./ui/components/frequencyIndicator";
import RegisterView from "./ui/components/registerView";
import EditButton from "./ui/components/editButton";
import PausePlay from "./ui/components/pausePlay";
import SaveLoad from "./ui/components/saveLoad";
import ResetButton from "./ui/components/resetButton";
import TrashButton from "./ui/components/trashButton";
import TitleBox from "./ui/components/titleBox";
// Window Components
import InstructionExplainer from "./ui/windows/instructionExplainer";
import Screen from "./ui/windows/screen";

export default class UI {
	ui_events: UiEventHandler = new UiEventHandler();
	cpu_signaler: UiCpuSignalHandler = new UiCpuSignalHandler();
	private sealed: boolean = false;
	private components: Array<UiComponent> = [];

	constructor() {
		this.register_component(MemoryView, "memory");
		this.register_component(frequencyIndicator, "cycles");
		this.register_component(InstructionExplainer, "instruction_explainer");
		this.register_component(RegisterView, "registers");
		this.register_component(Screen, "tv");
		this.register_component(PausePlay, "controls_buttons");
		this.register_component(SaveLoad, "save_load_buttons");
		this.register_component(EditButton, "edit_button_box");
		this.register_component(ResetButton, "reset_button_box");
		this.register_component(TrashButton, "trash_button_box");
		this.register_component(TitleBox, "title_box");
		this.seal();
	}

	private register_component(ctor: UiComponentConstructor, el_id: string): void {
		if (this.sealed) {
			throw new Error("attempted to add component to sealed UI");
		}
		const e = $(el_id);
		if (!e) {
			console.log(ctor);
			throw new Error("Could not find HTML element while registering UI component");
		}
		const component = new ctor(e, this.ui_events, this.cpu_signaler);
		this.components.push(component);
	}

	private seal(): void {
		if (this.sealed) {
			throw new Error("attempted to double-seal UI");
		}
		this.sealed = true;
	}

	initEvents(cpu_events: CpuEventHandler): void {
		cpu_events.listen(CpuEvent.Reset, () => this.reset());
		cpu_events.listen(CpuEvent.SoftReset, () => this.softReset());
		for (const c of this.components) if (c.initCpuEvents) c.initCpuEvents(cpu_events);
	}

	reset(): void {
		for (const c of this.components) if (c.reset) c.reset();
	}

	softReset(): void {
		for (const c of this.components) if (c.softReset) c.softReset();
	}
}
