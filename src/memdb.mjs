import fs from "fs";

export const db = {
    qa_items: new Set(),
    categories: [
        "Reservation",
        "Listings",
        "Buildings",
        "Activity Log",
        "Analytics",
        "Screening Assistant",
        "Guest Portal",
        "Settings",
        "Accounts",
        "Billing"
    ]
};

/*
Initialize the database from a JSON file

@return {Promise<void>}
 */
export const initDB = async () => {
    try {
        const data = JSON.parse(fs.readFileSync("output.json", "utf8"));
        db.qa_items = new Set(data);
    } catch (error) {
        console.error("Error initializing database:", error.message);
    }
};

/*
Add an item to the Set of items in the database
The counter is optional and defaults to 1

@param {string} category - The category of the item
@param {string} question - The question of the item
@param {string} answer - The answer of the item
@param {number} [counter=1] - The counter of the item
@return {void}
 */
export const addItemToDB = (category, question, answer, counter) => {
    if (!category || !question || !answer) {
        throw new Error("Invalid item");
    }

    // Find existing item
    const existingItem = [...db.qa_items].find((item) => item.question.toLowerCase() === question.toLowerCase());

    // Create an updated item
    const newItem = {
        category: category,
        question: question,
        answer: answer,
        counter: counter ?? (existingItem ? existingItem.counter + 1 : 1),
    };

    // Remove the existing item
    if (existingItem) {
        db.qa_items.delete(existingItem);
    }

    // Add the new item
    db.qa_items.add(newItem);
};