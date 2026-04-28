/**
 * todo.js - Todo CRUD operations + Express routes
 * Stores tasks in Redis as JSON under a single key
 */

const express = require('express');
const { getRedisClient } = require('../lib/redis');

const router = express.Router();
const TODO_KEY = `${process.env.REDIS_KEY_PREFIX || 'voice-agent'}:todos`;

async function readTodos() {
  const raw = await getRedisClient().get(TODO_KEY);
  return raw ? JSON.parse(raw) : [];
}

async function writeTodos(todos) {
  await getRedisClient().set(TODO_KEY, JSON.stringify(todos));
}

function nextId(todos) {
  return todos.length === 0 ? 1 : Math.max(...todos.map((task) => task.id)) + 1;
}

async function addTask(title) {
  const todos = await readTodos();
  const newTask = { id: nextId(todos), title: title.trim() };
  todos.push(newTask);
  await writeTodos(todos);
  return newTask;
}

async function updateTask(id, newTitle) {
  const todos = await readTodos();
  const task = todos.find((todo) => todo.id === Number(id));

  if (!task) return null;

  task.title = newTitle.trim();
  await writeTodos(todos);
  return task;
}

async function deleteTask(id) {
  const todos = await readTodos();
  const index = todos.findIndex((todo) => todo.id === Number(id));

  if (index === -1) return null;

  const [removed] = todos.splice(index, 1);
  await writeTodos(todos);
  return removed;
}

async function listTasks() {
  return readTodos();
}

router.post('/add', async (req, res, next) => {
  try {
    const { title } = req.body;
    if (typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ error: 'title is required' });
    }

    const task = await addTask(title);
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

    const task = await updateTask(id, newTitle);
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

    const task = await deleteTask(id);
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
    const tasks = await listTasks();
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
