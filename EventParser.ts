import * as chrono from 'chrono-node';

//Custom function to find years with context words
function findYearsWithContext(text: string) {
  // Regex: optional preceding words (by|in|before|after) + space + year
  const regex = /\b(?:by|in|before|after)?\s*(1[0-9]{3}|2[0-9]{3})\b/gi;

  const matches = [];
  let match;

  while ((match = regex.exec(text)) !== null) {
    // Capture the full match and the year
    matches.push({
      text: match[0].trim(), // includes the word if present
      year: parseInt(match[1], 10)
    });
  }

  return matches;
}
//Parses text to extract event information
export default class EventParser {

    results: any  

    constructor(text:string){
        const basicResults = chrono.parse(text);
        let current_year = new Date().getFullYear()

        if (basicResults.length > 0){
            const date = basicResults[0].start as any
            this.results =  {
                day: date.knownValues.day || null,
                month: date.knownValues.month || null,
                year: date.knownValues.year || current_year,
                hour: date.knownValues.hour || null,
                minute: date.knownValues.minute || null,
                second: date.knownValues.second || null,
                dateText: basicResults[0].text || "",
            }
        } else {    
          const yearResults = findYearsWithContext(text);
          if (yearResults.length > 0){
              this.results = {
                  day: null,
                  month: null,    
                  hour: null,
                  minute: null,
                  second: null,
                  year: yearResults[0].year,
                  dateText: yearResults[0].text || ""
              }
          }
        }

      if(this.results) this.results.description = this.removeDateWords(text, this.results.dateText); 
    }
    //Clears words like "in", "on", "after" that may precede date text
    private removeDateWords(text: string, dateText: string){
      if (!dateText || dateText === "") return text
        const regex = new RegExp("(?:\\b(?:in|on|after|during|in early|in late|in mid)\\s+)?" + dateText + "[^\\w]*", "gi");
        const cleanedText: string = text.replace(regex, "");
        const capitalizedText = cleanedText.charAt(0).toUpperCase() + cleanedText.slice(1);
        return capitalizedText.trim();
    }
}