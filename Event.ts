import EventParser from 'EventParser'
import { BaseNote } from 'BaseNote'
import { TFile } from 'obsidian'
import { moment } from 'obsidian';

const defaultName = "NewEvent"
const defaultFolder = "Events"

//Class representing an event with date and description
export default class Event extends BaseNote {
    static parentMetadataKeys = {
        name: "source", 
        story: "story"
    }
    static defaultFolder = "Events"
    static defaultName = "New Event"
    
    //The main description of the event without date components
    description: string
    //The title of the event file, combining date and description
    title: string = ""
    metadata: any  = {
        type: "Event",
        tags: [],
        closestDate: null,
        day: null,
        month: null,
        year: null,
        source: "",
        story: "",
        description: "",
        test: null
    }
    hasDate: boolean = false
    allowInvalid: boolean = false

    constructor(tFile: TFile | null = null, metadata: any = {}, settings: any = {}) {
        super(tFile, metadata, settings)
        this.setMetadata(metadata)

    }    

    //Extracts date information from the description and sets metadata
    public setMetadata(metadata: any){
        metadata.description = this.titleSanitize(metadata.description)
        this.mergeMetadata(this.metadata, metadata)
        const { description } = this.metadata
        if(!description) return
        if(description && description !== ""){
            const results = new EventParser(description).results
            if(results){
                this.resetDateMetadata
                this.mergeMetadata(this.metadata, results)
                this.setDescription(results.description)
                this.setTitle(this.textWithDate(this.metadata.description))
            } else {
                this.setDescription(description)
                this.setTitle(description)
            }
        } else {
            if(this.tFile){
                this.setTitle(this.tFile.basename)
                this.setDescription(this.removeDateFromString(this.tFile.basename))
            } else {
                this.title = ""
            }
        }
        this.setClosestDate()
    }

    //Sets the description, removing any date text
    private setDescription(text: string | null){
        if(text && text !== "" ) this.metadata.description = this.removeDateFromString(text)
    }

    //Sets the title based on the event's date and description
    public setTitle(title?: string){
        let newTitle = Event.constructor().defaultName
        if(this.tFile && this.tFile.basename) newTitle = this.tFile.basename
        if(title && title !== "") newTitle = title
        newTitle = this.textWithDate(this.titleSanitize(newTitle))
        if(this.isNotValid()) newTitle = this.removeDateFromString(newTitle)
        this.title = newTitle
    }

    //Generates a filename based on the event's date and description
    private textWithDate(description: string){
        const descriptionWithoutDate = this.removeDateFromString(description)
        return `${this.toDateString(true, false, " ")} • ${descriptionWithoutDate}`.trim().replace(/\s+/g, ' ')
    }

    //Clears the date metadata fields
    private resetDateMetadata() {
        this.metadata.day = ""
        this.metadata.month = ""
        this.metadata.year = ""     
    }

    //Removes date components from a string
    removeDateFromString(text: string) {
        const parts = text.split("•")
        return parts.length === 0 ? text : parts.length > 1 ? parts[1].trim() : text
    }

    //Formats the event's date as a string
    //monthAsName: use month name (Jan) or number (1)
    //fillMissing: fill missing day/month with 1
    //deliniator: character to separate date parts
    //reverse: format as Year-Month-Day instead of Day-Month-Year
    public toDateString(monthAsName: boolean = true, fillMissing: boolean = false, deliniator: string = " ", reverse: boolean = false): string {
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
        const day = this.metadata.day ? this.metadata.day : fillMissing ? "1" : null
        const month = this.metadata.month ? this.metadata.month : fillMissing ? "1" : null
        const monthName = month ? months[month - 1] : null
        const dateParts = [
            day,
            monthAsName ? monthName : month,
            this.metadata.year
        ].filter(part => part !== null && part !== "").map(part => String(part))
        const dateStr = reverse ? dateParts.reverse().join(deliniator) : dateParts.join(deliniator);
        return dateStr;
    }

    //Returns status of the BaseNote. Applies tests, defined with an isValid key (returns true only if valid) and an error message
    status(){
        const title: any = {
                isValid: this.tFile && this.tFile.name && this.tFile.name.trim().length > 0,
                message: "Title is required"
        }
        const isValidDate:  any = {
                isValid: this.isValid(),
                message: "Date is not valid"
        }
        //Pass an array containing the required tests and return an object containing status test results, 
        return this.getStatusObject([title, isValidDate])
    }

    //Validates the event's date components
    //Valid dates have at least a year, and if month/day are present they must form a valid date
    isValid(): boolean {
        if(!this.metadata.year || this.metadata.year < 0) return false
        if(!this.metadata.month && this.metadata.day) return false
        if(this.metadata.month && (this.metadata.month < 1 || this.metadata.month > 12)) return false
        if(this.metadata.day && this.metadata.month){
            const daysInMonth = this.daysInMonth(this.metadata.month - 1, this.metadata.year)
            if(this.metadata.day < 1 || this.metadata.day > daysInMonth) return false
        }
        return true
    }

    //Returns true if not a valid event
    isNotValid(): boolean {
        return !this.isValid()
    }

    //Sets the closestDate, being a date which is closed in time to the event's date, which may be missing day or month
    setClosestDate(){
        if(this.isNotValid()){
            return
            //this.metadata.closestDate don't clear closestDate while converting old Events
        } else {
            const dateString = this.toDateString(false, true, "-", true)
            const dateParts = dateString.split("/")
            this.metadata.closestDate = moment.utc(dateString, "YYYY-MM-DD").toDate()
        }
    }

    //Returns the number of days in a month for a given year
    daysInMonth(m: number, y: number) { // m is 0 indexed: 0-11
        switch (m) {
            case 1 :
                return (y % 4 == 0 && y % 100) || y % 400 == 0 ? 29 : 28;
            case 8 : case 3 : case 5 : case 10 :
                return 30;
            default :
                return 31
        }
   }


}





