import { TFile } from "obsidian"
import { BaseNote } from './BaseNote'


export default class Note extends BaseNote {

    constructor(tFile: TFile | null = null, metadata: any = {}, settings: any = {}) {
        const noteDefaults = {
            type: "Note",
            tags: [],
            category: null,
            stories: [],
            title: ""
        };
        super(tFile, { ...noteDefaults, ...metadata }, settings)
        this.setTitle()
    }
    

}

