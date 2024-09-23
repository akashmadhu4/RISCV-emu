import { Register32 } from "../Register32";
import { MemoryMap, SystemInterface } from "../system-interface";
import { MemoryAccess } from "./memory-access";
import { PipelineStage } from "./pipeline-stage";


export interface WriteBackParams {
    shouldStall: () => boolean
    getMemoryAccessValuesIn: () => ReturnType<MemoryAccess['getMemoryAccessValuesOut']>
    regFile: Array<Register32>;
}

export class WriteBack extends PipelineStage {

    private aluResult = new Register32(0)

    private rd = new Register32(0)

    private shouldStall: WriteBackParams['shouldStall']
    private getMemoryAccessValuesIn: WriteBackParams['getMemoryAccessValuesIn']
    private regFile: WriteBackParams['regFile'];

    constructor(params: WriteBackParams) {
        super();
        this.shouldStall = params.shouldStall
        this.getMemoryAccessValuesIn = params.getMemoryAccessValuesIn,
            this.regFile = params.regFile
    }

    compute(): void {
        if (!this.shouldStall()) {
            const { writebackValue, rd, isAluOperation, isLoad, isLUI } = this.getMemoryAccessValuesIn();
            if (isAluOperation || isLoad || isLUI) {
                this.regFile[rd].value = writebackValue;
            }
        }
    }
    latchNext(): void {

    }
}