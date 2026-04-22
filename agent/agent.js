/**
 * agent.js - AI Agent logic using OpenAI Function Calling
 */

const express = require('express');
const Groq = require('groq-sdk');
const { SYSTEM_PROMPT } = require('./prompt');
const { addTask, updateTask, deleteTask, listTasks } = require('../tools/todo');
const { saveMemory, getMemory } = require('../memory/memory');

require('dotenv').config();

const router = express.Router();
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// ─── Tool Definitions ────────────────────────────────────────────────────────

const tools = [
  {
    type: "function",
    function: {
      name: "addTask",
      description: "Adds a new task to the todo list",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "The title of the task" }
        },
        required: ["title"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "updateTask",
      description: "Updates an existing task title by ID",
      parameters: {
        type: "object",
        properties: {
          id: { type: "number", description: "The unique ID of the task" },
          newTitle: { type: "string", description: "The new title for the task" }
        },
        required: ["id", "newTitle"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "deleteTask",
      description: "Deletes a task by ID",
      parameters: {
        type: "object",
        properties: {
          id: { type: "number", description: "The unique ID of the task to delete" }
        },
        required: ["id"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "listTasks",
      description: "Lists all current tasks in the todo list",
      parameters: { type: "object", properties: {} }
    }
  },
  {
    type: "function",
    function: {
      name: "saveMemory",
      description: "Saves important personal user information to memory",
      parameters: {
        type: "object",
        properties: {
          text: { type: "string", description: "The information to remember" }
        },
        required: ["text"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "getMemory",
      description: "Retrieves all stored personal user information from memory",
      parameters: { type: "object", properties: {} }
    }
  }
];

// ─── Agent Logic ─────────────────────────────────────────────────────────────

async function callAgent(userInput) {
  try {
    let messages = [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userInput }
    ];

    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile", 
      messages: messages,
      tools: tools,
      tool_choice: "auto",
    });

    const responseMessage = response.choices[0].message;

    // Handle tool calls
    if (responseMessage.tool_calls) {
      messages.push(responseMessage);

      for (const toolCall of responseMessage.tool_calls) {
        const functionName = toolCall.function.name;
        const functionArgs = JSON.parse(toolCall.function.arguments);
        let functionResult;

        console.log(`[Agent] Calling tool: ${functionName}`, functionArgs);

        switch (functionName) {
          case 'addTask':
            functionResult = addTask(functionArgs.title);
            break;
          case 'updateTask':
            functionResult = updateTask(functionArgs.id, functionArgs.newTitle);
            break;
          case 'deleteTask':
            functionResult = deleteTask(functionArgs.id);
            break;
          case 'listTasks':
            functionResult = listTasks();
            break;
          case 'saveMemory':
            functionResult = saveMemory(functionArgs.text);
            break;
          case 'getMemory':
            functionResult = getMemory();
            break;
        }

        messages.push({
          tool_call_id: toolCall.id,
          role: "tool",
          name: functionName,
          content: JSON.stringify(functionResult),
        });
      }

      // Get final response from AI after tool results
      const finalResponse = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: messages,
      });

      return finalResponse.choices[0].message.content;
    }

    return responseMessage.content;
  } catch (error) {
    console.error('[Agent Error]', error);
    return "I'm sorry, I encountered an error while processing your request.";
  }
}

// ─── Route ───────────────────────────────────────────────────────────────────

router.post('/', async (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: 'text is required' });

  const response = await callAgent(text);
  res.json({ response });
});

module.exports = router;
