//Formats property values for Obsidian frontmatter
export class PropertyFormatter {
    //Checks if a string is an Obsidian link
    private isObsidianLink(value: string): boolean {
        return value.startsWith("[[") && value.endsWith("]]");
    }

    //Formats an Event property value as a string for frontmatter
    private formattedLink(value: string): string {
        return `"${value}"`;
    }

    //
    private formattedValue(value: any): string {
        // if (typeof value === 'string') {
        //     return `${value}`;
        // }
        return `${String(value)}`;
    }

    //Returns array formatted for markdown metadata
    private formattedArray(value: any[]): string {
        if(value.length == 0) return "";
        const arrayString: Array<string> = value.map((v: any) => `  - ${v}`);
        return `\n${arrayString.join('\n')}`;
    }

    // Do formatting
    private formatters: Array<(value: any) => string | undefined> = [
        (v) => Array.isArray(v) ? this.formattedArray(v) : undefined,
        (v) => typeof v === 'string' && this.isObsidianLink(v) ? this.formattedLink(v) : undefined,
        (v) => typeof v === 'string' ? this.formattedValue(v) : undefined,
        (v) => this.formattedValue(v) // fallback
    ];

    // Formats a value based on its type
    public formatValue(value: any): string {
        for (const fn of this.formatters) {
            const result = fn(value);
            if (result !== undefined) return result;
        }
        return ""; // if nothing matches
    }
}
