/**
 * agent.js - AI Agent logic using Groq tool calling
 */

const express = require('express');
const Groq = require('groq-sdk');
const { SYSTEM_PROMPT } = require('./prompt');
const { addTask, updateTask, deleteTask, listTasks } = require('../tools/todo');
const { saveMemory, getMemory } = require('../memory/memory');

require('dotenv').config();

const router = express.Router();
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

function parseToolArguments(rawArguments) {
  try {
    return rawArguments ? JSON.parse(rawArguments) : {};
  } catch (error) {
    throw new Error(`Invalid tool arguments: ${error.message}`);
  }
}

const tools = [
  {
    type: 'function',
    function: {
      name: 'addTask',
      description: 'Adds a new task to the todo list',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'The title of the task' },
        },
        required: ['title'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'updateTask',
      description: 'Updates an existing task title by ID',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'number', description: 'The unique ID of the task' },
          newTitle: { type: 'string', description: 'The new title for the task' },
        },
        required: ['id', 'newTitle'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'deleteTask',
      description: 'Deletes a task by ID',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'number', description: 'The unique ID of the task to delete' },
        },
        required: ['id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'listTasks',
      description: 'Lists all current tasks in the todo list',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'saveMemory',
      description: 'Saves important personal user information to memory',
      parameters: {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'The information to remember' },
        },
        required: ['text'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'getMemory',
      description: 'Retrieves all stored personal user information from memory',
      parameters: { type: 'object', properties: {} },
    },
  },
];

async function callAgent(userInput) {
  try {
    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userInput },
    ];

    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages,
      tools,
      tool_choice: 'auto',
    });

    const responseMessage = response.choices[0].message;

    if (responseMessage.tool_calls) {
      messages.push(responseMessage);

      for (const toolCall of responseMessage.tool_calls) {
        const functionName = toolCall.function.name;
        const functionArgs = parseToolArguments(toolCall.function.arguments);
        let functionResult;

        console.log(`[Agent] Calling tool: ${functionName}`, functionArgs);

        switch (functionName) {
          case 'addTask':
            functionResult = await addTask(functionArgs.title);
            break;
          case 'updateTask':
            functionResult = await updateTask(functionArgs.id, functionArgs.newTitle);
            break;
          case 'deleteTask':
            functionResult = await deleteTask(functionArgs.id);
            break;
          case 'listTasks':
            functionResult = await listTasks();
            break;
          case 'saveMemory':
            functionResult = await saveMemory(functionArgs.text);
            break;
          case 'getMemory':
            functionResult = await getMemory();
            break;
          default:
            throw new Error(`Unsupported tool call: ${functionName}`);
        }

        messages.push({
          tool_call_id: toolCall.id,
          role: 'tool',
          name: functionName,
          content: JSON.stringify(functionResult),
        });
      }

      const finalResponse = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages,
      });

      return finalResponse.choices[0].message.content;
    }

    return responseMessage.content;
  } catch (error) {
    console.error('[Agent Error]', error);
    return "I'm sorry, I encountered an error while processing your request.";
  }
}

router.post('/', async (req, res) => {
  const { text } = req.body;
  if (typeof text !== 'string' || !text.trim()) {
    return res.status(400).json({ error: 'text is required' });
  }

  const response = await callAgent(text.trim());
  return res.json({ response });
});

module.exports = router;
