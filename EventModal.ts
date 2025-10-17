import { App, Modal, Setting } from 'obsidian';
import Event from 'Event'
import { de } from 'chrono-node';

//Displays an Obsidian modal to create an event note
export default class EventModal extends Modal {
    constructor(app: App, type: string, event: Event, settings: any, onSubmit: any) {
        super(app);
        this.setTitle(`${type} Event`)
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

        let descriptionInput: any
        let yearInput: any
        let monthInput: any
        let dayInput: any
        let dateDiv: any


        new Setting(this.contentEl)
            .setName('Description')
            .addTextArea((text) => {
                descriptionInput = text
                text
                    .setValue(event.metadata.description)
                    .onChange((value) => {
                        event.setMetadata({description: value});
                        dayInput.setValue(event.metadata.day ? event.metadata.day.toString() : "");
                        monthInput.setValue(event.metadata.month ? event.metadata.month.toString() : "");
                        yearInput.setValue(event.metadata.year ? event.metadata.year.toString() : "");
                        dateDiv.setText(`Date: ${event.toDateString()}`);
                    });
                })

        dateDiv = this.contentEl.createEl("div", { text: `Date: ${event.toDateString()}` });

        new Setting(this.contentEl)
            .setName('Day')
            .addText((text) => {
                dayInput = text
                text
                    .setValue(event.metadata.day ? event.metadata.day.toString() : "")
                    .onChange((value) => {
                        event.setMetadata({day: Number(value)})
                        if(event.isValid()){
                            dateDiv.setText(`Date: ${event.toDateString()}`);
                            descriptionInput.setValue(event.metadata.description);
                        } else {
                            dateDiv.setText(`Invalid date`);
                        }
                    })
            })
        new Setting(this.contentEl)
            .setName('Month')
            .addText((text) => {
                monthInput = text
                text
                    .setValue(event.metadata.month ? event.metadata.month.toString() : "")
                    .onChange((value) => {
                        event.setMetadata({month: Number(value)});
                        if(event.isValid()){
                            dateDiv.setText(`Date: ${event.toDateString()}`);
                            descriptionInput.setValue(event.metadata.description);
                        } else {
                            dateDiv.setText(`Invalid date`);
                        }
                    })
            })
        new Setting(this.contentEl)
            .setName('Year')
            .addText((text) => {
                yearInput = text
                text
                    .setValue(event.metadata.year ? event.metadata.year.toString() : "")
                    .onChange((value) => {
                        event.setMetadata({year: Number(value)});
                        if(event.isValid()){
                            dateDiv.setText(`Date: ${event.toDateString()}`);
                            descriptionInput.setValue(event.metadata.description);
                        } else {
                            dateDiv.setText(`Invalid date`);
                        }
                    })
            })

        // type == "Edit" && new Setting(this.contentEl)
        //     .setName('Parent')
        //     .addText((text) =>
        //         text
        //             .setValue(event.metadata.source.toString() || "")
        //             .onChange((value) => {
        //                 event.metadata.source = `"${value}"`;
        //             })
        //         )
        // type == "Edit" && new Setting(this.contentEl)
        //     .setName(settings.projectLinkName)
        //     .addText((text) =>
        //         text
        //             .setValue(event.metadata.story || "")
        //             .onChange((value) => {
        //                 event.metadata.story = `"${value}"`;
        //             })
        //         )
        new Setting(this.contentEl)
            .addButton((btn) => btn
            .setButtonText('Submit')
            .setCta()
            .onClick(() => {
                this.close();
                onSubmit(event);
          }));
    }
}