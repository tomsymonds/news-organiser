import {
	App,
	FuzzySuggestModal,
	TFile,
	Setting,
	TextComponent,
} from "obsidian";


/**
 * Fuzzy modal to select a Story note 
 */
export default class PersonSelector extends FuzzySuggestModal<TFile> {
    private people: TFile[];
    private onSelect: any;
    private personTextComponent: TextComponent | null = null;
    private suggestionsContainer: HTMLElement | null = null;
    private defaultText: string

    constructor(app: App, defaultText: string, onSelect: (file: TFile) => void) {
        super(app);
        this.onSelect = onSelect;
        this.setPlaceholder("Select a person");
        this.defaultText = defaultText
        this.people = this.getPeople()
    }

	private getPeople(): TFile[] {
		const files = this.app.vault.getMarkdownFiles();
		const people: TFile[] = [];
		for (const file of files) {
			const cache = this.app.metadataCache.getFileCache(file);
			if (cache?.frontmatter?.type?.toLowerCase() === "person") {
				people.push(file);
			}
		}
		return people
    }

    onInputUpdate(text: string) {
        this.showSuggestions(text, this.suggestionsContainer!, this.onSelect);
    } 

    getItems(): TFile[] {
        return this.getPeople();
    }

    getItemText(item: TFile): string {
        return item.basename;
    }

    onChooseItem(item: TFile): void {
        this.onSelect(item);
    }

    //Render the story suggestions and recent stories UI
    render(container: HTMLElement): void {
        const people = this.getPeople();
        this.renderPersonTextBox(container, people);
    }

    /**
     * Renders a text box with auto-complete suggestions for story titles
     */
    renderPersonTextBox(container: HTMLElement, stories: TFile[]): TextComponent {
        const onPersonSelect = this.onSelect;
        let selectedPerson: TFile | null = null;

        const setting = new Setting(container)
            // .setName("Person")
            .setDesc("Existing people")
            // .addText((text: TextComponent) => {
            //     // Store reference to text component
            //     this.personTextComponent = text;
                
                // Create suggestions container
                this.suggestionsContainer = container.createEl("div", {
                    cls: "person-suggestions",
                    attr: { style: "display: none; border: 1px solid var(--background-modifier-border); max-height: 200px; overflow-y: auto; z-index: 1000; background: var(--background-primary);" }
                });

                // text.onChange((value: string) => {
                //     selectedPerson = null;
                //     this.showSuggestions(value, this.suggestionsContainer!, this.onSelect);
                // });

                // // Show recent stories when text box is focused (by default)
                // text.inputEl.addEventListener('focus', () => {
                //     if (!text.getValue().trim()) {
                //         this.showSuggestions('', this.suggestionsContainer!, this.onSelect);
                //     }
                // });

                // // Hide suggestions when clicking outside
                // text.inputEl.addEventListener('blur', () => {
                //     setTimeout(() => {
                //         if (this.suggestionsContainer) {
                //             this.suggestionsContainer.style.display = 'none';
                //         }
                //     }, 150);
                // });

                // return text;
            //});
        
        return setting.components[0] as TextComponent;
    }

    private showSuggestions(
        query: string, //The current input query
        container: HTMLElement, 
        textComponent: TextComponent
    ): void {
        container.empty();
        container.style.display = 'block';
        
        // If no query, show recent stories by default
        if (!query.trim()) return;

        // Filter stories based on query
        const filteredPeople = this.people.filter(person => 
            person.basename.toLowerCase().includes(query.toLowerCase())
        ).slice(0, 10); // Limit to 10 suggestions

        //If no matches found, show recent people instead
        if (filteredPeople.length === 0) return

        // Render the filtered story suggestions
        this.renderPersonItems(filteredPeople, container, textComponent);
    }

    private renderPersonItems(
        people: TFile[], 
        container: HTMLElement, 
        textComponent: TextComponent, 
    ): void {
        people.forEach(person => {
            const suggestionEl = container.createEl("div", {
                text: person.basename,
                cls: "person-suggestion-item",
                attr: { 
                    style: "padding: 8px; cursor: pointer; border-bottom: 1px solid var(--background-modifier-border);" 
                }
            });

            suggestionEl.addEventListener('hover', () => {
                suggestionEl.style.backgroundColor = 'var(--background-modifier-hover)';
            });

            suggestionEl.addEventListener('mouseleave', () => {
                suggestionEl.style.backgroundColor = '';
            });

            suggestionEl.addEventListener('click', () => {
                //textComponent.setValue(person.basename);
                console.log("Person clicked:", person.basename);
                container.style.display = 'none';
                this.onSelect(person);
            });
        });
    }

    private renderRecentPeopleInline(
        container: HTMLElement, 
        textComponent: TextComponent, 
        onPersonSelect?: (file: TFile | null) => string
    ): void {
        const recentPeople = this.getRecentPeople();
        
        if (recentPeople.length === 0) {
            container.createEl("div", {
                text: "No people found",
                attr: { style: "padding: 8px; color: var(--text-muted);" }
            });
            return;
        }

        // Add header
        container.createEl("div", {
            text: "Recent People",
            attr: { 
                style: "padding: 8px 12px; font-weight: 600; border-bottom: 1px solid var(--background-modifier-border); background: var(--background-modifier-form-field);" 
            }
        });

        // Render recent stories using the same format as suggestions
        this.renderPersonItems(recentPeople, container, textComponent);
    }

    getRecentPeople(){
        const people = this.getPeople();
        
        // Sort by modification time (newest first) and take top 3
        return people
            .sort((a, b) => b.stat.mtime - a.stat.mtime)
            .slice(0, 5);
    }

    /**
     * Creates a selectable list of the 5 most recently modified people notes
     */
    renderRecentPeople(container: HTMLElement): void {
        const people = this.getPeople();
        
        // Sort by modification time (newest first) and take top 3
        const recentPeople = people
            .sort((a, b) => b.stat.mtime - a.stat.mtime)
            .slice(0, 5);

        if (recentPeople.length === 0) {
            container.createEl("div", {
                text: "No recent people found",
                attr: { style: "padding: 8px; color: var(--text-muted);" }
            });
            return;
        }

        const listContainer = container.createEl("div", {
            cls: "recent-people-list",
            attr: { style: "border: 1px solid var(--background-modifier-border); border-radius: 6px;" }
        });

        const headerEl = listContainer.createEl("div", {
            text: "Recent People",
            attr: { 
                style: "padding: 8px 12px; border-bottom: 1px solid var(--background-modifier-border));" 
            }
        });

        recentPeople.forEach((person, index) => {
            const lastModified = new Date(person.stat.mtime);
            const timeAgo = this.getTimeAgo(lastModified);
            
            const storyEl = listContainer.createEl("div", {
                cls: "recent-people-item",
                attr: { 
                    style: "padding: 12px; cursor: pointer; display: flex; justify-content: space-between; align-items: center;" + 
                           (index < recentPeople.length - 1 ? " border-bottom: 1px solid var(--background-modifier-border);" : "")
                }
            });

            const titleEl = storyEl.createEl("span", {
                text: person.basename,
                // attr: { style: "font-weight: 500;" }
            });

            const timeEl = storyEl.createEl("span", {
                text: timeAgo,
                attr: { style: "color: var(--text-muted); font-size: 0.9em;" }
            });

            storyEl.addEventListener('hover', () => {
                storyEl.style.backgroundColor = 'var(--background-modifier-hover)';
            });

            storyEl.addEventListener('mouseleave', () => {
                storyEl.style.backgroundColor = '';
            });

            storyEl.addEventListener('click', () => {
                // Clear suggestions and populate text box
                console.log("Person clicked:", person.basename);
                if (this.suggestionsContainer) {
                    this.suggestionsContainer.style.display = 'none';
                }
                if (this.personTextComponent) {
                    this.personTextComponent.setValue(person.basename);
                }
                this.onSelect(person);
            });
        });
    }

    private getTimeAgo(date: Date): string {
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString();
    }
}