import {
    App,
    Modal,
    Setting,
    TFile,
    TextComponent,
    ToggleComponent,
    DropdownComponent,
    normalizePath,
    Notice,
} from "obsidian";

import PersonSelector from "./PersonSelector";
import StorySelector from "StorySelector";
import CategorySelector from "./CategorySelector";
import { FileManager } from "fileManagement";
import { ModalUtils } from "./ModalUtils";
import { Person } from 'Person'


/**
 * Modal to create a new note
 */
export class PersonModal extends Modal {
    private person: Person;
    private insertIntoCurrent = false;
    private components: string[] = []
    private type: string
    private defaultText: string
    private modalUtils: ModalUtils;
    private personSelector: any

    constructor(app: App, defaultText: string, components: string[], doInsert: boolean = false) {
        super(app);
        this.components = components;
        this.person = new Person(null, {}, null)
        this.person.metadata.type = "Person";
        this.defaultText = defaultText
        this.insertIntoCurrent = doInsert;
        this.modalUtils = new ModalUtils(app);
    }


    onOpen() {
        const { contentEl } = this;
        const onExistingPersonSelect = (person: TFile) => {
            // Insert link at cursor if insertIntoCurrent is enabled
            if (this.insertIntoCurrent && this.app.workspace.activeEditor?.editor) {
                const editor = this.app.workspace.activeEditor.editor;
                editor.replaceSelection(`[[${person.basename}]]`);
            }
            
            // Close the modal after inserting
            this.close();
            
            return person;
        }

        this.personSelector = new PersonSelector(this.app, this.defaultText, onExistingPersonSelect);
        contentEl.empty();
        contentEl.createEl("h2", { text: `New ${this.person.metadata.type}` });

        if(this.components.includes("title")) {
        /* ---------------- Title ---------------- */
        new Setting(contentEl)
            .setName('Title')
            .addTextArea((text) => {
                text
                    .setValue(this.defaultText)
                    .onChange((value) => {
                        this.person.metadata.title = value;
                        this.personSelector.onInputUpdate(value)
                    });
                })

        }



        /* ---------------- Existing People Suggestions ---------------- */


        this.personSelector.render(this.contentEl);
        
        if(this.components.includes("category")) {
            /* ---------------- Category ---------------- */
            const categorySelectorOnSelect  = (selectedCategory: string) => {
                this.person.metadata.category = selectedCategory;
            }
            const categorySelector = new CategorySelector(this.app, "Note", categorySelectorOnSelect);
            categorySelector.renderCategorySelector(contentEl);
            categorySelector.renderNewCategoryInput(contentEl);
        }



        if(this.components.includes("stories")) {
        /* ---------------- Story ---------------- */
            const onStorySelect = (file: TFile) => { 
                this.person.metadata.story = [`[[${file.basename}]]`];
                return this.person.metadata.story;
            }
            const storyModal = new StorySelector(this.app, onStorySelect);
            storyModal.render(contentEl);
        }

        if(this.components.includes("story")) {
        /* ---------------- Story ---------------- */
            const onStorySelect = (file: TFile) => { 
                this.person.metadata.story = `[[${file.basename}]]`;
                return this.person. metadata.story;
            }
            const storyModal = new StorySelector(this.app, onStorySelect);
            storyModal.render(contentEl);
        }

        // /* ---------------- Insert Toggle ---------------- */
        // new Setting(contentEl)
        // 	.setName("Insert into current document")
        // 	.setDesc("If enabled, the note link will be inserted into the current note.")
        // 	.addToggle((toggle: ToggleComponent) => {
        // 		toggle.setValue(this.insertIntoCurrent);
        // 		toggle.onChange((val) => (this.insertIntoCurrent = val));
        // 	});

        /* ---------------- Create Button ---------------- */
        new Setting(contentEl)
            .addButton((btn) =>
                btn
                    .setButtonText("Create Note")
                    .setCta()
                    .onClick(() => {
                        this.createNote()
                        this.close();
                    })
            );
    }

    private async createNote() {
        console.log("Creating note with metadata:", this.person.metadata);
        const fileManager = new FileManager(this.app, {}); 
        const noteObj = {	
            title: this.person.metadata.title,
            metadata: this.person.metadata
        }
        
        const showNotice = (result: any) => {
            new Notice(result.message)
        }

        const onSave = this.modalUtils.createSaveCallback(showNotice)
        
        const newNote = fileManager.saveFile({
            path: `${this.person.metadata.type}s/${this.person.metadata.title}.md`, 
            noteObj, onSave
        })
    }


    // 	if (!this.noteTitle) {
    // 		new Notice("Please enter a title.");
    // 		return;
    // 	}

    // 	const fileName = `${this.noteTitle}.md`;
    // 	const filePath = normalizePath(fileName);

    // 	let content = `---\ntype: ${this.noteType}\ncategory: ${this.category}\n`;
    // 	if (this.storyTitle) content += `story: ${this.storyTitle}\n`;
    // 	content += `---\n\n# ${this.noteTitle}\n`;

    // 	const newFile = await this.app.vault.create(filePath, content);

    // 	new Notice(`Created note: ${fileName}`);

    // 	if (this.insertIntoCurrent && this.app.workspace.activeEditor?.editor) {
    // 		const editor = this.app.workspace.activeEditor.editor;
    // 		editor.replaceSelection(`[[${newFile.basename}]]`);
    // 		}

    // 	this.close();
    // }

    onClose() {
        this.contentEl.empty();
    }
}
// ⚙️ Usage Example in Your Plugin
// ts
// Copy code
// import { Plugin } from "obsidian";
// import { CreateNoteModal } from "./CreateNoteModal";

// export default class MyPlugin extends Plugin {
// 	onload() {
// 		this.addCommand({
// 			id: "create-note-modal",
// 			name: "Create New Note (Modal)",
// 			callback: () => new CreateNoteModal(this.app).open(),
// 		});
// 	}
// }