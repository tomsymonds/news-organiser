import { TFile } from "obsidian"
import { PropertyFormatter } from "PropertyFormatter"

export class BaseNote {

    //The text file in the vault containing the note's data
    tFile: TFile | null
    settings: any
    //The title of the note -- usually used for the tFile base name
    title: string = "New Note"
    metadata: any = {
        type: "Note",
        tags: [],
        icon: "LiNotebookPen",
        iconColour: "#6B6A6A"
    }
    contents: string = ""

    constructor(tFile: TFile | null = null, metadata: any = {}, settings: any = {}) {
        console.log(metadata)
        this.tFile = tFile 
        this.settings = settings
        this.metadata = this.setMetadata(metadata)
        // this.title = this.tFile ? this.tFile.basename : ""
    }

    public setTitle(){
        if(!this.tFile){
            this.title = "New Note"
            return
        }
        const titleString = this.tFile.basename
        this.title = titleString ? titleString  : this.title
        // this.title = titleString ? this.titleSanitize(titleString) : this.titleSanitize(this.title)
    }

    public setMetadata(metadata: any){
        return this.mergeMetadata(this.metadata, metadata)
    }

    public mergeMetadata<T extends Record<string, any>>(defaultMetadata: T, suppliedMetadata: Partial<T>): T {
        const result = { ...defaultMetadata };
        (Object.keys(suppliedMetadata) as (keyof T)[]).forEach((key) => {
            if (key in defaultMetadata) {
                result[key] = suppliedMetadata[key] as T[keyof T];
            }
        });
        this.metadata = result;
        return result
    }

    //Formats the event as a markdown text file
    public toString(){
        const formatter = new PropertyFormatter()
        const metadata: any = Object.keys(this.metadata).map((key) => {
            return `${key}: ${formatter.formatValue(this.metadata[key])}`
        })
        return `---\n${metadata.join("\n")}\n---\n`
    }    

    public isSaved(){
        return this.tFile instanceof TFile
    }

    //Returns the creation date of the note
    public createdAt(){
        if(this.tFile){
            return new Date(this.tFile.stat.ctime)
        }
    }

    //Returns the updated date of the note
    public updatedAt(){
        if(this.tFile){
            return new Date(this.tFile.stat.mtime)
        }
    }

    //Takes an array of status tests, applies them and returns an object containing an object containing isValid, true if all tests pass, and a message made up of error messages
    public getStatusObject(statusArray: any[]){
        const failed = statusArray.filter(s => !s.isValid)
        return {
            isValid: failed.length === 0,
            message: failed.map(f => f.message).join(" | ")
        }
    }


    //Returns status of the BaseNote. Applies tests, defined with an isValid key (returns true only if valid) and an error message
    status(){
        const title: any = {
                isValid: this.tFile && this.tFile.name && this.tFile.name.trim().length > 0,
                message: "File name is required"
        }
        //Pass an array containing the required tests and return an object containing status test results, 
        return this.getStatusObject([title])
    }

    //Removes illegal characters from string
    titleSanitize(input: string): string {
        if(!input || input === "") return ""
        let output = input;


        // 1. Remove code blocks (``` ... ```)
        output = output.replace(/```[\s\S]*?```/g, '');

        // 2. Remove inline code (`code`)
        output = output.replace(/`([^`]+)`/g, '$1');

        // 3. Convert links [text](url) → text
        output = output.replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1');

        // 4. Remove images ![alt](url) → alt
        output = output.replace(/!\[([^\]]*)\]\([^\)]+\)/g, '$1');

        // 5. Remove headings (#, ##, etc.)
        output = output.replace(/^#{1,6}\s*/gm, '');

        // 6. Remove emphasis (*, _, ~ for bold/italic/strikethrough)
        output = output.replace(/(\*|_|~){1,3}([^*_~]+)\1{1,3}/g, '$2');

        // 7. Remove blockquotes (>)
        output = output.replace(/^\s*>+\s?/gm, '');

        // 8. Remove unordered list markers (-, *, +)
        output = output.replace(/^\s*[-*+]\s+/gm, '');

        // 9. Remove ordered list markers (1., 2., etc.)
        output = output.replace(/^\s*\d+\.\s+/gm, '');

        // 10. Remove table dividers (| and ---)
        output = output.replace(/\|/g, ' ');
        output = output.replace(/^-{3,}\s*$/gm, '');

        // 11. Trim extra whitespace
        output = output.replace(/\s{2,}/g, ' ').trim();
        
        return output;
    }



}
