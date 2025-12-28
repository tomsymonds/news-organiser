import { get } from "http";
import { DropdownComponent, Setting, App, TFile, Modal, TextComponent } from "obsidian";

export default class CategorySelector {
    private type: string;
    //Callback function when a category is selected
    onSelect: any = null;
    private app: App;
    private categories: string[];
    private categoryDropdown: DropdownComponent | null = null;


    constructor(app: App, type: string, onSelect: any = null) {
        this.type = type;
        this.onSelect = onSelect; 
        this.app = app;
        this.categories = this.getUniqueCategories()
    }
    //Get a list of unique categories from notes of the specified type
	private getUniqueCategories(): string[] {
		const files = this.app.vault.getMarkdownFiles();
		const categories = new Set<string>();
		
		for (const file of files) {
			const cache = this.app.metadataCache.getFileCache(file);
			if (cache?.frontmatter?.type?.toLowerCase() === this.type.toLowerCase()) {
				const category = cache.frontmatter.Category || cache.frontmatter.category;
				if (category && typeof category === 'string') {
					categories.add(category);
				} else if (Array.isArray(category)) {
					// Handle case where category is an array
					category.forEach(cat => {
						if (typeof cat === 'string') {
							categories.add(cat);
						}
					});
				}
			}
		}
		return Array.from(categories).sort();
	}

    //Render the category selector dropdown
    renderCategorySelector(container: HTMLElement) {
        new Setting(container)
            .setName("Category")
            .addDropdown((dropdown: DropdownComponent) => {
                this.categoryDropdown = dropdown;
                const options = this.categories || []; 
                options.forEach((opt) => dropdown.addOption(opt, opt));
                dropdown.setValue(options[0] || "");
                dropdown.onChange(this.onSelect);
                this.onSelect(options[0])
            })
            .settingEl.style.borderBottom = 'none';
    }

    //Set the category dropdown to a specific value
    setCategoryValue(value: string) {
        if (this.categoryDropdown) {
            this.categoryDropdown.setValue(value);
        }
    }

    //Render input to add a new category
    renderNewCategoryInput(container: HTMLElement) {
        const categories = this.getUniqueCategories();
        new Setting(container)
            .setName("Add Category")
            .addText((text: TextComponent) => {
                text.setPlaceholder("Name");
                text.onChange(this.onSelect);
            })
            .settingEl.style.borderTop = 'none';
    }
}