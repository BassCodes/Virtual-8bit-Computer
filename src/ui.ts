import { CpuEvent, CpuEventHandler, UiEvent, UiEventHandler } from "./events";
import { $ } from "./etc";
import { InstructionExplainer } from "./ui/instructionExplainer";
import { MemoryView } from "./ui/memoryView";
import { frequencyIndicator } from "./ui/frequencyIndicator";
import { RegisterView } from "./ui/registerView";
import { Screen } from "./ui/screen";
import { Ribbon } from "./ui/ribbon";
import { UiComponent, UiComponentConstructor } from "./ui/uiComponent";
import { pausePlay } from "./ui/pausePlay";

export class UI {
	printout: HTMLElement;

	auto_running: boolean;

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
		this.register_component(Screen, $("screen") as HTMLCanvasElement);
		this.register_component(Ribbon, $("ribbon_menu"));
		this.register_component(pausePlay, $("controls_buttons"));
		this.printout = $("printout");

		this.auto_running = false;
		const pp_button = $("pause_play_button");
	}
	private register_component(c: UiComponentConstructor, e: HTMLElement): void {
		if (e === undefined) {
			console.log(c);
			throw new Error("Could not find HTML element while registering UI component");
		}
		const component = new c(e, this.events);
		this.components.push(component);
	}

	init_events(cpu_events: CpuEventHandler): void {
		cpu_events.listen(CpuEvent.Print, (char) => {
			this.printout.textContent = (this.printout.textContent ?? "") + char;
		});
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
		this.printout.textContent = "";
	}
}
