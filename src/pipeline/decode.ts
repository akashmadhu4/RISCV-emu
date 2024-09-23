import { Register32 } from "../Register32";
import { MemoryMap, SystemInterface } from "../system-interface";
import { bit, boolToInt, signExtend32, slice32 } from "../util";
import { PipelineStage } from "./pipeline-stage";




export interface DecodeParams {
    shouldStall: () => boolean
    getInstructionIn: () => number
    regFile: Array<Register32>
}

export class Decode extends PipelineStage {

    private instruction = new Register32(0);
    private opcode = new Register32(0);
    private rd = new Register32(0);
    private funct3 = new Register32(0);
    private rs1 = new Register32(0);
    private rs2 = new Register32(0);
    private imm11_0 = new Register32(0);
    private shamt = new Register32(0);
    private funct7 = new Register32(0);
    private isAluOperation = new Register32(0);
    private isStore = new Register32(0);
    private isLoad = new Register32(0);
    private isLUI = new Register32(0);
    private isJAL = new Register32(0);

    private imm32 = new Register32(0);
    private branchAddress = new Register32(0);


    private regFile: DecodeParams['regFile']



    private shouldStall: DecodeParams['shouldStall']
    private getInstructionIn: DecodeParams['getInstructionIn']

    constructor(params: DecodeParams) {
        super();
        this.shouldStall = params.shouldStall
        this.getInstructionIn = params.getInstructionIn
        this.regFile = params.regFile
    }

    compute(): void {
        if (!this.shouldStall()) {
            this.instruction.value = this.getInstructionIn();
            this.opcode.value = this.instruction.nextValue & 0x7f;
            this.rd.value = (this.instruction.nextValue >> 7) & 0x1f;
            this.funct3.value = (this.instruction.nextValue >> 12) & 0x07;
            this.imm11_0.value = (this.instruction.nextValue >>> 20) & 0xfff;
            this.funct7.value = (this.instruction.nextValue >>> 25) & 0x7f;
            const rs1Address = (this.instruction.nextValue >> 15) & 0x1f;
            const rs2Address = (this.instruction.nextValue >> 20) & 0x1f;
            this.shamt.value = rs2Address;

            this.rs1.value = rs1Address === 0 ? 0 : this.regFile[rs1Address].value
            this.rs2.value = rs2Address === 0 ? 0 : this.regFile[rs2Address].value

            this.isAluOperation.value = boolToInt((this.opcode.nextValue & 0b1011111) === 0b0010011);
            this.isStore.value = boolToInt((this.opcode.nextValue === 0b0100011));
            this.isLoad.value = boolToInt((this.opcode.nextValue === 0b0000011));
            this.isLUI.value = boolToInt((this.opcode.nextValue === 0b0110111));

            const i = this.instruction.nextValue

            const sImm = signExtend32(12, ((i >> 25 & 0x7f) << 5) | ((i >> 7) & 0x1f));
            const iImm = signExtend32(12, (this.imm11_0.nextValue));
            const uImm = (i >>> 12) << 12;
            const jImm = bit(31, i, 20) | slice32(19, 12, i, 19) | bit(20, i, 11) | slice32(30, 21, i, 10); n



            if (this.isStore.nextValue) {
                this.imm32.value = sImm
            } else if (this.isAluOperation.nextValue || this.isLoad.nextValue) {
                this.imm32.value = iImm
            } else if (this.isLUI.nextValue) {
                this.imm32.value = uImm
            }
            else {
                throw new Error('Not Implemented');
            }
        }

    }
    latchNext(): void {
        this.instruction.latchNext()
        this.opcode.latchNext()
        this.rd.latchNext()
        this.funct3.latchNext()
        this.rs1.latchNext()
        this.imm11_0.latchNext()
        this.funct7.latchNext()
        this.shamt.latchNext()
        this.rs1.latchNext()
        this.rs2.latchNext()
        this.isAluOperation.latchNext()
        this.isStore.latchNext()
        this.isLoad.latchNext()
        this.imm32.latchNext()
        this.isLUI.latchNext()
    }

    getDecodedValuesOut() {
        return {
            instruction: this.instruction.value,
            opcode: this.opcode.value,
            rd: this.rd.value,
            funct3: this.funct3.value,
            rs1: this.rs1.value,
            imm11_0: this.imm11_0.value,
            funct7: this.funct7.value,
            shamt: this.shamt.value,
            rs2: this.rs2.value,
            isAluOperation: this.isAluOperation.value,
            isStore: this.isStore.value,
            isLoad: this.isLoad.value,
            isLUI: this.isLUI.value,
            imm32: this.imm32.value,

        }
    }
}