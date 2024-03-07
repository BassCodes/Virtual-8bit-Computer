import { CpuEvent, CpuEventHandler, UiEvent, UiEventHandler } from "./events";
import { $ } from "./etc";
import { InstructionExplainer } from "./ui/windows/instructionExplainer";
import { MemoryView } from "./ui/memoryView";
import { frequencyIndicator } from "./ui/frequencyIndicator";
import { RegisterView } from "./ui/registerView";
import { Screen } from "./ui/windows/screen";
import { EditButton } from "./ui/edit_button";
import { UiComponent, UiComponentConstructor } from "./ui/uiComponent";
import { pausePlay } from "./ui/pausePlay";
import { Printout } from "./ui/windows/printout";

export class UI {
	events: UiEventHandler = new UiEventHandler();

	private components: Array<UiComponent>;

	constructor() {
		for (const [, e_type] of Object.entries(UiEvent)) {
			this.events.register_event(e_type as UiEvent);
		}
		this.events.seal();

		this.components = [];

		this.register_component(MemoryView, $("memory"));
		this.register_component(frequencyIndicator, $("cycles"));
		this.register_component(InstructionExplainer, $("instruction_explainer"));
		this.register_component(RegisterView, $("registers"));
		this.register_component(Screen, $("tv"));
		this.register_component(Printout, $("printout"));
		this.register_component(EditButton, $("edit_button"));
		this.register_component(pausePlay, $("controls_buttons"));

		const pp_button = $("pause_play_button");
	}
	private register_component(ctor: UiComponentConstructor, e: HTMLElement): void {
		if (e === undefined) {
			console.log(ctor);
			throw new Error("Could not find HTML element while registering UI component");
		}
		const component = new ctor(e, this.events);
		this.components.push(component);
	}

	init_events(cpu_events: CpuEventHandler): void {
		cpu_events.listen(CpuEvent.Reset, () => {
			this.reset();
		});

		for (const c of this.components) {
			if (c.init_cpu_events) c.init_cpu_events(cpu_events);
		}
	}

	reset(): void {
		for (const c of this.components) {
			c.reset();
		}
	}
}
