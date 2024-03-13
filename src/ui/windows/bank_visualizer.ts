import { CpuEvent, CpuEventHandler, UiEventHandler } from "../../events";
import UiComponent from "../uiComponent";
import WindowBox from "../windowBox";
import { DEFAULT_VRAM_BANK } from "../../constants";

export default class BankVisualizer extends WindowBox implements UiComponent {
	events: UiEventHandler;
	cpu_banks: Array<SVGPolylineElement>;
	vram_banks: Array<SVGPolylineElement>;
	constructor(element: HTMLElement, events: UiEventHandler) {
		super(element, "Bank Status", { fit_content: true });
		this.events = events;
		this.cpu_banks = [...element.querySelectorAll("#cpu_bank>polyline")] as Array<SVGPolylineElement>;
		this.vram_banks = [...element.querySelectorAll("#vram_bank>polyline")] as Array<SVGPolylineElement>;
	}

	init_cpu_events(c: CpuEventHandler): void {
		c.listen(CpuEvent.SetVramBank, ({ bank }) => {
			for (const bank_path of this.vram_banks) bank_path.setAttribute("stroke", "gray");
			this.vram_banks[bank].setAttribute("stroke", "yellow");
		});
		c.listen(CpuEvent.SwitchBank, ({ bank }) => {
			for (const bank_path of this.cpu_banks) bank_path.setAttribute("stroke", "gray");
			this.cpu_banks[bank].setAttribute("stroke", "yellow");
		});
	}

	reset(): void {
		for (const bank_path of this.vram_banks) bank_path.setAttribute("stroke", "gray");
		for (const bank_path of this.cpu_banks) bank_path.setAttribute("stroke", "gray");
		this.vram_banks[DEFAULT_VRAM_BANK].setAttribute("stroke", "yellow");

		this.cpu_banks[0].setAttribute("stroke", "yellow");
	}
}
