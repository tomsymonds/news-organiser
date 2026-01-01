import { App, Modal, Setting } from 'obsidian';
import { FileManager, FilePostSaveHandler } from './fileManagement';
import { ModalUtils } from './ModalUtils';

//Displays an Obsidian modal to create an event note
export default class NewsModal extends Modal {

    modalUtils: ModalUtils;
    fileManager: FileManager
    settings: any

    constructor(app: App, settings: any = {}) {
        super(app);
        this.modalUtils = new ModalUtils(app);
        this.fileManager = new FileManager(app, {});
        this.settings = settings    

        //Add a listener for Enter key to submit the form
        this.scope.register([], 'Enter', (evt: KeyboardEvent) => {
            if (evt.isComposing) {
                return;
            }
            evt.preventDefault()	
            const actionBtn = document
                    .getElementsByClassName('mod-cta')
                    .item(0) as HTMLButtonElement | null;
                actionBtn?.click();
        });
    }
           
}