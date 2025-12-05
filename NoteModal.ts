import {
	App,
	Modal,
	Setting,
	TFile,
	Notice,
} from "obsidian";

import StorySelector from "./StorySelector";
import CategorySelector from "./CategorySelector";
import { FileManager } from "fileManagement";
import { ModalUtils } from "./ModalUtils";
import { BaseNote } from "BaseNote";


/**
 * Modal to create a new note
 */
export class NoteModal extends Modal {
	private note: BaseNote
	private insertIntoCurrent = false;
	private components: string[] = []
	private type: string
	private modalUtils: ModalUtils;

	constructor(app: App, type: string, components: string[]) {
		super(app);
		this.components = components;
		this.note = new BaseNote(null, {}, null)
		this.modalUtils = new ModalUtils(app);
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.createEl("h2", { text: `New Note` });

		if(this.components.includes("title")) {
		/* ---------------- Title ---------------- */
		new Setting(contentEl)
			.setName('Title')
            .addTextArea((text) => {
                text
                    .setValue(this.note.metadata.title)
                    .onChange((value) => {
						this.note.metadata.title = value;
                    });
                })

		}
		
		if(this.components.includes("category")) {
			/* ---------------- Category ---------------- */
			const categorySelectorOnSelect  = (selectedCategory: string) => {
				this.note.metadata.category = selectedCategory;
			}
			const categorySelector = new CategorySelector(this.app, "Note", categorySelectorOnSelect);
			categorySelector.renderCategorySelector(contentEl);
			categorySelector.renderNewCategoryInput(contentEl);
		}

		if(this.components.includes("stories")) {
		/* ---------------- Story ---------------- */
			const onStorySelect = (file: TFile) => { 
				this.note.metadata.story = [`[[${file.basename}]]`];
				return this.note.metadata.story;
			}
			const storyModal = new StorySelector(this.app, onStorySelect);
			storyModal.render(contentEl);
		}

		if(this.components.includes("story")) {
		/* ---------------- Story ---------------- */
			const onStorySelect = (file: TFile) => { 
				this.note.metadata.story = `[[${file.basename}]]`;
				return this.note.metadata.story;
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
		console.log("Creating note with metadata:", this.note.metadata);
		const fileManager = new FileManager(this.app, {}); 
		const noteObj = {	
			title: this.note.metadata.title,
			metadata: this.note.metadata
		}
		
        const showNotice = (result: any) => {
            new Notice(result.message)
        }

		const onSave = this.modalUtils.createSaveCallback(showNotice)
		
		const newNote = fileManager.saveFile({
			path: `${this.note.metadata.type}s/${this.note.metadata.title}.md`, 
			noteObj, onSave
	 	})
	}


	onClose() {
		this.contentEl.empty();
	}
}
