import { OpenRouter } from "@openrouter/sdk";
import { corruptJSONFix, generateQuestionsInstruction } from "../prompts/questions.prompt.js";
import fs from "node:fs/promises"
import { response } from "express";
import { questionSystemPrompt1, questionUserPrompt1 } from "../prompts/prompt.js";

const openrouter = new OpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});


export const generateQuestions = async (aboutQuestions) => {
  let instructions = questionUserPrompt1
    .replace("{BOARD}", "WBCHSE")
    .replace("{CLASS}", "11")
    .replace("{SUBJECT}", aboutQuestions.subject)
    .replace("{TOPIC}", aboutQuestions.topic)
    .replaceAll("{QUESTION_COUNT}", aboutQuestions.totalQuestions);

  let rawCorruptedJSONData

  try {
    const response = await openrouter.chat.send({
      chatRequest: {
        model: "nvidia/nemotron-3-ultra-550b-a55b:free", 
        temperature: 1, 
        messages: [
          {
            role: "system",
            content: questionSystemPrompt1,
          },
          {
            role: "user",
            content: questionUserPrompt1,
          },
        ],
      },
    });

    rawCorruptedJSONData = response.choices[0].message.content.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "");

    const file = await fs.writeFile(`data/questions/${Date.now()}.json`, response.choices[0].message.content.trim(), "utf-8")

    const cleanedUpResponse = response.choices[0].message.content
      .replace("```json", "")
      .replace("```", "")
      .trim();

    return JSON.parse(cleanedUpResponse);
  } catch (error) {
    console.log("Error...")
    console.log(error)
  }
};