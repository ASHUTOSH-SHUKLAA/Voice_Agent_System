/**
 * todo.js - Todo CRUD operations + Express routes
 * Stores tasks in Redis as JSON under a per-user key
 */

const express = require('express');
const { getRedisClient } = require('../lib/redis');

const router = express.Router();
const TODO_KEY_PREFIX = `${process.env.REDIS_KEY_PREFIX || 'voice-agent'}:todos`;

function todoKey(email) {
  return `${TODO_KEY_PREFIX}:${String(email || 'default').toLowerCase()}`;
}

function sanitizeTitle(rawTitle) {
  if (typeof rawTitle === 'string') {
    return rawTitle.trim();
  }
  if (rawTitle && typeof rawTitle === 'object') {
    const val = rawTitle.title || rawTitle.task || rawTitle.todo || rawTitle.text || rawTitle.content || rawTitle.name;
    return typeof val === 'string' ? val.trim() : String(val || '').trim();
  }
  return String(rawTitle || '').trim();
}

async function readTodos(email) {
  try {
    const raw = await getRedisClient().get(todoKey(email));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error('[Todo Error] readTodos failed:', error.message);
    return [];
  }
}

async function writeTodos(email, todos) {
  try {
    const safeTodos = Array.isArray(todos) ? todos : [];
    await getRedisClient().set(todoKey(email), JSON.stringify(safeTodos));
  } catch (error) {
    console.error('[Todo Error] writeTodos failed:', error.message);
  }
}

function nextId(todos) {
  if (!Array.isArray(todos) || todos.length === 0) return 1;
  const validIds = todos
    .map((task) => Number(task && task.id))
    .filter((id) => Number.isFinite(id) && id > 0);
  return validIds.length === 0 ? 1 : Math.max(...validIds) + 1;
}

async function addTask(email, rawTitle) {
  const todos = await readTodos(email);
  const cleanTitle = sanitizeTitle(rawTitle) || 'New task';
  const newTask = { id: nextId(todos), title: cleanTitle };
  todos.push(newTask);
  await writeTodos(email, todos);
  return newTask;
}

async function updateTask(email, id, rawNewTitle) {
  const todos = await readTodos(email);
  const numericId = Number(id);
  const task = todos.find((todo) => Number(todo && todo.id) === numericId);

  if (!task) return null;

  const cleanTitle = sanitizeTitle(rawNewTitle);
  if (cleanTitle) {
    task.title = cleanTitle;
  }
  await writeTodos(email, todos);
  return task;
}

async function deleteTask(email, id) {
  const todos = await readTodos(email);
  const numericId = Number(id);
  const index = todos.findIndex((todo) => Number(todo && todo.id) === numericId);

  if (index === -1) return null;

  const [removed] = todos.splice(index, 1);
  await writeTodos(email, todos);
  return removed;
}

async function listTasks(email) {
  return readTodos(email);
}

router.post('/add', async (req, res, next) => {
  try {
    const { title } = req.body;
    if (typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ error: 'title is required' });
    }

    const task = await addTask(req.user.email, title);
    return res.json({ success: true, task });
  } catch (error) {
    return next(error);
  }
});

router.post('/update', async (req, res, next) => {
  try {
    const { id, newTitle } = req.body;
    if (!id || typeof newTitle !== 'string' || !newTitle.trim()) {
      return res.status(400).json({ error: 'id and newTitle are required' });
    }

    const task = await updateTask(req.user.email, id, newTitle);
    if (!task) {
      return res.status(404).json({ error: `Task with id ${id} not found` });
    }

    return res.json({ success: true, task });
  } catch (error) {
    return next(error);
  }
});

router.post('/delete', async (req, res, next) => {
  try {
    const { id } = req.body;
    if (!id) {
      return res.status(400).json({ error: 'id is required' });
    }

    const task = await deleteTask(req.user.email, id);
    if (!task) {
      return res.status(404).json({ error: `Task with id ${id} not found` });
    }

    return res.json({ success: true, removed: task });
  } catch (error) {
    return next(error);
  }
});

router.get('/list', async (req, res, next) => {
  try {
    const tasks = await listTasks(req.user.email);
    return res.json({ success: true, tasks });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
module.exports.addTask = addTask;
module.exports.updateTask = updateTask;
module.exports.deleteTask = deleteTask;
module.exports.listTasks = listTasks;
