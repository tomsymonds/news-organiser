import { TFile } from "obsidian"
import { BaseNote } from './BaseNote'


export default class Note extends BaseNote {

    metadata: any  = {
        type: "Note",
        tags: [],
        category: null,
        stories: [],
    }


    constructor(tFile: TFile | null = null, metadata: any = {}, settings: any = {}) {
        super(tFile, settings)
        this.setMetadata(metadata)
        this.setTitle()
    }
    

}

