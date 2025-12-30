import { TFile } from "obsidian"
import { BaseNote } from "./BaseNote"

export class Person extends BaseNote {

    //The text file in the vault containing the note's data
    tFile: TFile | null
    settings: any
    //The title of the note -- usually used for the tFile base name
    title: string = "New Note"
    metadata: any

    constructor(tFile: TFile | null = null, metadata: any = {}, settings: any = {}) {
        const noteDefaults = {
            type: "Person",
            category: "",
            organisation: "",
            stories: [],
            tags: [],
            aliases: [],
        };
        super(tFile, { ...noteDefaults, ...metadata }, settings)
        this.setTitle()
    }

    //Set the title and update aliases
    setTitle(title?: string){
        if(title){
            this.title = title
        } else if(this.tFile?.basename){
            this.title = this.tFile.basename
        } else if (this.metadata.title){
            this.title = this.metadata.title
        } else {
            this.title = "New Note"
        }
        this.setAliases()
    }

    //Create aliases with the first alias being the title before the first comma
    setAliases(){
        this.metadata.aliases = [this.title.split(",")[0].trim()];
    }

    //Add a story link to the person's list of stories
    addStory(storyLink: []){
        this.metadata.stories = [...new Set([...this.getListFromMetdataField("stories"), storyLink])]
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

    //Helper to get a list from a metadata field that may be stored as a comma-separated string or an array
    private getListFromMetdataField(fieldName: string): string[] {
        const fieldValue = this.metadata[fieldName];
        if (Array.isArray(fieldValue)) {
            return fieldValue;
        } else if (typeof fieldValue === 'string') {
            return fieldValue.split(',').map((item: string) => item.trim());
        } else {
            return [];
        }   
    }
    

}
