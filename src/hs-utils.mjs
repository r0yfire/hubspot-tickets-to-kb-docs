import {Client} from "@hubspot/api-client";

const getHubspotClient = async () => {
    return new Client({accessToken: process.env.HUBSPOT_API_KEY});
};

/*
Get a list of tickets from HubSpot

@param {string} [ticketId] - The ticket ID to get
 */
export const getHubspotTicketById = async (ticketId) => {
    const client = await getHubspotClient();
    const ticket = await client.crm.objects.basicApi.getById(
        'tickets',
        ticketId,
        undefined,
        undefined,
        ['email', 'contact', 'company'],
    );
    return ticket;
};

/*
Get a list of emails by their IDs

@param {string[]} emailIds - The list of email IDs
@return {Promise<object[]>} - The list of emails object from HubSpot
 */
export const getHubspotEmailsByIds = async (emailIds) => {
    if (!emailIds || emailIds.length === 0) {
        return [];
    }

    // Initialize the HubSpot client
    const client = await getHubspotClient();

    // Get the emails
    const emailProps = [
        'hs_email_subject', 'hs_email_body', 'hs_internal_email_notes',
        'hs_email_outcome', 'hs_attachment_ids', 'hs_meeting_body',
        'hs_timestamp', 'hs_email_sent_time', 'hs_email_received_time',
        'hs_email_status', "hs_email_text", "hs_email_direction"
    ];
    const emails = await client.crm.objects.batchApi.read('emails', {
        inputs: emailIds.map((id) => ({id})),
        properties: emailProps,
    });

    return emails.results ?? [];
};
