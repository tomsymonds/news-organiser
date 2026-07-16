import { App, Notice, Setting, TFile, TextComponent } from 'obsidian';
import NewsModal from './NewsModal';

export type SourceReliability = 'confirmed' | 'reported' | 'unconfirmed';

export interface SourceModalResult {
    sourceLink: string;
    sourceDescription: string;
    reliability: SourceReliability;
}

export class SourceModal extends NewsModal {
    private sourceLink = '';
    private sourceDescription = '';
    private reliability: SourceReliability = 'confirmed';
    private readonly onSubmit: (result: SourceModalResult) => void;
    private sourceLinkInput: TextComponent | null = null;
    private sourceDescriptionInput: TextComponent | null = null;
    private linkSuggestionsEl: HTMLElement | null = null;

    constructor(app: App, sourceLinkPrefill: string, onSubmit: (result: SourceModalResult) => void, settings: any = {}) {
        super(app, settings);
        this.sourceLink = this.sanitizeSourceLinkPrefill(sourceLinkPrefill || '');
        this.onSubmit = onSubmit;
    }

    private sanitizeSourceLinkPrefill(value: string): string {
        const trimmed = value.trim();
        if (!trimmed) {
            return '';
        }

        return trimmed
            .replace(/^👁️‍🗨️\s*/, '')
            .replace(/^source:\s*/i, '')
            .trim();
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.createEl('h2', { text: 'Add Source' });

        new Setting(contentEl)
            .setName('Source link')
            .setDesc('A URL or an Obsidian wikilink, prefilled from clipboard when available.')
            .addText((text) => {
                this.sourceLinkInput = text;
                text
                    .setPlaceholder('https://example.com or [[Note title]]')
                    .setValue(this.sourceLink)
                    .onChange((value) => {
                        this.sourceLink = value;
                        this.updateLinkSuggestions(value);
                    });
                window.setTimeout(() => text.inputEl.focus(), 0);
            });

        this.linkSuggestionsEl = contentEl.createDiv({ cls: 'news-organiser-link-suggestions' });
        this.linkSuggestionsEl.hide();

        new Setting(contentEl)
            .setName('Source description')
            .setDesc('Used as display text for the link.')
            .addText((text) => {
                this.sourceDescriptionInput = text;
                text
                    .setPlaceholder('Short description of the source')
                    .setValue(this.sourceDescription)
                    .onChange((value) => {
                        this.sourceDescription = value;
                    });
            });

        const reliabilitySetting = new Setting(contentEl)
            .setName('Reliability')
            .setDesc('Select one reliability level.');

        const reliabilityOptions: SourceReliability[] = ['confirmed', 'reported', 'unconfirmed'];
        const reliabilityGroup = reliabilitySetting.controlEl.createDiv({ cls: 'news-organiser-reliability-options' });

        reliabilityOptions.forEach((option, index) => {
            const optionLabel = reliabilityGroup.createEl('label', { cls: 'news-organiser-reliability-option' });
            const radio = optionLabel.createEl('input', {
                type: 'radio',
                attr: {
                    name: 'news-organiser-source-reliability',
                    value: option,
                },
            }) as HTMLInputElement;

            radio.checked = index === 0;
            radio.addEventListener('change', () => {
                if (radio.checked) {
                    this.reliability = option;
                }
            });

            optionLabel.createSpan({ text: option });
        });

        new Setting(contentEl)
            .addButton((btn) =>
                btn
                    .setButtonText('Add Source')
                    .setCta()
                    .onClick(() => {
                        const sourceLink = this.sourceLink.trim();
                        const sourceDescription = this.sourceDescription.trim();

                        if (!sourceLink && !sourceDescription) {
                            new Notice('Add either a source link or a source description.');
                            return;
                        }

                        this.onSubmit({
                            sourceLink,
                            sourceDescription,
                            reliability: this.reliability,
                        });
                        this.close();
                    })
            )
            .addButton((btn) =>
                btn
                    .setButtonText('Cancel')
                    .onClick(() => {
                        this.close();
                    })
            );
    }

    onClose() {
        this.contentEl.empty();
    }

    private updateLinkSuggestions(value: string) {
        if (!this.linkSuggestionsEl) {
            return;
        }

        const query = this.extractWikilinkQuery(value);
        if (!query || query.length < 3) {
            this.clearAndHideSuggestions();
            return;
        }

        const suggestions = this.findMatchingNotes(query);
        if (suggestions.length === 0) {
            this.clearAndHideSuggestions();
            return;
        }

        this.linkSuggestionsEl.empty();
        suggestions.forEach((file) => {
            const item = this.linkSuggestionsEl!.createDiv({ cls: 'news-organiser-link-suggestion-item' });
            item.createDiv({ cls: 'news-organiser-link-suggestion-title', text: file.basename });
            item.createDiv({ cls: 'news-organiser-link-suggestion-path', text: file.path });
            item.addEventListener('click', () => this.selectSuggestedNote(file));
        });
        this.linkSuggestionsEl.show();
    }

    private extractWikilinkQuery(value: string): string | null {
        const trimmed = value.trim();
        if (!trimmed.startsWith('[[')) {
            return null;
        }

        const inner = trimmed.slice(2).replace(/\]\]$/, '');
        const [target] = inner.split('|');
        return target.trim();
    }

    private findMatchingNotes(query: string): TFile[] {
        const lowerQuery = query.toLowerCase();
        const files = this.app.vault.getMarkdownFiles();

        const prefixMatches: TFile[] = [];
        const containsMatches: TFile[] = [];

        for (const file of files) {
            const basename = file.basename.toLowerCase();
            const pathWithoutExt = file.path.replace(/\.md$/i, '').toLowerCase();

            if (basename.startsWith(lowerQuery) || pathWithoutExt.startsWith(lowerQuery)) {
                prefixMatches.push(file);
            } else if (basename.includes(lowerQuery) || pathWithoutExt.includes(lowerQuery)) {
                containsMatches.push(file);
            }
        }

        const byName = (a: TFile, b: TFile) => a.basename.localeCompare(b.basename);
        prefixMatches.sort(byName);
        containsMatches.sort(byName);

        return [...prefixMatches, ...containsMatches].slice(0, 10);
    }

    private selectSuggestedNote(file: TFile) {
        const wikiLink = `[[${file.basename}]]`;
        this.sourceLink = wikiLink;
        this.sourceDescription = file.basename;
        this.sourceLinkInput?.setValue(wikiLink);
        this.sourceDescriptionInput?.setValue(file.basename);
        this.clearAndHideSuggestions();
    }

    private clearAndHideSuggestions() {
        if (!this.linkSuggestionsEl) {
            return;
        }
        this.linkSuggestionsEl.empty();
        this.linkSuggestionsEl.hide();
    }
}