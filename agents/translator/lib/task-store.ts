// lib/task-store.ts
export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed'

export interface Task {
  id: string
  status: TaskStatus
  createdAt: number
  result?: Record<string, unknown>
  error?: string
}

const TTL_MS = 60 * 60 * 1000
const store = new Map<string, Task>()

export function createTask(id: string): Task {
  const task: Task = { id, status: 'pending', createdAt: Date.now() }
  store.set(id, task)
  return task
}

export function getTask(id: string): Task | undefined {
  const task = store.get(id)
  if (!task) return undefined
  if (Date.now() - task.createdAt > TTL_MS) {
    store.delete(id)
    return undefined
  }
  return task
}

export function updateTask(id: string, patch: Partial<Task>): void {
  const task = store.get(id)
  if (task) store.set(id, { ...task, ...patch })
}
