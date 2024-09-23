import { Register32 } from "../Register32";
import { MemoryMap, SystemInterface } from "../system-interface";
import { signExtend32, twos } from "../util";
import { Execute } from "./execute";
import { PipelineStage } from "./pipeline-stage";


export enum MemoryAccessWidth {
    Byte = 0b000,
    HalfWord = 0b001,
    Word = 0b010,
}



export interface MemoryAccessParams {
    shouldStall: () => boolean
    getExecutionValuesIn: () => ReturnType<Execute['getExecutionValuesOut']>
    bus: SystemInterface

}

export class MemoryAccess extends PipelineStage {

    private writebackValue = new Register32(0);
    private rd = new Register32(0);

    private isAluOperation = new Register32(0)
    private isLoad = new Register32(0)
    private isLUI = new Register32(0)


    private shouldStall: MemoryAccessParams['shouldStall']
    private getExecutionValuesIn: MemoryAccessParams['getExecutionValuesIn']
    private bus: MemoryAccessParams['bus']

    constructor(params: MemoryAccessParams) {
        super();
        this.shouldStall = params.shouldStall
        this.getExecutionValuesIn = params.getExecutionValuesIn
        this.bus = params.bus
    }

    compute(): void {
        if (!this.shouldStall()) {
            const { aluResult, rd, isAluOperation, isStore, rs1, rs2, imm32, funct3, isLoad, isLUI } = this.getExecutionValuesIn();
            this.writebackValue.value = aluResult
            this.rd.value = rd
            this.isAluOperation.value = isAluOperation
            this.isLoad.value = isLoad
            this.isLUI.value = isLUI

            const addr = twos(imm32 + rs1);
            if (isStore) {
                switch (funct3) {
                    case MemoryAccessWidth.Byte: {
                        this.bus.write(addr, rs2 & 0xff, MemoryAccessWidth.Byte)
                        break;
                    }
                    case MemoryAccessWidth.HalfWord: {
                        this.bus.write(addr, rs2 & 0xffff, MemoryAccessWidth.HalfWord)
                        break;
                    }
                    case MemoryAccessWidth.Word: {
                        this.bus.write(addr, rs2, MemoryAccessWidth.Word)
                        break;
                    }
                }
            } else if (isLoad) {
                const shouldSignExtend = (funct3 & 0b100) === 0;
                let value: number = 0
                switch (funct3 & 0b011) {
                    case MemoryAccessWidth.Byte: {
                        value = this.bus.read(addr, MemoryAccessWidth.Byte)
                        if (shouldSignExtend) {
                            value = signExtend32(8, value);
                        }
                        break;
                    }
                    case MemoryAccessWidth.HalfWord: {
                        value = this.bus.read(addr, MemoryAccessWidth.HalfWord)
                        if (shouldSignExtend) {
                            value = signExtend32(16, value);
                        }
                        break;
                    }
                    case MemoryAccessWidth.Word: {
                        value = this.bus.read(addr, MemoryAccessWidth.Word)
                        break;
                    }
                }
                this.writebackValue.value = value;
            } else if (isLUI) {
                this.writebackValue.value = imm32;
            }


        }


    }
    latchNext(): void {
        this.writebackValue.latchNext()
        this.rd.latchNext()
        this.isAluOperation.latchNext()
        this.isLoad.latchNext()
        this.isLUI.latchNext()
    }
    getMemoryAccessValuesOut() {
        return {
            writebackValue: this.writebackValue.value,
            rd: this.rd.value,
            isAluOperation: this.isAluOperation.value,
            isLoad: this.isLoad,
            isLUI: this.isLUI
        }
    }
}