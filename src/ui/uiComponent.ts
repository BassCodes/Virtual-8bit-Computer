import { CpuEventHandler, UiEventHandler } from "../events";

export interface UiComponent {
	element: HTMLElement;
	events: UiEventHandler;
	reset: () => void;
	// init_events: (ui: UiEventHandler) => void;
	init_cpu_events: (c: CpuEventHandler) => void;
}
