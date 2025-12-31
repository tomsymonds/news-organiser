import { App, Editor, MarkdownView, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';
import Event from './Event'
import EventModal from './EventModal';
import { FileWrangler, FileManager } from './fileManagement';
import { NoteModal } from './NoteModal'; 
import { PersonModal } from './PersonModal';



//An Obsidian plugin providing tools for journalists.
interface NewsOrganiserSettings {
	tags: string;
	type: string;
	projectDisplayName: string;
}

const DEFAULT_SETTINGS: NewsOrganiserSettings = {
	tags: "Event",
	type: "Event",
	projectDisplayName: "Story"
}	

export default class NewsOrganiser extends Plugin {
	settings: NewsOrganiserSettings;

	async onload() {
		await this.loadSettings();

		// This adds a status bar item to the bottom of the app. Does not work on mobile apps.
		const statusBarItemEl = this.addStatusBarItem();
		statusBarItemEl.setText('Status Bar Text');

		this.addCommand({
 			id: "news-organiser-create-note",
 			name: "Create Note",
 			callback: () => {
				const view = this.app.workspace.getActiveViewOfType(MarkdownView);
				const text = view?.editor?.getSelection() || "";
				new NoteModal(this.app, text, this.settings).open()
			}
 		});

		this.addCommand({
 			id: "news-organiser-create-person",
 			name: "Create Person",
			callback: () => {
				const view = this.app.workspace.getActiveViewOfType(MarkdownView);
				const text = view?.editor?.getSelection() || "";
				new PersonModal(this.app, text, this.settings).open()
			}
 		});

		// Create an event from selected text, open a modal to edit details, and save to file
		this.addCommand({
			id: 'news-organiser-create-event',
			name: 'Create Event',
			callback: () => {
				const view = this.app.workspace.getActiveViewOfType(MarkdownView);
				const text = view?.editor?.getSelection() || "";
				new EventModal(this.app, text, this.settings).open()
			}
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new EventSettingsTab(this.app, this));

		// If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
		// Using this function will automatically remove the event listener when this plugin is disabled.
		this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
		});

		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		//this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));
	}

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class EventSettingsTab extends PluginSettingTab {
	plugin: NewsOrganiser;

	constructor(app: App, plugin: NewsOrganiser) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();
		
		//Setting for default event type - 
		new Setting(containerEl)
			.setName('Default type')
			.setDesc('Add this type to every event created')
			.addText(text => text
				.setPlaceholder('Type')
				.setValue(this.plugin.settings.type)
				.onChange(async (value) => {
					this.plugin.settings.type = value;
					await this.plugin.saveSettings();
				}));

		// Setting for project display name
		new Setting(containerEl)
			.setName('Display name for projects')
			.setDesc('Use this name when linking to projects')
			.addText(text => text
				.setPlaceholder('Display name')
				.setValue(this.plugin.settings.projectDisplayName)
				.onChange(async (value) => {
					this.plugin.settings.projectDisplayName = value;
					await this.plugin.saveSettings();
				}));
		
		//Setting for default tags
		new Setting(containerEl)
			.setName('Default tags')
			.setDesc('Add these tags to every event created, separated by spaces')
			.addText(text => text
				.setPlaceholder('Tags')
				.setValue(this.plugin.settings.tags)
				.onChange(async (value) => {
					this.plugin.settings.tags = value;
					await this.plugin.saveSettings();
				}));
	}
}

