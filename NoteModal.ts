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
import Note from "Note";


/**
 * Modal to create a new note
 */
export class NoteModal extends Modal {
	private note: Note
	private insertIntoCurrent = false;
	private components: string[] = []
	private type: string
	private modalUtils: ModalUtils;
	private storySelector: StorySelector
    private currentStory: TFile | undefined
	private fileManager: FileManager
	private selectedText: string 
	private settings: any

	constructor(app: App, selectedText: string, settings: any = {}) {
		super(app);
		//this.components = components;
		this.note = new Note(null, {}, {})
		this.type = "Note"
		this.modalUtils = new ModalUtils(app);
		this.fileManager = new FileManager(app, {});
        this.currentStory = this.fileManager.getCurrentActiveFileOfType("Story")
		this.selectedText = selectedText
    }

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.createEl("h2", { text: `New Note` });
		this.note.metadata.title = this.selectedText || ""
		this.note.setTitle()

		/* ---------------- Title ---------------- */
		new Setting(contentEl)
			.setName('Title')
            .addTextArea((text) => {
                text
                    .setValue(this.note.metadata.title)
                    .onChange((value) => {
						//Save the title in both metadata and note title
						this.note.metadata.title = value;
						this.note.title = value;
                    });
                })


		
		/* ---------------- Category ---------------- */
		const categorySelectorOnSelect  = (selectedCategory: string) => {
			this.note.metadata.category = selectedCategory;
		}
		const categorySelector = new CategorySelector(this.app, "Note", categorySelectorOnSelect);
		categorySelector.renderCategorySelector(contentEl);
		categorySelector.renderNewCategoryInput(contentEl);

		/* ---------------- Stories ---------------- */
		const onStorySelect = (file: TFile) => { 
            this.note.metadata.stories = this.storySelector?.getSelectedStories() || []
            return file.basename
        }

		this.storySelector = new StorySelector(this.app, onStorySelect, true)
		this.storySelector.render(contentEl);

        //Add any stories from the current file to the stories list
        const stories = this.fileManager.getCurrentFileStories()
        if(stories && stories.length > 0){   
            this.storySelector?.addStories(stories)
			this.note.metadata.stories = this.storySelector?.getSelectedStories() || []
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

	//Create the note file based on the metadata entered
	 private async createNote() {
		const fileManager = new FileManager(this.app, {}); 
		
        const showNotice = (result: any) => {
            new Notice(result.message)
        }

		const onSave = this.modalUtils.createSaveCallback(showNotice)
		
		const newNote = fileManager.saveFile({
			path: `Notes/${this.note.metadata.title}.md`, 
			noteObj: this.note, onSave
	 	})
	}


	onClose() {
		this.contentEl.empty();
	}
}
