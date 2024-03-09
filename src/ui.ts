import { CpuEvent, CpuEventHandler, UiCpuSignalHandler, UiEvent, UiEventHandler } from "./events";
import { $ } from "./etc";
import { InstructionExplainer } from "./ui/windows/instructionExplainer";
import { MemoryView } from "./ui/memoryView";
import { frequencyIndicator } from "./ui/frequencyIndicator";
import { RegisterView } from "./ui/registerView";
import { Screen } from "./ui/windows/screen";
import { EditButton } from "./ui/editButton";
import { UiComponent, UiComponentConstructor } from "./ui/uiComponent";
import { pausePlay } from "./ui/pausePlay";
import { Printout } from "./ui/windows/printout";
import { SaveLoad } from "./ui/saveLoad";

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

	init_events(cpu_events: CpuEventHandler): void {
		cpu_events.listen(CpuEvent.Reset, () => {
			this.reset();
		});

		for (const c of this.components) if (c.init_cpu_events) c.init_cpu_events(cpu_events);
	}

	reset(): void {
		for (const c of this.components) if (c.reset) c.reset();
	}
}
