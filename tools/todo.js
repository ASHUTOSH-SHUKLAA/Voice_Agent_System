/**
 * todo.js - Todo CRUD operations + Express routes
 * Stores tasks in todos.json as: [{ id, title }]
 */

const express = require('express');
const fs = require('fs');
const path = require('path');

const router = express.Router();
const TODO_FILE = path.join(__dirname, '..', 'data', 'todos.json');

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Read todos from file; returns [] if file doesn't exist */
function readTodos() {
  if (!fs.existsSync(TODO_FILE)) return [];
  const raw = fs.readFileSync(TODO_FILE, 'utf-8');
  return JSON.parse(raw || '[]');
}

/** Write todos array back to file */
function writeTodos(todos) {
  fs.mkdirSync(path.dirname(TODO_FILE), { recursive: true });
  fs.writeFileSync(TODO_FILE, JSON.stringify(todos, null, 2));
}

/** Generate next unique numeric ID */
function nextId(todos) {
  return todos.length === 0 ? 1 : Math.max(...todos.map(t => t.id)) + 1;
}

// ─── Core Functions (called by agent) ────────────────────────────────────────

function addTask(title) {
  const todos = readTodos();
  const newTask = { id: nextId(todos), title: title.trim() };
  todos.push(newTask);
  writeTodos(todos);
  return newTask;
}

function updateTask(id, newTitle) {
  const todos = readTodos();
  const task = todos.find(t => t.id === Number(id));
  if (!task) return null;
  task.title = newTitle.trim();
  writeTodos(todos);
  return task;
}

function deleteTask(id) {
  const todos = readTodos();
  const index = todos.findIndex(t => t.id === Number(id));
  if (index === -1) return null;
  const [removed] = todos.splice(index, 1);
  writeTodos(todos);
  return removed;
}

function listTasks() {
  return readTodos();
}

// ─── Express Routes ───────────────────────────────────────────────────────────

// POST /tool/add  → { title }
router.post('/add', (req, res) => {
  const { title } = req.body;
  if (!title) return res.status(400).json({ error: 'title is required' });
  const task = addTask(title);
  res.json({ success: true, task });
});

// POST /tool/update  → { id, newTitle }
router.post('/update', (req, res) => {
  const { id, newTitle } = req.body;
  if (!id || !newTitle) return res.status(400).json({ error: 'id and newTitle are required' });
  const task = updateTask(id, newTitle);
  if (!task) return res.status(404).json({ error: `Task with id ${id} not found` });
  res.json({ success: true, task });
});

// POST /tool/delete  → { id }
router.post('/delete', (req, res) => {
  const { id } = req.body;
  if (!id) return res.status(400).json({ error: 'id is required' });
  const task = deleteTask(id);
  if (!task) return res.status(404).json({ error: `Task with id ${id} not found` });
  res.json({ success: true, removed: task });
});

// GET /tool/list
router.get('/list', (req, res) => {
  const tasks = listTasks();
  res.json({ success: true, tasks });
});

module.exports = router;
module.exports.addTask = addTask;
module.exports.updateTask = updateTask;
module.exports.deleteTask = deleteTask;
module.exports.listTasks = listTasks;
