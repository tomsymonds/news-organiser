import { App, TFile, normalizePath, Vault} from "obsidian";
import { BaseNote } from 'BaseNote'
import Event from "Event";
import FileSearcher from "FileSearcher";
import FileUpdater from "FileUpdater";

//Manages files in the Obsidian vault. Handles Creating, Getting, and Updating text files.
//Naming: 
// A tFile is an instance of TFile, the standard Obsidian file type
// A File is a wrapper around a tFile that adds additional functionality, including metadata management
// File manager can:
// * Create a new Obsidian tFile from a File object and save it to the vault
// * Get an existing Obsidian tFile from the vault and return it as a File
// * Update an existing Obsidian tFile in the vault based on a File object
export class FileManager {
    app: App
    //Settings are from Obsidian plugin
    settings: any
    vault: Vault

    constructor(app: App, settings: any | {}) {
        this.app = app
        this.settings = settings
        this.vault = app.vault
    }

    //Save a file creating if it doesn't exist and updating if it does.
    saveFile(options: any): any {
        if(this.fileExists(options.path)){
            return this.updateFile(options)
        } else {
            return this.createFile(options)
        }
    }

        // Get a file from the vault based on its path and return a full file object
    getFile(filePath: string): any {
        if(!filePath) return {status: "error", message: "No file path provided"}
        const { fullPath,  } = this.pathParts(filePath)
        const tFile = this.getTFile(fullPath)
        if(!tFile) return {status: "error", message: `File not found: ${fullPath}`}
        const newFile = this.createFileFromTFile(tFile as TFile)
        return {status: "ok", file: newFile}
    }

    //Create a new file in the vault based on a note object
    //Path - the path at which to save the object
    //noteObj - an instance of a noteObj class -- eg BaseNote, Event etc.
    //onCreate: a callback function to call when the file is created or if there is an error
     private createFile(options: any): any{
        const { path, noteObj, onSave } = options
        if(!onSave) return {status: "error", message: "ERROR: No onCreate callback provided in FileManager createFile"}
        const { name, folder } = this.pathParts(path)
        const savePath = this.getPath(folder, noteObj.title ? noteObj.title : name)
        if(this.fileExists(savePath)){
            onSave({status: "error", message: `Attempted to create but file exists`})
            return
        }
        const newFile = noteObj
        //Create and update the tFile metadata
        this.vault.create(savePath, "").then((tFile) => {
            newFile.tFile = tFile
            const parentMetadataKeys = newFile.constructor.parentMetadataKeys
            if(parentMetadataKeys && Object.keys(parentMetadataKeys.length > 0)){
                const parentMetadata = this.getActiveFileMetadata()
                if(parentMetadata){
                    this.addMatchingKeys(parentMetadata, parentMetadataKeys, newFile.metadata)
                }
            }
            this.app.fileManager.processFrontMatter(tFile, (frontmatter) => {
                Object.keys(newFile.metadata).forEach((key) => {
                    frontmatter[key] = newFile.metadata[key];
                });
            })
            onSave({status: "ok", message: `Created new ${newFile.metadata.type.toLowerCase()}: ${name} in ${folder}`, file: newFile})
        }).catch((error) => {
            onSave({status: "error", message: `Error creating ${newFile.type}: ${error}`})
        });
        return {status: "pending", message:""}  
    }   

    // Update the metadata and title of the current file. Does not update the file contents.
    private async updateFile(options: any): Promise<any>{
        const { path, noteObj, onSave } = options
        const newTitle = noteObj.title
        const metadata = noteObj.metadata
        if(!onSave) return {status: "error", message: "No onUpdate callback provided"}
        const { fullPath, name } = this.pathParts(path)
        const fileResult = this.getFile(fullPath)
        if(fileResult.status === "error") {
            onSave({status: "error", message: fileResult.message})
            return
        }
        const file = fileResult.file
        if(!file) onSave({status: "error", message: "No file to update"})
        if(!(file.tFile instanceof TFile)) onSave({status: "error", message: "File has no TFile"});
        if(!file.metadata) onSave({status: "error", message: "File has no metadata"})
        if(!metadata || Object.keys(metadata).length === 0) onSave({status: "error", message: "No metadata to update"})
        //Set the object's metadata to the new values
        file.setMetadata(metadata)
        this.app.fileManager.processFrontMatter(file.tFile, (frontMatter) => {
            Object.keys(file.metadata).forEach((key) => {
                frontMatter[key] = file.metadata[key];
            })
        }).then(async () => {
            //Update the file name if it has changed    
            const fileStatus = file.status()
            if(file.status().isValid){
                if(newTitle && file.tFile.basename !== newTitle){
                    await this.renameTFile(file.tFile, newTitle).then(() => {
                        onSave({status: "ok", message: `Updated "${name}"`, file: file})
                    }).catch((error) => {
                        onSave({status: "error", message: `Error renaming: "${name}": ${error}`, file: file})
                    })
                } else { 
                    onSave({status: "ok", message: `Updated: "${name}"`, file: file})
                }
            } else {
                onSave({status: "error", message: `Error updating: "${name}". ${fileStatus.message}`, file: file})  
            } 
        }).catch((error) => {
            onSave({status: "error", message: `Error updating: "${name}": ${error}`, file: file})
        })          
    }

    //Rename a TFile in the vault
    private async renameTFile(file: TFile, newTitle: string): Promise<void> {
        if(!(file instanceof TFile)) return
        const fileExtension = file.extension;
        const parentPath = file.parent && file.parent.path ? file.parent.path : "";
        const newPath = `${parentPath}/${newTitle}.${fileExtension}`;
        await this.app.fileManager.renameFile(file, newPath);
    }

    //Get the current active file in the workspace as a file object
    private getActiveTFile(): BaseNote | null {
        const currentTFile =  this.app.workspace.getActiveFile()
        if(!currentTFile) return null
        return this.createFileFromTFile(currentTFile)
    }

    // Get a TFile from the vault based on a path
    private getTFile(filePath: string): any {
        const vault = this.app.vault;   
        if(filePath) {
            const { fullPath } = this.pathParts(filePath)
            return vault.getAbstractFileByPath(fullPath);
        }
    }


    //Convert a TFile to a file object with metadata
    private createFileFromTFile(baseFile: TFile): any {
         if(baseFile && baseFile instanceof TFile){
            const fileCache = this.app.metadataCache.getFileCache(baseFile)
            const metadata = fileCache? 
                fileCache.frontmatter? 
                    fileCache.frontmatter : {}
                : {}
            const newFile = this.getFileFromType(metadata.type, baseFile, metadata)
            return newFile
        } 
    }   

    //Get the active file and return its metadata, including its name as a link
    private getActiveFileMetadata(): any {
        const activeFile = this.getActiveTFile();
        if(!activeFile) return {}
		const name = activeFile.tFile ? `[[${activeFile.tFile.basename}]]` : null
        if(!(activeFile && activeFile.tFile instanceof TFile)){
            return {} 
        } else {
            return {
                name,
                ...activeFile.metadata
            }    
        }
    }
        
    //Return an instance of a file based on its type
    private getFileFromType(type: string, tFile: TFile, metadata: any): any {
        if(!type) return new BaseNote(tFile, metadata, this.settings)
        const types: { [key: string]: () => any } = {
            "Event": () => { return new Event(tFile, metadata, this.settings) },
            "Note": () => { return new BaseNote(tFile, metadata, this.settings) }
        }
        const requestedType = types[type]
        return requestedType ? requestedType() : new BaseNote(tFile, metadata, this.settings)
    }

    // Get a Promise to return the contents of a Note
    async getNoteContents(Note: BaseNote): Promise<string | null> {
        if(Note.tFile instanceof TFile){
            return this.app.vault.cachedRead(Note.tFile)
        }
        return null
    }

    //Check if a file exists in the vault
    private fileExists(filePath: string): boolean {
        const vault = this.app.vault;
        const normalizedFilePath = normalizePath(filePath)
        let file = vault.getAbstractFileByPath(normalizedFilePath);
        return file instanceof TFile;
    }

    //Construct a full path from a folder and name
    private getPath(folder: string, name: string){
        return `${folder}/${name}.md`
    }

    //Returns parts of a path string - folder, name of file without extension, and full path with extension.
    //Takes a path and a noteObj. If the noteObj has a title, this is used as the name of the file.
    private pathParts(filePath: string): {folder: string, name: string, fullPath: string} {
        const parts = filePath.split("/")
        const nameWithExt = parts.pop() || ""
        const folder = parts.join("/")
        const name = nameWithExt.endsWith(".md") ? nameWithExt.slice(0, -3) : nameWithExt
        const fullPath = filePath.endsWith(".md") ? filePath : `${filePath}.md`
        return {folder, name, fullPath}
    }

    //Add values in obj1 which are have keys included in the keys object, to obj 2 using the display name of each key, set as keys values
    private addMatchingKeys(obj1: any, keys: any, obj2: any) {
        Object.keys(keys).forEach((key: string) => {
            if (obj1.hasOwnProperty(key)) {
                obj2[keys[key]] = obj1[key];
            }
        });
        return obj2;
    }


    private titleSanitize(titleString: string): string {
        return titleString ? titleString.replace(/\*|_|~|`|#+|\[|\]|\(|\)|>|!|\||-/, "") : titleString
    }
        
}

//Formats property values for Obsidian frontmatter
export class PropertyFormatter {
    //Checks if a string is an Obsidian link
    private isObsidianLink(value: string): boolean {
        return value.startsWith("[[") && value.endsWith("]]");
    }

    //Formats an Event property value as a string for frontmatter
    private formattedLink(value: string): string {
        return `"${value}"`;
    }

    //
    private formattedValue(value: any): string {
        // if (typeof value === 'string') {
        //     return `${value}`;
        // }
        return `${String(value)}`;
    }

    //Returns array formatted for markdown metadata
    private formattedArray(value: any[]): string {
        if(value.length == 0) return "";
        const arrayString: Array<string> = value.map((v: any) => `  - ${v}`);
        return `\n${arrayString.join('\n')}`;
    }

    // Do formatting
    private formatters: Array<(value: any) => string | undefined> = [
        (v) => Array.isArray(v) ? this.formattedArray(v) : undefined,
        (v) => typeof v === 'string' && this.isObsidianLink(v) ? this.formattedLink(v) : undefined,
        (v) => typeof v === 'string' ? this.formattedValue(v) : undefined,
        (v) => this.formattedValue(v) // fallback
    ];

    // Formats a value based on its type
    public formatValue(value: any): string {
        for (const fn of this.formatters) {
            const result = fn(value);
            if (result !== undefined) return result;
        }
        return ""; // if nothing matches
    }
}

export class FileWrangler {
    app: App
    metadataCache: any
    settings: any
    vault: Vault 
    fileManager: FileManager

    constructor(app: App, settings: any | {}) {
        this.app = app
        this.settings = settings
        this.metadataCache = app.metadataCache
        this.vault = app.vault
        this.fileManager = new FileManager(app, settings)
    }

    //Find files matching search terms and update them with specified updates
    async findAndUpdate(options: any = {}): Promise<any> {
        const { terms, updates } = options;
        const matchingResult = this.searchFiles(terms);
        const updatedResult = this.updateFiles(updates, matchingResult.files);
        const saved: any = []
        const notSaved: any = []
        if(updatedResult.status == "ok"){
            const { updatedResults } = updatedResult
            updatedResults.forEach(async(updateResult: any) => {
                const { file } = updateResult
                const onSave = (result: any) =>{
                    updateResult.saveResult = result
                    if(result.status === "ok"){
                        saved.push(updateResult)
                    } else {
                        notSaved.push(updateResult)
                    }
                        
                }  
                await this.fileManager.saveFile({path: file.tFile.path, noteObj:file, onSave})
            })
        }   
        return {updatedResult, saved, notSaved}
    }   

    //Search files in the vault based on search terms
    private searchFiles(terms: any) {
        if(!terms || Object.keys(terms).length === 0) return {status: "error", message: "No valid search terms", files: []}
        const filesAll = this.vault.getMarkdownFiles();
        if(!filesAll || filesAll.length === 0) return {status: "noFiles", message: "No markdown files in vault", files: []}
        const searcher = new FileSearcher(this.app, this.settings);
        const matchingFiles = filesAll.filter((file) => {
            const fileObjResult = this.fileManager.getFile(file.path);
            if (!fileObjResult.file) return false;
            const fileObj = fileObjResult.file;
            return searcher.runSearch(terms, fileObj);  
        });
        return {status: matchingFiles.length > 0 ? "ok" : "noFiles", message: `Found ${matchingFiles.length} file${matchingFiles.length === 1 ? "" : "s"}`, files: matchingFiles};
    }

    //Update files based on updates
    private updateFiles(updates: any, matchingFiles: TFile[]) {
        if (!matchingFiles || matchingFiles.length === 0) return {status: "error", message: "no valid files to update", files: []};
        if (!updates || Object.keys(updates).length === 0) return {status: "error", message: "no valid updates", files: []};
        const fileUpdater = new FileUpdater(this.app, this.settings);
        const fileManager = new FileManager(this.app, this.settings)
        const updatedResults = <any>[]
        const notUpdatedResults = <any>[]
        matchingFiles.forEach((file) => {
            const fileObjResult: any = this.fileManager.getFile(file.path);
            if (!fileObjResult.file) return;
            const fileObj: BaseNote = fileObjResult.file;
            const updateResult = fileUpdater.doUpdates(updates, fileObj);
            if(updateResult.status !== "ok"){
                notUpdatedResults.push(updateResult)
            } else {
                updatedResults.push(updateResult)
            }
        });
        return {
            status: notUpdatedResults.length > 0 ? "error" : "ok", 
            updatedResults, 
            notUpdatedResults
        }
    }



    

}