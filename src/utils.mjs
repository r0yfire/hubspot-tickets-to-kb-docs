import fs from "fs";
import {parseString} from "@fast-csv/parse";

/*
Load HubSpot tickets from a CSV file

@param {string} [filePath] - The file path to the CSV file
@return {Promise<object[]>} - The list of tickets from the CSV file
 */
export const loadTicketsFromCsv = (filePath) => new Promise((resolve, reject) => {
    if (!filePath) {
        filePath = "tickets.csv";
    }

    const csvString = fs.readFileSync(filePath, "utf8");
    const tickets = [];
    parseString(csvString, {
        headers: (headers) => {
            headers.map((header, index, arr) => {
                if (arr.indexOf(header) !== index) {
                    arr[index] = `${header}_${arr.filter((h) => h === header).length}`;
                }
            });
            return headers;
        }
    })
        .on("data", (data) => tickets.push(data))
        .on("error", (error) => reject(error))
        .on("end", () => resolve(tickets));
});

/*
Save data to a JSON file

@param {object} data - The data to save
@param {string} [filePath] - The file path to save the data
@return {Promise<string>} - The file path where the data was saved
 */
export const saveJsonToFile = async (data, filePath) => {
    if (!filePath) {
        filePath = "output.json";
    }
    if (!data) {
        throw new Error("No data provided to saveJsonToFile");
    }
    await fs.promises.writeFile(filePath, JSON.stringify(data, null, 2));
    console.log(`Data saved to ${filePath}`);
    return filePath;
};
