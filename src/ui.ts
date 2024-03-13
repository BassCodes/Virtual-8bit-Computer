import { CpuEvent, CpuEventHandler, UiCpuSignalHandler, UiEventHandler } from "./events";
import { $ } from "./etc";
import UiComponent, { UiComponentConstructor } from "./ui/uiComponent";
// Components
import MemoryView from "./ui/components/memoryView";
import frequencyIndicator from "./ui/components/frequencyIndicator";
import RegisterView from "./ui/components/registerView";
import BankSelector from "./ui/components/bank_view_selector";
import EditButton from "./ui/components/editButton";
import pausePlay from "./ui/components/pausePlay";
import SaveLoad from "./ui/components/saveLoad";
import ResetButtons from "./ui/components/reset_buttons";
// Window Components
import InstructionExplainer from "./ui/windows/instructionExplainer";
import Screen from "./ui/windows/screen";
import Printout from "./ui/windows/printout";
import BankVisualizer from "./ui/windows/bank_visualizer";

export class UI {
	ui_events: UiEventHandler = new UiEventHandler();
	cpu_signaler: UiCpuSignalHandler = new UiCpuSignalHandler();
	private components: Array<UiComponent> = [];

	constructor() {
		this.register_component(MemoryView, $("memory"));
		this.register_component(frequencyIndicator, $("cycles"));
		this.register_component(InstructionExplainer, $("instruction_explainer"));
		this.register_component(RegisterView, $("registers"));
		this.register_component(Screen, $("tv"));
		this.register_component(Printout, $("printout"));
		this.register_component(EditButton, $("edit_button"));
		this.register_component(pausePlay, $("controls_buttons"));
		this.register_component(SaveLoad, $("save_load_buttons"));
		this.register_component(BankSelector, $("memory_bank_view"));
		this.register_component(BankVisualizer, $("bank_viz"));
		this.register_component(ResetButtons, $("reset_buttons"));
	}

	private register_component(ctor: UiComponentConstructor, e: HTMLElement): void {
		if (e === undefined) {
			// shouldn't be able to happen, but I sometimes let the type system slide when getting elements from the DOM.
			console.log(ctor);
			throw new Error("Could not find HTML element while registering UI component");
		}
		const component = new ctor(e, this.ui_events, this.cpu_signaler);
		this.components.push(component);
	}

	initEvents(cpu_events: CpuEventHandler): void {
		cpu_events.listen(CpuEvent.Reset, () => {
			this.reset();
		});

		for (const c of this.components) if (c.initCpuEvents) c.initCpuEvents(cpu_events);
	}

	reset(): void {
		for (const c of this.components) if (c.reset) c.reset();
	}
}
