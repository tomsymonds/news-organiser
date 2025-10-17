import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';
import * as chrono from 'chrono-node';
import Event from 'Event'
import EventModal from 'EventModal';
import { saveTextFile } from 'fileManagement';

//An Obsidian plugin to create and manage dated events
interface EventHorizonSettings {
	//Not yet on the settings page
	tags: Array<string>;
	type: string;
	projectDisplayName: string;
}

const DEFAULT_SETTINGS: EventHorizonSettings = {
	tags: ["#Event"],
	type: "Event",
	projectDisplayName: "Story"
}	

export default class EventHorizon extends Plugin {
	settings: EventHorizonSettings;

	async onload() {
		await this.loadSettings();
		// This creates an icon in the left ribbon.
		const ribbonIconEl = this.addRibbonIcon('dice', 'Event Horizon', (evt: MouseEvent) => {
			// Called when the user clicks the icon.
			new Notice('Event Horizon!');
		});
		// Perform additional things with the ribbon
		ribbonIconEl.addClass('my-plugin-ribbon-class');

		// This adds a status bar item to the bottom of the app. Does not work on mobile apps.
		const statusBarItemEl = this.addStatusBarItem();
		statusBarItemEl.setText('Status Bar Text');

		// This adds a simple command that can be triggered anywhere
		this.addCommand({
			id: 'open-sample-modal-simple',
			name: 'Open sample modal (simple)',
			callback: () => {
				new SampleModal(this.app).open();
			}
		});
		
		// Create an event from selected text, open a modal to edit details, and save to file
		this.addCommand({
			id: 'event-horizon-command-create',
			name: 'Create Event',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				const text = editor.getSelection();
				const currentFile = this.app.workspace.getActiveFile();
				const parentMetadata = currentFile? this.app.metadataCache.getFileCache(currentFile) : null
				const settings = {
					projectLinkName: this.settings.projectDisplayName
				}
				const event = new Event(text, currentFile, parentMetadata, settings, false);
				const save = (newEvent: any) => {
					if(!newEvent.valid()){	
						new Notice("Event is not valid and cannot be saved\nIt must have at least a year and a description");
						return
					}
					saveTextFile(this.app,`Events/${newEvent.fileName()}`, newEvent.toFile());
        			new Notice("File saved!");
				}
				new EventModal(this.app, "Create", event, settings, save).open()
			}
		});

		// This adds a complex command that can check whether the current state of the app allows execution of the command
		this.addCommand({
			id: 'open-sample-modal-complex',
			name: 'Open sample modal (complex)',
			checkCallback: (checking: boolean) => {
				// Conditions to check
				const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (markdownView) {
					// If checking is true, we're simply "checking" if the command can be run.
					// If checking is false, then we want to actually perform the operation.
					if (!checking) {
						new SampleModal(this.app).open();
					}

					// This command will only show up in Command Palette when the check function returns true
					return true;
				}
			}
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SampleSettingTab(this.app, this));

		// If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
		// Using this function will automatically remove the event listener when this plugin is disabled.
		this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
		});

		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));
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



class SampleModal extends Modal {
	constructor(app: App) {
		super(app);
	}

	onOpen() {
		const {contentEl} = this;
		contentEl.setText('Woah!');
	}

	onClose() {
		const {contentEl} = this;
		contentEl.empty();
	}
}

export class ExampleModal extends Modal {
  constructor(app: App, onSubmit: any) {
    super(app);
	this.setTitle('What\'s your name?');

	let name = '';
    new Setting(this.contentEl)
      .setName('Name')
      .addText((text) =>
        text.onChange((value) => {
          name = value;
        }));
		 

    new Setting(this.contentEl)
      .addButton((btn) =>
        btn
          .setButtonText('Submit')
          .setCta()
          .onClick(() => {
            this.close();
            onSubmit(name);
          }));
  
  }
}

class SampleSettingTab extends PluginSettingTab {
	plugin: EventHorizon;

	constructor(app: App, plugin: EventHorizon) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

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

	}
}

