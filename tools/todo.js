/**
 * todo.js - Todo CRUD operations + Express routes
 * Stores tasks in Redis as JSON under a per-user key
 */

const express = require('express');
const { getRedisClient } = require('../lib/redis');

const router = express.Router();
const TODO_KEY_PREFIX = `${process.env.REDIS_KEY_PREFIX || 'voice-agent'}:todos`;

function todoKey(email) {
  return `${TODO_KEY_PREFIX}:${String(email).toLowerCase()}`;
}

async function readTodos(email) {
  const raw = await getRedisClient().get(todoKey(email));
  return raw ? JSON.parse(raw) : [];
}

async function writeTodos(email, todos) {
  await getRedisClient().set(todoKey(email), JSON.stringify(todos));
}

function nextId(todos) {
  return todos.length === 0 ? 1 : Math.max(...todos.map((task) => task.id)) + 1;
}

async function addTask(email, title) {
  const todos = await readTodos(email);
  const newTask = { id: nextId(todos), title: title.trim() };
  todos.push(newTask);
  await writeTodos(email, todos);
  return newTask;
}

async function updateTask(email, id, newTitle) {
  const todos = await readTodos(email);
  const task = todos.find((todo) => todo.id === Number(id));

  if (!task) return null;

  task.title = newTitle.trim();
  await writeTodos(email, todos);
  return task;
}

async function deleteTask(email, id) {
  const todos = await readTodos(email);
  const index = todos.findIndex((todo) => todo.id === Number(id));

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
