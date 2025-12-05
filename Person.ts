import { TFile } from "obsidian"
import { BaseNote } from "BaseNote"

export class Person extends BaseNote {

    //The text file in the vault containing the note's data
    tFile: TFile | null
    settings: any
    //The title of the note -- usually used for the tFile base name
    title: string = "New Note"
    metadata: any = {
        type: "Person",
        category: "",
        organisation: "",
        stories: [],
        tags: [],
        icon: "LiCircleUserRound",
        iconColour: "Blue"    
    }

    constructor(tFile: TFile | null = null, metadata: any = {}, settings: any = {}) {
        super(tFile, settings)
        this.metadata = metadata
    }

    //Returns status of the Person. Applies tests, defined with an isValid key (returns true only if valid) and an error message
    status(){
        const title: any = {
                isValid: this.tFile && this.tFile.name && this.tFile.name.trim().length > 0,
                message: "File name is required"
        }
        //Pass an array containing the required tests and return an object containing status test results, 
        return this.getStatusObject([title])
    }

}
