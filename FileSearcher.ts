import { App, TFile, normalizePath, Vault} from "obsidian";
import { BaseNote } from "./BaseNote";
export default class FileSearcher {
    settings: any
    vault: Vault 
    metadataCache: any
    searches: any

    constructor(app: App, settings: any | {}) {
        this.settings = settings
        this.metadataCache = app.metadataCache
        this.vault = app.vault
        this.searches = {
            isInFolder: this.isInFolder,
            titleIncludes: this.titleIncludes,
            hasProperty: this.hasProperty,
            isType: this.isType 
        }
    } 

    //Runs all search tests on a file and returns true if it passes all tests
    runSearch(tests: any, file: any) {
        let passes = true
        Object.entries(tests).forEach(([key, test]) => {
            const method = this.searches[key];
            if(!method) return false
            passes = passes &&  method(test, file)
        });
        return passes
    }


    //Search functions

    // Check if a file is in a specified folder (folderPath should be normalized)
    isInFolder(folderPath: string, file: BaseNote) :boolean {
        return file.tFile ? file.tFile.path.startsWith(folderPath) : false
    }

    // Check if a file's title includes a specified substring (case-sensitive)
    titleIncludes(substring: string, file: BaseNote): boolean {
        return file.tFile ? file.tFile.basename.includes(substring) : false;
    }

    // Check if a file has a specific property in its metadata
    hasProperty(propertyName: string, file: BaseNote): boolean {
        return file.metadata && file.metadata[propertyName] !== undefined 
    }

    // Check if a file is of a specific type based on its metadata
    isType(type: string, file: BaseNote): boolean {
        return file.metadata && file.metadata.type === type
    }

}