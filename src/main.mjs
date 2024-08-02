import {getHubspotTicketById, getHubspotEmailsByIds} from "./hs-utils.mjs";
import {categorize, createOrUpdateAnswer} from "./lc-utils.mjs";
import {addItemToDB, initDB, db} from "./memdb.mjs";
import {loadTicketsFromCsv, saveJsonToFile} from "./utils.mjs";

/*
Process a ticket from HubSpot

@param {object} ticket - The ticket object from HubSpot CSV
@return {Promise<void>}
 */
const processTicket = async (ticket) => {

    // Skip tickets without a classification
    if (!ticket['Category']) {
        console.log(`Skipping ticket without category: ${ticket['Ticket ID']} (${ticket['Ticket name']})`);
        return;
    }

    // Skip tickets that are not "General inquiry", "Account Inquiry (CS)", or "Product Issue (Dev)"
    if (!["General inquiry", "Account Inquiry (CS)", "Product Issue (Dev)", ""].includes(ticket['Category'].trim())) {
        console.log(`Skipping ticket that does not match category: ${ticket['Ticket ID']} (${ticket['Ticket name']})`);
        return;
    }

    // Skip tickets that are not in the "Closed" stage
    if (!ticket['Ticket status'].toLowerCase().includes("closed")) {
        console.log(`Skipping ticket that is not closed: ${ticket['Ticket ID']} (${ticket['Ticket name']})`);
        return;
    }

    // Get the ticket from HubSpot
    const hubspotTicket = await getHubspotTicketById(ticket['Ticket ID'], {
        properties: ["subject", "content", "hs_pipeline", "hs_pipeline_stage"],
    });

    // Get the email IDs associated with the ticket
    const emailIds = (((hubspotTicket.associations || {}).emails || {}).results || []).map((email) => email.id);
    if (!emailIds || emailIds.length === 0) {
        console.warn(`No emails found for ticket: ${ticket['Ticket ID']} (${ticket['Ticket name']})`);
        return;
    }

    // Fetch the email objects from HubSpot
    const emails = await getHubspotEmailsByIds(emailIds);

    // Extract the email content
    const emailsContext = emails.map((email) => {
        email.properties.hs_email_text = email.properties.hs_email_text.replace(/\[cid:[a-f0-9-]+\]/g, "");
        const text = [
            "<email>",
            `Date: ${(email.properties.hs_email_received_time || email.properties.hs_email_sent_time || email.properties.hs_timestamp).split("T")[0]}`,
            `Subject: ${email.properties.hs_email_subject}`,
            '',
            `${email.properties.hs_email_text}`,
            "</email>",
        ].join("\n");
        return text;
    }).join("\n");

    // Create the LLM context for the ticket
    const context = [
        `Ticket classification: ${ticket['Category']}`,
        `Ticket title: ${ticket['Ticket name']}`,
        `Ticket emails:\n${emailsContext}`,
    ].join("\n");

    // Create a list of all existing questions in the database
    const questions = [...db.qa_items].map((item) => item.question);

    // Get the best category and question for the ticket
    const {category, question} = await categorize(
        context,
        db.categories,
        questions
    );

    // Check if the category and question are valid
    if (!category || !question) {
        console.warn(`Could not categorize ticket: ${ticket['Ticket ID']} (${ticket['Ticket name']})`);
        return;
    }

    // Find the category in the database
    const categoryItem = db.categories.find((item) => item.toLowerCase() === category.toLowerCase());
    if (!categoryItem) {
        console.warn(`Category "${category}" not found for ticket: ${ticket['Ticket ID']} (${ticket['Ticket name']})`);
        return;
    }

    // Find the question in the database
    const faqItem = [...db.qa_items].find((item) => item.question.toLowerCase() === question.toLowerCase());

    // Create or update answer in the database
    const answer = await createOrUpdateAnswer(context, question, faqItem?.answer);

    // Add or update the question and answer in the database
    addItemToDB(category, question, answer);

    // Save the updated database
    await saveJsonToFile([...db.qa_items]);
};

/*
Main function to process HubSpot tickets from a CSV file

@param {string} csvFilePath - The file path to the CSV file
@return {Promise<void>}
 */
export const main = async (csvFilePath) => {

    // Initialize the database
    await initDB();

    console.log(`Loaded ${db.qa_items.size} items from the database`);

    if (db.qa_items.size === 0) {
        console.warn("The database is empty. Please add items to the database before running the script.");
        return;
    }

    // Load the CSV file
    const tickets = await loadTicketsFromCsv(csvFilePath);


    const totalTickets = tickets.length;
    let processedTickets = 0;


    console.log(`Loaded ${totalTickets} tickets from HubSpot`);

    // Process each ticket
    for (const ticket of tickets) {
        const progress = Math.round((processedTickets / totalTickets) * 100);

        try {
            await processTicket(ticket);
        } catch (error) {
            console.error(`Error processing ticket: ${ticket['Ticket ID']} (${ticket['Ticket name']})`);
            console.error(error);
        }

        console.log(`Processed ${processedTickets} of ${totalTickets} tickets (${progress}%)`);
        processedTickets++;
    }
};
