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
  if (!rawArguments) return {};
  if (typeof rawArguments === 'object') return rawArguments;
  try {
    return JSON.parse(rawArguments);
  } catch (error) {
    console.warn('[Agent] Could not parse tool arguments:', rawArguments);
    return {};
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
          title: { type: 'string', description: 'The title or description of the task to add' },
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

const PRIMARY_MODEL = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';
const FALLBACK_MODEL = 'openai/gpt-oss-20b';

async function callGroqWithFallback(params) {
  try {
    return await groq.chat.completions.create(params);
  } catch (primaryError) {
    console.warn(`[Groq Primary Error on ${params.model}]:`, primaryError.message);
    if (params.model !== FALLBACK_MODEL) {
      console.log(`[Groq] Retrying request with fallback model: ${FALLBACK_MODEL}`);
      return await groq.chat.completions.create({
        ...params,
        model: FALLBACK_MODEL,
      });
    }
    throw primaryError;
  }
}

async function callAgent(email, userInput) {
  try {
    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userInput },
    ];

    const response = await callGroqWithFallback({
      model: PRIMARY_MODEL,
      messages,
      tools,
      tool_choice: 'auto',
      temperature: 0.1,
    });

    const responseMessage = response.choices[0]?.message;
    if (!responseMessage) {
      return "I'm sorry, I couldn't generate a response. Please try again.";
    }

    if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
      messages.push({
        role: 'assistant',
        content: responseMessage.content || '',
        tool_calls: responseMessage.tool_calls,
      });

      let lastAction = null;
      let lastActionResult = null;

      for (const toolCall of responseMessage.tool_calls) {
        const functionName = toolCall.function.name;
        const functionArgs = parseToolArguments(toolCall.function.arguments);
        let functionResult;

        console.log(`[Agent] Calling tool: ${functionName}`, functionArgs);
        lastAction = functionName;

        switch (functionName) {
          case 'addTask': {
            const rawTitle =
              functionArgs.title ||
              functionArgs.task ||
              functionArgs.todo ||
              functionArgs.text ||
              functionArgs.content ||
              functionArgs.name ||
              (userInput && userInput.trim());
            functionResult = await addTask(email, rawTitle || 'New task');
            lastActionResult = functionResult;
            break;
          }
          case 'updateTask': {
            const id = functionArgs.id ?? functionArgs.taskId;
            const newTitle =
              functionArgs.newTitle ||
              functionArgs.title ||
              functionArgs.task ||
              functionArgs.text;
            functionResult = await updateTask(email, id, newTitle || 'Updated task');
            lastActionResult = functionResult;
            break;
          }
          case 'deleteTask': {
            const id = functionArgs.id ?? functionArgs.taskId;
            functionResult = await deleteTask(email, id);
            lastActionResult = functionResult;
            break;
          }
          case 'listTasks': {
            functionResult = await listTasks(email);
            lastActionResult = functionResult;
            break;
          }
          case 'saveMemory': {
            const text =
              functionArgs.text ||
              functionArgs.memory ||
              functionArgs.info ||
              functionArgs.content ||
              userInput;
            functionResult = await saveMemory(email, text || '');
            lastActionResult = functionResult;
            break;
          }
          case 'getMemory': {
            functionResult = await getMemory(email);
            lastActionResult = functionResult;
            break;
          }
          default:
            console.warn(`[Agent] Unsupported tool call: ${functionName}`);
            functionResult = { error: `Unsupported tool call: ${functionName}` };
        }

        messages.push({
          tool_call_id: toolCall.id,
          role: 'tool',
          name: functionName,
          content: JSON.stringify(functionResult ?? { success: true }),
        });
      }

      let finalContent = null;
      try {
        const finalResponse = await callGroqWithFallback({
          model: PRIMARY_MODEL,
          messages,
          tools,
          tool_choice: 'none',
          temperature: 0.1,
        });
        finalContent = finalResponse.choices[0]?.message?.content;
      } catch (followupError) {
        console.warn('[Agent Followup Warning]', followupError.message);
      }

      if (finalContent && finalContent.trim()) {
        return finalContent.trim();
      }

      // Safe fallback responses if LLM returns null content after tool execution
      if (lastAction === 'addTask') {
        const title = lastActionResult && lastActionResult.title ? lastActionResult.title : 'that task';
        return `Done! I've added "${title}" to your todo list.`;
      }
      if (lastAction === 'deleteTask') {
        return lastActionResult
          ? `Done! I've deleted task #${lastActionResult.id} ("${lastActionResult.title}") from your list.`
          : "Done! I've removed that task from your list.";
      }
      if (lastAction === 'updateTask') {
        return lastActionResult
          ? `Done! Task #${lastActionResult.id} has been updated to "${lastActionResult.title}".`
          : "Done! I've updated that task.";
      }
      if (lastAction === 'listTasks') {
        if (!Array.isArray(lastActionResult) || lastActionResult.length === 0) {
          return "You don't have any tasks on your list right now.";
        }
        return `Here are your current tasks:\n${lastActionResult.map((t) => `• #${t.id}: ${t.title}`).join('\n')}`;
      }
      if (lastAction === 'saveMemory') {
        return "I've saved that information to memory.";
      }
      if (lastAction === 'getMemory') {
        return String(lastActionResult || 'No memories recorded yet.');
      }

      return "Done! I've processed your request.";
    }

    return responseMessage.content || "I'm here to help. What would you like to do?";
  } catch (error) {
    console.error('[Agent Error]', error);
    try {
      const fs = require('fs');
      const path = require('path');
      const errPayload = {
        timestamp: new Date().toISOString(),
        message: error.message,
        status: error.status,
        code: error.code,
        error: error.error,
        failed_generation: error.failed_generation,
        stack: error.stack,
      };
      fs.writeFileSync(path.join(__dirname, '../data/last_error.log'), JSON.stringify(errPayload, null, 2));
    } catch (logErr) {
      console.error('[Log Error]', logErr.message);
    }

    if (process.env.NODE_ENV !== 'production') {
      return `Error: ${error.message}`;
    }
    return "I've encountered an issue processing that. Please try again or type your request below.";
  }
}

router.post('/', async (req, res) => {
  try {
    const { text } = req.body;
    if (typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ error: 'text is required' });
    }

    const response = await callAgent(req.user.email, text.trim());
    return res.json({ response });
  } catch (error) {
    console.error('[Agent Route Error]', error);
    return res.json({ response: "I encountered an error while processing your request." });
  }
});

module.exports = router;
