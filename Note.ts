import { TFile } from "obsidian"
import { BaseNote } from './BaseNote'


export default class Note extends BaseNote {

    constructor(tFile: TFile | null = null, metadata: any = {}, settings: any = {}) {
        super(tFile, metadata, settings)
        this.setMetadata(metadata)
    }
    

}

