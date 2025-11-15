import { App, TFile, normalizePath, Vault} from "obsidian";
import { BaseNote } from "./BaseNote";
export default class FileUpdater {
    settings: any
    vault: Vault 
    metadataCache: any
    updates : any

    constructor(app: App, settings: any | {}) {
        this.settings = settings
        this.metadataCache = app.metadataCache
        this.vault = app.vault
        this.updates = {    
            addDateProperties: this.addDateProperties,
            addMetadata: this.addMetadata
        }
    } 

    //Performs all updates on a file
    //Updates: Object containing a named updated method (key) and options for the update (value)
    doUpdates(updates: any, file: any): any {
        const requestedUpdatesCount = Object.keys(updates).length
        let updatedCount = 0
        const updateApplied = []
        const updateNotApplied = []
        Object.entries(updates).forEach(([key, update]) => {
            const method = this.updates[key];
            if(!method) return false
            const result = method(update, file)
            if(result.status === "ok") {
                updateApplied.push(result)
            } else {
                updateNotApplied.push(result)
            }
        });
        return {status: updateNotApplied.length === 0 ? "ok" : "error", message: `Updated ${updateApplied.length} of ${requestedUpdatesCount} requested updates`, file} 
    }

    //Adds a date property based on other metadata
    addDateProperties(datePropertyName: string, file: BaseNote): any {
        if(!file.tFile) return {status: "error", message: "No TFile while adding date properties"}
        if(file.metadata[datePropertyName]){
            const eventDate = new Date(file.metadata.eventDate)
            const newProperties = {
                day: eventDate.getDate(),
                month: eventDate.getMonth() + 1,
                year: eventDate.getFullYear()
            }
            file.setMetadata(newProperties)
        }
        
        return {status: "ok", message: "Date properties added", file: file}
    }

    //Adds one or more metadata properties to a file by merging with existing metadata
    //newMetadata: Object containing new property or properties to add
    addMetadata(newMetadata: any, file: BaseNote): any{
        if(!file.tFile) return {status: "error", message: "No TFile while adding metadata"}
        if(!newMetadata) return {status: "error", message: "No new property or properties when adding new metadata"}
        file.setMetadata(newMetadata)
        return {status: "ok", message: "New property or properties added", file: file}
    }



}