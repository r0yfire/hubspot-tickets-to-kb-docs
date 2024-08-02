import {z} from 'zod';
import {ChatAnthropic} from '@langchain/anthropic';
import {PromptTemplate} from '@langchain/core/prompts';


/*
Use LLM to pick the best category for a ticket

@param {string} ticketContextStr - The context of the ticket
@param {string[]} categoriesList - A list of categories to choose from
@param {string[]} questionsList - A list of questions to choose from
@return {Promise<{category: string, question: string}>} - The best category and question for the ticket
 */
export const categorize = async (ticketContextStr, categoriesList, questionsList) => {
    const prompt = PromptTemplate.fromTemplate([
        "You are a technical writer working at Autohost, a KYC and fraud detection company serving the short-term rental industry.",
        "Consider the following support ticket context:",
        "<ticket>",
        "{ticket}",
        "</ticket>",
        "Also consider the following list of existing frequently asked questions (FAQ):",
        "<questions>",
        "{questions}",
        "</questions>",
        "Based on the context, select the best matching FAQ question or generate a new one.",
        "Then, assign the ticket to one of the following categories:",
        "{categories}",
    ].join("\n"));
    const model = new ChatAnthropic({
        modelName: 'claude-3-5-sonnet-20240620',
        maxTokens: 4000,
    });
    const functionCallingModel = model.withStructuredOutput(z.object({
        category: z.string({description: "The category assigned to the ticket"}),
        question: z.string({description: "The question assigned to the ticket"}),
    }));
    const chain = prompt.pipe(functionCallingModel);
    const response = await chain.invoke({
        ticket: ticketContextStr,
        questions: questionsList.map((question) => `- ${question}`).join("\n"),
        categories: categoriesList.map((category) => `- ${category}`).join("\n"),
    });
    return response;
};

/*
Create or update an answer for a ticket question

@param {string} ticketContextStr - The context of the ticket
@param {string} question - The question to answer
@param {string} existingAnswerOrNull - The existing answer, if any
@return {Promise<string>} - The generated answer for the question
 */
export const createOrUpdateAnswer = async (ticketContextStr, question, existingAnswerOrNull) => {
    const prompt = PromptTemplate.fromTemplate([
        "You are a technical writer working at Autohost, a KYC and fraud detection company serving the short-term rental industry.",
        "Consider the following ticket context:",
        "<ticket>",
        "{ticket}",
        "</ticket>",
        "Consider the following question:",
        "<question>",
        "{question}",
        "</question>",
        "Consider the existing answer (if any) when generating the new answer:",
        "<answer>",
        "{answer}",
        "</answer>",
        "",
        "Please write an FAQ article to the question based on the context.",
        "",
        "Rules you must follow:",
        "- If an answer already exists, update the existing answer with the new information.",
        "- The answer should be clear, concise, and relevant to the context.",
        "- The answer should be formatted as an FAQ article for product documentation.",
        "- When you do not have enough information to answer the question, return \"Not enough information to answer the question.\" - THIS IS IMPORTANT!",
        "",
        "I will give you a $200 bonus if you can provide a high-quality answer.",
    ].join("\n"));
    const model = new ChatAnthropic({
        modelName: 'claude-3-5-sonnet-20240620',
        maxTokens: 4000,
    });
    const functionCallingModel = model.withStructuredOutput(z.object({
        answer: z.string({description: "The FAQ article that answers the question"}),
    }));
    const chain = prompt.pipe(functionCallingModel);
    const response = await chain.invoke({
        ticket: ticketContextStr,
        question: question,
        answer: existingAnswerOrNull ?? "",
    });
    const isNotEnoughInformation = response.answer.toLowerCase().includes("not enough information to answer the question");
    if (isNotEnoughInformation && existingAnswerOrNull) {
        response.answer = existingAnswerOrNull;
    }
    return response.answer;
};